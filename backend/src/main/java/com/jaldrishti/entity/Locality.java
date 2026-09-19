package com.jaldrishti.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "localities")
@Getter
@Setter
public class Locality {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 120)
    private String ward;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(name = "centroid_lat", nullable = false)
    private Double centroidLat;

    @Column(name = "centroid_lon", nullable = false)
    private Double centroidLon;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "polygon_geojson", columnDefinition = "jsonb")
    private String polygonGeojson;

    @Column(name = "elevation_m", nullable = false)
    private Double elevationM;

    @Column(name = "slope_deg", nullable = false)
    private Double slopeDeg;

    @Column(name = "drainage_density", nullable = false)
    private Double drainageDensity;

    @Column(name = "impervious_pct", nullable = false)
    private Double imperviousPct;

    @Column(name = "historical_flood_freq", nullable = false)
    private Integer historicalFloodFreq;

    @Column(name = "is_bbmp_flood_prone", nullable = false)
    private Boolean isBbmpFloodProne;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}