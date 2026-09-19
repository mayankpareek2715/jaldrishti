package com.jaldrishti.imd.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImdHealthStatusDto {
    private String provider; // "IMD" or "MOCK"
    private String status; // "UP", "DEGRADED", "DOWN"
    private boolean configured;
    private String lastSuccessfulFetch;
    private String lastError;
    private boolean cacheAvailable;
    private long cachedEntriesCount;
}
