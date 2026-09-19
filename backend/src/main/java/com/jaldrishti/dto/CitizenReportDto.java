package com.jaldrishti.dto;

import java.time.LocalDateTime;

public record CitizenReportDto(
    Long id,
    String localityId,
    String localityName,
    String city,
    String locationDescription,
    Double waterLevelFeet,
    String description,
    String photoUrl,
    String status,
    LocalDateTime createdAt
) {}
