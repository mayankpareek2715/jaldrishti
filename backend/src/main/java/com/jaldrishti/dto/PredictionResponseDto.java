package com.jaldrishti.dto;

import java.util.List;

public record PredictionResponseDto(
        String localityId,
        String localityName,
        String horizon,
        Double riskProbability,
        String riskTier,
        List<FactorDto> topFactors,
        String modelVersion,
        Boolean simulated,
        String scenarioName,
        Double simulatedRainfallMm,
        String predictionId,
        java.time.Instant calculatedAt,
        String source
) {
    public record FactorDto(String feature, Double contribution, String displayText) {}

    public PredictionResponseDto(
            String localityId,
            String localityName,
            String horizon,
            Double riskProbability,
            String riskTier,
            List<FactorDto> topFactors,
            String modelVersion,
            Boolean simulated,
            String scenarioName,
            Double simulatedRainfallMm
    ) {
        this(
                localityId,
                localityName,
                horizon,
                riskProbability,
                riskTier,
                topFactors,
                modelVersion,
                simulated,
                scenarioName,
                simulatedRainfallMm,
                "pred-" + (localityId != null ? localityId : "loc") + "-" + (horizon != null ? horizon.replace("+", "") : "1h") + "-" + (simulated != null && simulated ? "sim" : "live"),
                java.time.Instant.now(),
                Boolean.TRUE.equals(simulated) ? "JALDRISHTI_SIMULATION" : "JALDRISHTI_ML"
        );
    }
}
