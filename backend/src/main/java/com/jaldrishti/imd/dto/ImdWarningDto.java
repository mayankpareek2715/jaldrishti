package com.jaldrishti.imd.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Normalized Multi-day District Warning bulletin from IMD /api/v1/districtwarning.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImdWarningDto {
    private String source; // "IMD" or "MOCK"
    private String city;
    private String district;
    private String state;
    private String issueDate;
    private String fetchedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DayWarning {
        private int dayNumber;
        private String date;
        private String warningColor; // Hex or Name
        private String warningText;
        private String rainfallDistribution;
    }

    private List<DayWarning> dailyWarnings;

    private Long cacheAgeSeconds;
    private Boolean isStale;
    private String status;
}
