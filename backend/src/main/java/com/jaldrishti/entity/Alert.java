package com.jaldrishti.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
@Getter
@Setter
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "locality_id", nullable = false, length = 50)
    private String localityId;

    @Column(nullable = false, length = 12)
    private String severity;

    @Column(nullable = false, length = 255)
    private String message;

    private Double riskProbability;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false)
    private Boolean isSimulated;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime acknowledgedAt;

    @Column(length = 80)
    private String acknowledgedBy;
}
