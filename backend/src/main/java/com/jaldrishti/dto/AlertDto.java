package com.jaldrishti.dto;

import java.time.LocalDateTime;

public record AlertDto(
        Long id,
        String localityId,
        String localityName,
        String severity,
        String message,
        Double riskProbability,
        String status,
        Boolean isSimulated,
        LocalDateTime createdAt,
        LocalDateTime acknowledgedAt
) {}
