package com.jaldrishti.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "risk_predictions")
@Getter
@Setter
public class RiskPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "locality_id", nullable = false, length = 50)
    private String localityId;

    @Column(nullable = false)
    private LocalDateTime predictedAt;

    @Column(nullable = false, length = 10)
    private String horizon;

    @Column(nullable = false)
    private Double riskProbability;

    @Column(nullable = false, length = 12)
    private String riskTier;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String topFactors;

    @Column(length = 30)
    private String modelVersion;

    @Column(nullable = false)
    private Boolean isSimulated;
}
