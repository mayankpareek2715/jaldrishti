package com.jaldrishti.imd.config;

import lombok.Builder;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class ImdCityMapping {

    @Getter
    @Builder
    public static class CityMetadata {
        private final String cityName;
        private final String imdDistrict;
        private final String imdState;
        private final String imdStateId;
        private final String primaryStationId;
        private final String primaryStationName;
        private final String secondaryStationId;
        private final double latitude;
        private final double longitude;
    }

    private final Map<String, CityMetadata> registry;

    public ImdCityMapping() {
        Map<String, CityMetadata> map = new HashMap<>();

        // Bengaluru (Karnataka - State ID 13)
        map.put("bengaluru", CityMetadata.builder()
                .cityName("Bengaluru")
                .imdDistrict("BENGALURU URBAN")
                .imdState("KARNATAKA")
                .imdStateId("13")
                .primaryStationId("43295") // Bengaluru City Observatory
                .primaryStationName("Bengaluru City")
                .secondaryStationId("43296") // Bengaluru HAL Airport
                .latitude(12.9716)
                .longitude(77.5946)
                .build());

        // Bhubaneswar (Odisha - State ID 10)
        map.put("bhubaneswar", CityMetadata.builder()
                .cityName("Bhubaneswar")
                .imdDistrict("KHORDHA")
                .imdState("ODISHA")
                .imdStateId("10")
                .primaryStationId("42971") // Bhubaneswar Airport Observatory
                .primaryStationName("Bhubaneswar Airport")
                .secondaryStationId(null)
                .latitude(20.2961)
                .longitude(85.8245)
                .build());

        this.registry = Collections.unmodifiableMap(map);
    }

    public Optional<CityMetadata> getMetadata(String city) {
        if (city == null) return Optional.empty();
        String key = city.trim().toLowerCase();
        // Handle common variations
        if (key.equals("bangalore")) key = "bengaluru";
        if (key.equals("bhubaneshwar")) key = "bhubaneswar";
        return Optional.ofNullable(registry.get(key));
    }

    public CityMetadata getMetadataOrDefault(String city) {
        return getMetadata(city).orElse(registry.get("bengaluru"));
    }
}
