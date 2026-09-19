package com.jaldrishti.controller;

import com.jaldrishti.imd.config.ImdCityMapping;
import com.jaldrishti.imd.dto.*;
import com.jaldrishti.imd.service.ImdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final ImdService imdService;
    private final ImdCityMapping cityMapping;

    @GetMapping("/current")
    public ResponseEntity<ImdCurrentWeatherDto> getCurrentWeather(@RequestParam(defaultValue = "Bengaluru") String city) {
        return imdService.getCurrentWeather(city)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(ImdCurrentWeatherDto.builder()
                        .source("IMD")
                        .city(city)
                        .status("UNAVAILABLE")
                        .isStale(true)
                        .weatherCondition("Observation unavailable")
                        .build()));
    }

    @GetMapping("/nowcast")
    public ResponseEntity<ImdNowcastDto> getNowcast(@RequestParam(defaultValue = "Bengaluru") String city) {
        return imdService.getNowcast(city)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(ImdNowcastDto.builder()
                        .source("IMD")
                        .city(city)
                        .status("UNAVAILABLE")
                        .isStale(true)
                        .warningMessage("Nowcast currently unavailable from IMD")
                        .warningColor("#10b981")
                        .rainIntensityCategory("No active warning")
                        .build()));
    }

    @GetMapping("/rainfall")
    public ResponseEntity<ImdRainfallDto> getRainfall(@RequestParam(defaultValue = "Bengaluru") String city) {
        return imdService.getRainfall(city)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(ImdRainfallDto.builder()
                        .source("IMD")
                        .city(city)
                        .status("UNAVAILABLE")
                        .isStale(true)
                        .build()));
    }

    @GetMapping("/warnings")
    public ResponseEntity<ImdWarningDto> getWarnings(@RequestParam(defaultValue = "Bengaluru") String city) {
        return imdService.getWarnings(city)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(ImdWarningDto.builder()
                        .source("IMD")
                        .city(city)
                        .status("UNAVAILABLE")
                        .isStale(true)
                        .build()));
    }

    @GetMapping("/summary")
    public ResponseEntity<ImdWeatherSummaryDto> getWeatherSummary(@RequestParam(defaultValue = "Bengaluru") String city) {
        return ResponseEntity.ok(imdService.getWeatherSummary(city));
    }

    @GetMapping("/status")
    public ResponseEntity<ImdHealthStatusDto> getHealthStatus(@RequestParam(defaultValue = "Bengaluru") String city) {
        return ResponseEntity.ok(imdService.getHealthStatus(city));
    }

    @GetMapping("/stations")
    public ResponseEntity<Map<String, Object>> getStations(@RequestParam(defaultValue = "Bengaluru") String city) {
        ImdCityMapping.CityMetadata meta = cityMapping.getMetadataOrDefault(city);
        return ResponseEntity.ok(Map.of(
                "city", meta.getCityName(),
                "district", meta.getImdDistrict(),
                "state", meta.getImdState(),
                "stateId", meta.getImdStateId(),
                "primaryStationId", meta.getPrimaryStationId(),
                "primaryStationName", meta.getPrimaryStationName(),
                "latitude", meta.getLatitude(),
                "longitude", meta.getLongitude()
        ));
    }
}
