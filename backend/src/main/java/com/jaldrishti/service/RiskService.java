package com.jaldrishti.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaldrishti.dto.*;
import com.jaldrishti.entity.HistoricalEvent;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.entity.RainfallReading;
import com.jaldrishti.repository.HistoricalEventRepository;
import com.jaldrishti.repository.LocalityRepository;
import com.jaldrishti.repository.RainfallReadingRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RiskService {

    private final LocalityRepository localityRepository;
    private final RainfallReadingRepository rainfallReadingRepository;
    private final HistoricalEventRepository historicalEventRepository;
    private final MlServiceClient mlServiceClient;
    private final AlertService alertService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<RiskMapEntryDto> getRiskMap(String horizon) {
        final String normHorizon = normalizeHorizon(horizon);
        return localityRepository.findAll().stream()
                .map(loc -> toRiskMapEntry(loc, normHorizon))
                .toList();
    }

    private String normalizeHorizon(String h) {
        if (h == null || h.isBlank()) return "+1h";
        h = h.trim();
        if (!h.startsWith("+") && h.endsWith("h")) return "+" + h;
        return h;
    }

    private RiskMapEntryDto toRiskMapEntry(Locality loc, String horizon) {
        RainfallReading latest = rainfallReadingRepository
                .findFirstByLocalityIdOrderByReadingTimeDesc(loc.getId())
                .orElse(demoRainfall(loc));

        PredictionResponseDto pred = mlServiceClient.predict(
                loc.getId(), horizon,
                latest.getRain1hrMm(), latest.getRain3hrMm(),
                latest.getRain3dayCumMm(), latest.getRain7dayCumMm());

        alertService.evaluateAndMaybeCreateAlert(loc, pred, false);

        return new RiskMapEntryDto(
                loc.getId(), loc.getName(), loc.getCentroidLat(), loc.getCentroidLon(),
                loc.getPolygonGeojson(), pred.riskTier(), pred.riskProbability(), horizon, false,
                latest.getRain1hrMm());
    }

    public LocalityDetailDto getLocalityDetail(String id) {
        Locality loc = localityRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Locality not found: " + id));

        RainfallReading latest = rainfallReadingRepository
                .findFirstByLocalityIdOrderByReadingTimeDesc(id).orElse(demoRainfall(loc));

        PredictionResponseDto currentRisk = mlServiceClient.predict(
                id, "+1h", latest.getRain1hrMm(), latest.getRain3hrMm(),
                latest.getRain3dayCumMm(), latest.getRain7dayCumMm());

        List<PredictionResponseDto> timeline = List.of("+1h", "+2h", "+3h", "+4h", "+5h", "+6h").stream()
                .map(h -> mlServiceClient.predict(id, h,
                        latest.getRain1hrMm(), latest.getRain3hrMm(),
                        latest.getRain3dayCumMm(), latest.getRain7dayCumMm()))
                .toList();

        List<HistoricalEventDto> history = historicalEventRepository
                .findByLocalityIdOrderByEventDateDesc(id).stream()
                .map(e -> new HistoricalEventDto(e.getEventDate(), e.getRainfallMm(), e.getDescription(), e.getSource()))
                .toList();

        return new LocalityDetailDto(
                loc.getId(), loc.getName(), loc.getWard(), loc.getElevationM(), loc.getSlopeDeg(),
                loc.getDrainageDensity(), loc.getImperviousPct(), loc.getHistoricalFloodFreq(),
                loc.getIsBbmpFloodProne(), currentRisk, timeline, history);
    }

    public PredictionResponseDto simulate(SimulateRequestDto req) {
        Locality loc = localityRepository.findById(req.localityId())
                .orElseThrow(() -> new EntityNotFoundException("Locality not found: " + req.localityId()));
        String scenario = req.scenarioName() != null ? req.scenarioName() : "Custom";
        String horizon = req.horizon() != null ? req.horizon() : "+1h";
        PredictionResponseDto pred = mlServiceClient.simulate(loc.getId(), scenario, req.simulatedRainfallMm(), horizon);
        alertService.evaluateAndMaybeCreateAlert(loc, pred, true);
        return pred;
    }

    public List<InterventionRecommendationDto> getInterventionRecommendations(String city) {
        List<Locality> localities = (city != null && !city.isBlank())
                ? localityRepository.findAll().stream().filter(l -> city.equalsIgnoreCase(l.getCity())).toList()
                : localityRepository.findAll();

        List<RiskMapEntryDto> riskEntries = localities.stream()
                .map(loc -> toRiskMapEntry(loc, "+1h"))
                .sorted((a, b) -> Double.compare(b.riskProbability(), a.riskProbability()))
                .toList();

        List<InterventionRecommendationDto> recommendations = new ArrayList<>();
        int rank = 1;

        for (RiskMapEntryDto entry : riskEntries) {
            Locality loc = localityRepository.findById(entry.localityId()).orElse(null);
            if (loc == null) continue;

            String tier = entry.riskTier();
            double prob = entry.riskProbability();

            if ("LOW".equals(tier) && loc.getIsBbmpFloodProne() && loc.getHistoricalFloodFreq() >= 5) {
                tier = "MODERATE";
                prob = Math.max(prob, 0.42);
            }

            if ("SEVERE".equals(tier) || "HIGH".equals(tier) || "MODERATE".equals(tier)) {
                List<String> actions = new ArrayList<>();
                if ("SEVERE".equals(tier)) {
                    actions.add("Deploy high-capacity mobile dewatering pumps to low-lying storm drain outlets");
                    actions.add("Erect emergency road-closure barricades & divert commute traffic");
                    actions.add("Dispatch quick-response disaster management team with inflatable rescue craft");
                    actions.add("Issue urgent SMS evacuation & public safety broadcast advisory");
                } else if ("HIGH".equals(tier)) {
                    actions.add("Inspect primary arterial stormwater drains for silt/garbage blockages");
                    actions.add("Position mobile dewatering pumps at vulnerable underpasses");
                    actions.add("Dispatch ward monitoring team to verify water level telemetry");
                    actions.add("Issue advisory alert to traffic control and local emergency services");
                } else {
                    actions.add("Monitor water level telemetry & storm drain throughput every 15 minutes");
                    actions.add("Alert local ward maintenance engineers to remain on standby");
                }

                recommendations.add(new InterventionRecommendationDto(
                        rank++, entry.localityId(), entry.name(), tier, prob, actions
                ));
            }
        }
        return recommendations;
    }

    private RainfallReading demoRainfall(Locality loc) {
        RainfallReading r = new RainfallReading();
        double baseRain = 4.0;
        if (loc != null) {
            if (loc.getIsBbmpFloodProne() && loc.getHistoricalFloodFreq() >= 6) {
                baseRain = 45.0;
            } else if (loc.getIsBbmpFloodProne() && loc.getHistoricalFloodFreq() >= 4) {
                baseRain = 28.0;
            } else if (loc.getHistoricalFloodFreq() >= 2) {
                baseRain = 16.0;
            }
        }
        r.setRain15minMm(baseRain / 4.0);
        r.setRain1hrMm(baseRain);
        r.setRain3hrMm(baseRain * 2.1);
        r.setRain3dayCumMm(baseRain * 4.2);
        r.setRain7dayCumMm(baseRain * 7.5);
        r.setForecast13hrMm(baseRain * 0.8);
        r.setSource("demo");
        return r;
    }
}
