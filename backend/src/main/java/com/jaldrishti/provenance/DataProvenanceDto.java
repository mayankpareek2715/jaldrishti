package com.jaldrishti.provenance;

import java.time.Instant;

/**
 * Standardized data provenance carrier for persisted or API-returned observations.
 */
public record DataProvenanceDto(
        String fieldName,
        Object value,
        String unit,
        String temporalResolution,
        DataSourceType sourceType,
        String sourceName,
        String dataset,
        String datasetVersion,
        Instant observedAt,
        Instant calculatedAt,
        Instant fetchedAt,
        Instant validFrom,
        Instant validUntil,
        boolean isStale,
        String confidence,
        String verificationStatus,
        String description,
        String provenanceId
) {
    public static DataProvenanceDto of(
            String fieldName,
            Object value,
            String unit,
            String temporalResolution,
            DataSourceType sourceType,
            String dataset,
            String datasetVersion,
            Instant observedAt,
            boolean isStale,
            String description
    ) {
        return new DataProvenanceDto(
                fieldName,
                value,
                unit,
                temporalResolution,
                sourceType,
                sourceType.getDisplayName(),
                dataset,
                datasetVersion,
                observedAt,
                Instant.now(),
                Instant.now(),
                observedAt,
                null,
                isStale,
                "HIGH",
                "VERIFIED",
                description,
                sourceType.name().toLowerCase() + "-" + System.currentTimeMillis()
        );
    }
}
