package com.jaldrishti.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "citizen_reports")
public class CitizenReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "locality_id", nullable = false)
    private String localityId;

    @Column(name = "locality_name")
    private String localityName;

    @Column(name = "city", nullable = false)
    private String city;

    @Column(name = "location_description")
    private String locationDescription;

    @Column(name = "water_level_feet", nullable = false)
    private Double waterLevelFeet;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public CitizenReport() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLocalityId() { return localityId; }
    public void setLocalityId(String localityId) { this.localityId = localityId; }

    public String getLocalityName() { return localityName; }
    public void setLocalityName(String localityName) { this.localityName = localityName; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getLocationDescription() { return locationDescription; }
    public void setLocationDescription(String locationDescription) { this.locationDescription = locationDescription; }

    public Double getWaterLevelFeet() { return waterLevelFeet; }
    public void setWaterLevelFeet(Double waterLevelFeet) { this.waterLevelFeet = waterLevelFeet; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
