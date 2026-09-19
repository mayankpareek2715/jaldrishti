package com.jaldrishti.dto;

import java.time.Instant;
import java.util.List;

public record FloodRouteResponseDto(
    List<RouteAlternative> routes,
    Instant floodDataTimestamp,
    boolean floodDataAvailable
) {
    public record RouteAlternative(
        int index,
        boolean recommended,
        double distanceKm,
        double durationMin,
        String floodImpact,      // LOW, MODERATE, HIGH, SEVERE
        double floodScore,
        double affectedDistanceKm,
        int severeSegments,
        int blockedSegments,
        String reason,
        List<PointDto> routePoints,
        List<FloodSegment> segments,
        List<RouteWarning> warnings,
        List<StepDto> steps
    ) {}

    public record StepDto(
        String instruction,
        String streetName,
        double distanceMeters,
        double durationSeconds,
        String maneuverType,
        String maneuverModifier
    ) {}

    public record PointDto(double lat, double lon) {}

    public record FloodSegment(
        int startIndex,
        int endIndex,
        String localityId,
        String localityName,
        String riskTier,
        double riskProbability,
        double distanceKm,
        double centerLat,
        double centerLon
    ) {}

    public record RouteWarning(
        String type,        // FLOOD_AHEAD, SEVERE_FLOOD, BLOCKED_ROAD
        double distanceKm,
        String severity,
        String localityName
    ) {}
}
