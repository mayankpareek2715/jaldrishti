package com.jaldrishti.imd.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified weather summary bundle consumed by JalDrishti frontend and telemetry feeds.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImdWeatherSummaryDto {
    private String source; // "IMD" or "MOCK"
    private String city;
    private String district;
    private String fetchedAt;
    private String lastUpdatedText;
    private boolean isStale;

    private ImdCurrentWeatherDto currentWeather;
    private ImdNowcastDto nowcast;
    private ImdRainfallDto rainfall;
    private ImdWarningDto warnings;
}
