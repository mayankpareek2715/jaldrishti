package com.jaldrishti.imd.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Normalized District Rainfall statistics from IMD /api/v1/districtrainfall.
 * Preserves daily, weekly, monthly, and cumulative totals with official departure categories.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImdRainfallDto {
    private String source; // "IMD" or "MOCK"
    private String city;
    private String district;
    private String observedDate;
    private String fetchedAt;

    // Daily statistics
    private Double dailyActualMm;
    private Double dailyNormalMm;
    private String dailyDeparturePercent;
    private String dailyCategory; // e.g. "NR" (No Rain), "N" (Normal), "E" (Excess)

    // Weekly statistics
    private String weekDateRange;
    private Double weeklyActualMm;
    private Double weeklyNormalMm;
    private String weeklyDeparturePercent;
    private String weeklyCategory;

    // Monthly / Cumulative statistics
    private String cumulativeDateRange;
    private Double cumulativeActualMm;
    private Double cumulativeNormalMm;
    private String cumulativeDeparturePercent;

    private Long cacheAgeSeconds;
    private Boolean isStale;
    private String status;
}
