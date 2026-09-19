package com.jaldrishti.imd.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "jaldrishti.imd")
public class ImdProperties {

    /** Base URL for official IMD APIs */
    private String baseUrl = "https://api.imd.gov.in";

    /** X-API-KEY generated from IMD Portal (bound to server static public IP) */
    private String apiKey = "";

    /** JWT Bearer token generated from IMD Portal account */
    private String jwtToken = "";

    /** Active weather provider: "imd" for production official API, "mock" for offline local dev */
    private String provider = "imd";

    /** Connection timeout in milliseconds */
    private int connectTimeoutMs = 5000;

    /** Read timeout in milliseconds */
    private int readTimeoutMs = 10000;

    /** Maximum retries for transient HTTP errors */
    private int maxRetries = 2;

    /** TTL for Current Weather cache (default 15 minutes) */
    private long cacheTtlCurrentWeatherSeconds = 900;

    /** TTL for Nowcast cache (default 15 minutes) */
    private long cacheTtlNowcastSeconds = 900;

    /** TTL for District Rainfall cache (default 1 hour) */
    private long cacheTtlRainfallSeconds = 3600;

    /** TTL for District Warnings cache (default 30 minutes) */
    private long cacheTtlWarningsSeconds = 1800;

    /** TTL for AWS/ARG Station observations cache (default 15 minutes) */
    private long cacheTtlAwsSeconds = 900;

    public boolean isImdConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty() &&
               jwtToken != null && !jwtToken.trim().isEmpty();
    }
}
