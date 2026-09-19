package com.jaldrishti.dto;

import java.time.LocalDate;

public record HistoricalEventDto(
        LocalDate eventDate,
        Double rainfallMm,
        String description,
        String source
) {}
