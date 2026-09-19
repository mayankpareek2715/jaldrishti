package com.jaldrishti.dto;

import java.util.List;

public record RouteCheckResponseDto(
        List<RouteCheckRequestDto.PointDto> routePoints,
        List<FlaggedSegmentDto> flaggedSegments,
        String overallRouteRisk,
        String summary
) {
    public record FlaggedSegmentDto(String localityId, String localityName, String riskTier, Double riskProbability) {}
}
