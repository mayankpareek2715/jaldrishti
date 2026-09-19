package com.jaldrishti.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "rainfall_readings")
@Getter
@Setter
public class RainfallReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "locality_id", nullable = false, length = 50)
    private String localityId;

    @Column(name = "reading_time", nullable = false)
    private LocalDateTime readingTime;

    @Column(name = "rain_15min_mm", nullable = false)
    private Double rain15minMm;

    @Column(name = "rain_1hr_mm", nullable = false)
    private Double rain1hrMm;

    @Column(name = "rain_3hr_mm", nullable = false)
    private Double rain3hrMm;

    @Column(name = "rain_3day_cum_mm", nullable = false)
    private Double rain3dayCumMm;

    @Column(name = "rain_7day_cum_mm", nullable = false)
    private Double rain7dayCumMm;

    @Column(name = "forecast_1_3hr_mm", nullable = false)
    private Double forecast13hrMm;

    @Column(name = "source", nullable = false, length = 30)
    private String source;
}