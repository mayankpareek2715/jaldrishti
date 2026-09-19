package com.jaldrishti.imd.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Normalized Nowcast warning from IMD /api/v1/districtnowcast.
 * Captures 3-hour precipitation intensity and convective storm warning bands.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImdNowcastDto {
    private String source; // "IMD" or "MOCK"
    private String city;
    private String district;
    private String issuedAt;
    private String validUntil;
    private String fetchedAt;

    /**
     * IMD Nowcast rain intensity category: "Light rain", "Moderate rain", "Heavy rain", "Very heavy rain"
     */
    private String rainIntensityCategory;

    /**
     * Warning severity color code: "GREEN", "YELLOW", "ORANGE", "RED"
     */
    private String warningColor;
    private String warningSeverity;
    private String warningMessage;

    private Long cacheAgeSeconds;
    private Boolean isStale;
    private String status;
}
