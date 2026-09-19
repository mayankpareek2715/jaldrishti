package com.jaldrishti.imd.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Normalized Current Weather representation from IMD /api/v1/current_wx or /api/v1/aws_data.
 * All units are strictly maintained: temperature in °C, wind in km/h, rainfall in 24h total mm.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImdCurrentWeatherDto {
    private String source; // "IMD" or "MOCK"
    private String city;
    private String district;
    private String stationId;
    private String stationName;
    private Double latitude;
    private Double longitude;

    private String observedAt; // e.g. "2026-09-18 20:00:00"
    private String fetchedAt;

    private Double temperatureC;
    private Double humidityPercent;
    private Double windSpeedKmph;
    private Double windDirectionDeg;
    private Double pressureHpa;
    private String weatherCondition;
    private Integer weatherCode;
    private Double feelsLikeC;

    /**
     * Official IMD 24-hour cumulative rainfall measurement in mm.
     * Note: This is explicitly a 24-hour total and MUST NOT be represented as mm/hr.
     */
    private Double rainfall24hMm;

    // Cache and Freshness metadata
    private Long cacheAgeSeconds;
    private Boolean isStale;
    private String status; // "LIVE", "STALE", "UNAVAILABLE"
}
