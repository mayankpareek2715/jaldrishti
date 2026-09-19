package com.jaldrishti.dto;

import jakarta.validation.constraints.NotNull;

public record RouteCheckRequestDto(
        @NotNull PointDto start,
        @NotNull PointDto end
) {
    public record PointDto(Double lat, Double lon) {}
}
