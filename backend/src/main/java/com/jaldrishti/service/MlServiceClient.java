package com.jaldrishti.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaldrishti.dto.PredictionResponseDto;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.repository.LocalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Talks to the Python FastAPI ML microservice. Spring Boot never touches the model file
 * directly -- always through this HTTP client, per the master plan's architecture (Section 12).
 * If the ML service is unreachable, falls back to an honest rule-based scorer matching
 * ml-service/main.py so the rest of the backend (and the demo) keeps working dynamically.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MlServiceClient {

    private final RestTemplate restTemplate;
    private final LocalityRepository localityRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${jaldrishti.ml-service.base-url}")
    private String baseUrl;

    public PredictionResponseDto predict(String localityId, String horizon,
                                          double rain1hr, double rain3hr, double rain3day, double rain7day) {
        Map<String, Object> body = new HashMap<>();
        body.put("locality_id", localityId);
        body.put("horizon", normalizeHorizon(horizon));
        body.put("rain_1hr_mm", rain1hr);
        body.put("rain_3hr_mm", rain3hr);
        body.put("rain_3day_cum_mm", rain3day);
        body.put("rain_7day_cum_mm", rain7day);
        return callAndParse("/predict", body, false);
    }

    public PredictionResponseDto simulate(String localityId, String scenarioName, double rainfallMm, String horizon) {
        Map<String, Object> body = new HashMap<>();
        body.put("locality_id", localityId);
        body.put("scenario_name", scenarioName);
        body.put("simulated_rainfall_mm", rainfallMm);
        body.put("rain_1hr_mm", rainfallMm);
        body.put("horizon", normalizeHorizon(horizon));
        return callAndParse("/simulate", body, true);
    }

    private String normalizeHorizon(String h) {
        if (h == null) return "+1h";
        h = h.trim();
        if (!h.startsWith("+") && h.endsWith("h")) return "+" + h;
        return h;
    }

    private String getEffectiveBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank()) return "http://localhost:8000";
        String s = baseUrl.trim();
        if (!s.startsWith("http://") && !s.startsWith("https://")) {
            if (!s.contains(".")) {
                s = s + ".onrender.com";
            }
            s = "https://" + s;
        }
        if (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    private PredictionResponseDto callAndParse(String path, Map<String, Object> body, boolean simulated) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            JsonNode response = restTemplate.postForObject(getEffectiveBaseUrl() + path, entity, JsonNode.class);
            return parse(response);
        } catch (RestClientException e) {
            log.debug("ML service unreachable ({}). Using rule-based fallback.", e.getMessage());
            return localFallback(body, simulated);
        }
    }

    private PredictionResponseDto parse(JsonNode n) {
        List<PredictionResponseDto.FactorDto> factors = new ArrayList<>();
        if (n.has("top_factors")) {
            for (JsonNode f : n.get("top_factors")) {
                factors.add(new PredictionResponseDto.FactorDto(
                        f.path("feature").asText(),
                        f.path("contribution").asDouble(),
                        f.path("display_text").asText()));
            }
        }
        return new PredictionResponseDto(
                n.path("locality_id").asText(),
                n.path("locality_name").asText(),
                n.path("horizon").asText(),
                n.path("risk_probability").asDouble(),
                n.path("risk_tier").asText(),
                factors,
                n.path("model_version").asText(),
                n.path("simulated").asBoolean(false),
                n.has("scenario_name") ? n.get("scenario_name").asText() : null,
                n.has("simulated_rainfall_mm") ? n.get("simulated_rainfall_mm").asDouble() : null
        );
    }

    /** Transparent, rule-based fallback matching ml-service/main.py when Python ML microservice is offline */
    private PredictionResponseDto localFallback(Map<String, Object> body, boolean simulated) {
        String localityId = (String) body.get("locality_id");
        String horizon = (String) body.getOrDefault("horizon", "+1h");
        Double rain1hr = body.containsKey("simulated_rainfall_mm")
                ? (Double) body.get("simulated_rainfall_mm")
                : (Double) body.getOrDefault("rain_1hr_mm", 10.0);
        if (rain1hr == null) rain1hr = 10.0;

        Locality loc = localityRepository.findById(localityId).orElse(null);
        String localityName = loc != null ? loc.getName() : localityId;
        double elevation = loc != null && loc.getElevationM() != null ? loc.getElevationM() : 870.0;
        double slope = loc != null && loc.getSlopeDeg() != null ? loc.getSlopeDeg() : 1.5;
        double drainage = loc != null && loc.getDrainageDensity() != null ? loc.getDrainageDensity() : 3.0;
        double impervious = loc != null && loc.getImperviousPct() != null ? loc.getImperviousPct() : 70.0;
        double floodFreq = loc != null && loc.getHistoricalFloodFreq() != null ? loc.getHistoricalFloodFreq() : 3.0;
        boolean bbmpFloodProne = loc != null && Boolean.TRUE.equals(loc.getIsBbmpFloodProne());
        boolean isBhubaneswar = loc != null && "Bhubaneswar".equalsIgnoreCase(loc.getCity());

        double rainScore = Math.min(rain1hr / 60.0, 1.0);
        double elevBaseline = isBhubaneswar ? 35.0 : 850.0;
        double elevRange = isBhubaneswar ? 50.0 : 80.0;
        double elevScore = 1.0 - Math.min(Math.max(elevation - elevBaseline, 0.0) / elevRange, 1.0);
        double slopeScore = 1.0 - Math.min(slope / 3.0, 1.0);
        double drainageScore = 1.0 - Math.min(drainage / 6.0, 1.0);
        double imperviousScore = Math.min(impervious / 100.0, 1.0);
        double freqScore = Math.min(floodFreq / 8.0, 1.0);

        double terrainScore = (elevScore * 0.3)
                + (slopeScore * 0.2)
                + (drainageScore * 0.2)
                + (imperviousScore * 0.15)
                + (freqScore * 0.15);

        if (bbmpFloodProne) {
            terrainScore = Math.min(terrainScore * 1.25, 1.0);
        }

        double probability = Math.min(0.95, 0.6 * rainScore + 0.4 * terrainScore * rainScore + 0.05 * terrainScore);

        if (horizon.contains("2h")) probability = Math.min(0.96, probability * 1.05);
        else if (horizon.contains("3h")) probability = Math.min(0.97, probability * 1.10);
        else if (horizon.contains("4h")) probability = Math.min(0.98, probability * 1.12);
        else if (horizon.contains("5h")) probability = Math.min(0.98, probability * 1.13);
        else if (horizon.contains("6h")) probability = Math.min(0.99, probability * 1.14);

        probability = Math.round(probability * 100.0) / 100.0;

        String tier = com.jaldrishti.provenance.RiskTierPolicy.classify(probability);

        List<PredictionResponseDto.FactorDto> factors = new ArrayList<>();
        factors.add(new PredictionResponseDto.FactorDto("rain_1hr_mm", Math.round(rainScore * 100.0) / 100.0,
                String.format("Rainfall intensity: %.1f mm in the observation period", rain1hr)));
        factors.add(new PredictionResponseDto.FactorDto("elevation_m", Math.round(elevScore * 100.0) / 100.0,
                String.format("Terrain elevation: %.0f m (%s natural runoff)", elevation, slope < 1.0 ? "poor" : "moderate")));
        factors.add(new PredictionResponseDto.FactorDto("drainage_density", Math.round(drainageScore * 100.0) / 100.0,
                String.format("Drainage network density: %.1f km/km² (impervious surface: %.0f%%)", drainage, impervious)));
        if (floodFreq > 0) {
            factors.add(new PredictionResponseDto.FactorDto("historical_flood_freq", Math.round(freqScore * 100.0) / 100.0,
                    String.format("Historical vulnerability: %d recorded flood incidents in past seasons", (int) floodFreq)));
        }

        return new PredictionResponseDto(
                localityId,
                localityName,
                horizon,
                probability,
                tier,
                factors,
                "rule-based-fallback-v1.0",
                simulated,
                (String) body.get("scenario_name"),
                (Double) body.get("simulated_rainfall_mm")
        );
    }
}
