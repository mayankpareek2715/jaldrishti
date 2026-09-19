package com.jaldrishti.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record CreateCitizenReportRequestDto(
    @NotBlank String localityId,
    String locationDescription,
    @NotNull @PositiveOrZero Double waterLevelFeet,
    String description,
    String photoUrl
) {}
