package com.jaldrishti.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record SimulateRequestDto(
        @NotBlank String localityId,
        String scenarioName,
        @NotNull @PositiveOrZero Double simulatedRainfallMm,
        String horizon
) {}
