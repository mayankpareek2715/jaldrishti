package com.jaldrishti.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "historical_events")
@Getter
@Setter
public class HistoricalEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "locality_id", nullable = false, length = 50)
    private String localityId;

    @Column(nullable = false)
    private LocalDate eventDate;

    private Double rainfallMm;

    @Column(length = 255)
    private String description;

    @Column(length = 120)
    private String source;
}
