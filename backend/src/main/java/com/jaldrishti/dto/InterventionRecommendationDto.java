package com.jaldrishti.dto;

import java.util.List;

public record InterventionRecommendationDto(
    Integer priority,
    String localityId,
    String localityName,
    String riskTier,
    Double riskProbability,
    List<String> recommendedActions
) {}
