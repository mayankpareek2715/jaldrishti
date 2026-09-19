package com.jaldrishti.dto;

import jakarta.validation.constraints.NotNull;

public record FloodRouteRequestDto(
    @NotNull PointDto start,
    @NotNull PointDto end,
    String horizon  // optional, defaults to +1h
) {
    public record PointDto(Double lat, Double lon) {}
}
