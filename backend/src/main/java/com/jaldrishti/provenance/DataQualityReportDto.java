package com.jaldrishti.provenance;

import java.time.Instant;
import java.util.List;

public record DataQualityReportDto(
        String city,
        Instant generatedAt,
        String overallQualityStatus,
        int totalLocalitiesMonitored,
        int verifiedHistoricalEventsCount,
        int citizenReportsCount,
        List<SourceQualityItemDto> sources
) {
    public record SourceQualityItemDto(
            String sourceName,
            DataSourceType sourceType,
            String dataset,
            String version,
            String status,
            boolean isStale,
            Instant lastObservedAt,
            Instant lastFetchedAt,
            String updateFrequency,
            String validationStatus,
            String details
    ) {}
}
