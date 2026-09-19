package com.jaldrishti.dto;

import java.util.List;

public record LocalityDetailDto(
        String id,
        String name,
        String ward,
        Double elevationM,
        Double slopeDeg,
        Double drainageDensity,
        Double imperviousPct,
        Integer historicalFloodFreq,
        Boolean isBbmpFloodProne,
        PredictionResponseDto currentRisk,
        List<PredictionResponseDto> timeline,
        List<HistoricalEventDto> history
) {}
