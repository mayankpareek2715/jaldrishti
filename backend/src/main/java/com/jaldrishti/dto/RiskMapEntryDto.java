package com.jaldrishti.dto;

public record RiskMapEntryDto(
        String localityId,
        String name,
        Double centroidLat,
        Double centroidLon,
        String polygonGeojson,
        String riskTier,
        Double riskProbability,
        String horizon,
        Boolean simulated,
        Double latestRainfallMm
) {}
