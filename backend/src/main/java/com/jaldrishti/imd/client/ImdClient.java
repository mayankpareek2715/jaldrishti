package com.jaldrishti.imd.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.jaldrishti.imd.config.ImdProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ImdClient {

    private final RestTemplate restTemplate;
    private final ImdProperties properties;

    /**
     * Executes an authenticated GET request against official IMD endpoint with controlled retries.
     */
    public Optional<JsonNode> executeGet(String pathAndQuery) {
        String url = properties.getBaseUrl() + pathAndQuery;
        HttpHeaders headers = createHeaders();
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        int attempts = 0;
        int maxAttempts = Math.max(1, properties.getMaxRetries() + 1);
        long backoffMs = 500;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                log.debug("Calling official IMD API: {} (Attempt {}/{})", pathAndQuery, attempts, maxAttempts);
                long start = System.currentTimeMillis();
                ResponseEntity<JsonNode> response = restTemplate.exchange(
                        url,
                        HttpMethod.GET,
                        requestEntity,
                        JsonNode.class
                );
                long elapsed = System.currentTimeMillis() - start;
                log.info("IMD API responded in {} ms: {} [HTTP {}]", elapsed, pathAndQuery, response.getStatusCode());
                return Optional.ofNullable(response.getBody());

            } catch (HttpStatusCodeException ex) {
                int status = ex.getStatusCode().value();
                if (status == 401 || status == 403) {
                    log.error("IMD API Authentication failure (HTTP {}): Check X-API-KEY and JWT Token IP whitelisting.", status);
                    return Optional.empty(); // No retry on auth failure
                } else if (status == 429) {
                    log.warn("IMD API Rate limit encountered (HTTP 429). Throttling backoff.");
                } else {
                    log.warn("IMD API HTTP error (HTTP {}): {}", status, ex.getStatusText());
                }
            } catch (ResourceAccessException ex) {
                log.warn("IMD API connectivity/timeout failure on {}: {}", pathAndQuery, ex.getMessage());
            } catch (RestClientException ex) {
                log.error("IMD API client exception on {}: {}", pathAndQuery, ex.getMessage());
            }

            if (attempts < maxAttempts) {
                try {
                    Thread.sleep(backoffMs);
                    backoffMs *= 2;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        return Optional.empty();
    }

    /**
     * Fetch current weather observation by WMO / IMD station ID (/api/v1/current_wx?id={stationId})
     */
    public Optional<JsonNode> fetchCurrentWeather(String stationId) {
        String endpoint = (stationId != null && !stationId.trim().isEmpty())
                ? "/api/v1/current_wx?id=" + stationId
                : "/api/v1/current_wx";
        return executeGet(endpoint);
    }

    /**
     * Fetch AWS / ARG station telemetry (/api/v1/aws_data)
     */
    public Optional<JsonNode> fetchAwsData() {
        return executeGet("/api/v1/aws_data");
    }

    /**
     * Fetch 3-hour district nowcast (/api/v1/districtnowcast)
     */
    public Optional<JsonNode> fetchDistrictNowcast() {
        return executeGet("/api/v1/districtnowcast");
    }

    /**
     * Fetch cumulative district rainfall statistics (/api/v1/districtrainfall)
     */
    public Optional<JsonNode> fetchDistrictRainfall() {
        return executeGet("/api/v1/districtrainfall");
    }

    /**
     * Fetch district weather warning bulletin (/api/v1/districtwarning)
     */
    public Optional<JsonNode> fetchDistrictWarning() {
        return executeGet("/api/v1/districtwarning");
    }

    /**
     * Fetch city forecast (/api/v1/cityforecast)
     */
    public Optional<JsonNode> fetchCityForecast() {
        return executeGet("/api/v1/cityforecast");
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("User-Agent", "JalDrishti-UrbanFloodIntelligence/1.0");

        if (properties.getApiKey() != null && !properties.getApiKey().trim().isEmpty()) {
            headers.set("X-API-KEY", properties.getApiKey().trim());
        }
        if (properties.getJwtToken() != null && !properties.getJwtToken().trim().isEmpty()) {
            headers.set("Authorization", "Bearer " + properties.getJwtToken().trim());
        }
        return headers;
    }
}
