package com.jaldrishti.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "jaldrishti.flood-routing")
@Getter
@Setter
public class FloodRouteConfig {
    private double timeWeight = 1.0;
    private double distanceWeight = 0.5;
    private double floodWeight = 3.0;
    private double severeFloodWeight = 10.0;
    private double blockedRoadWeight = 50.0;
    private double proximityKm = 2.0;
    private String googleApiKey = "";
}
