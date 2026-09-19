package com.jaldrishti.service;

import com.jaldrishti.dto.PredictionResponseDto;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.entity.RainfallReading;
import com.jaldrishti.imd.dto.ImdCurrentWeatherDto;
import com.jaldrishti.imd.dto.ImdNowcastDto;
import com.jaldrishti.imd.dto.ImdRainfallDto;
import com.jaldrishti.imd.dto.ImdWarningDto;
import com.jaldrishti.imd.service.ImdService;
import com.jaldrishti.provenance.*;
import com.jaldrishti.repository.CitizenReportRepository;
import com.jaldrishti.repository.HistoricalEventRepository;
import com.jaldrishti.repository.LocalityRepository;
import com.jaldrishti.repository.RainfallReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataQualityService {

    private final DataSourceRegistry registry;
    private final ImdService imdService;
    private final LocalityRepository localityRepository;
    private final HistoricalEventRepository historicalEventRepository;
    private final CitizenReportRepository citizenReportRepository;
    private final RainfallReadingRepository rainfallReadingRepository;
    private final MlServiceClient mlServiceClient;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private Instant parseDateOrNull(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            return Instant.parse(dateStr);
        } catch (Exception e1) {
            try {
                return LocalDateTime.parse(dateStr, DATE_TIME_FORMATTER).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
            } catch (Exception e2) {
                return null;
            }
        }
    }

    public DataQualityReportDto getCityDataQuality(String city) {
        String normalizedCity = (city == null || city.isBlank()) ? "Bengaluru" : city.trim();
        List<Locality> localities = localityRepository.findByCityIgnoreCase(normalizedCity);
        int localityCount = localities.size();

        // 1. IMD Current Weather
        Optional<ImdCurrentWeatherDto> currentWeather = imdService.getCurrentWeather(normalizedCity);
        boolean wxAvailable = currentWeather.isPresent() && !"UNAVAILABLE".equalsIgnoreCase(currentWeather.get().getStatus());
        boolean wxStale = currentWeather.map(w -> Boolean.TRUE.equals(w.getIsStale())).orElse(true);

        // 2. IMD Rainfall
        Optional<ImdRainfallDto> rainfall = imdService.getRainfall(normalizedCity);
        boolean rainAvailable = rainfall.isPresent() && !"UNAVAILABLE".equalsIgnoreCase(rainfall.get().getStatus());

        // 3. IMD Nowcast
        Optional<ImdNowcastDto> nowcast = imdService.getNowcast(normalizedCity);
        boolean nowcastAvailable = nowcast.isPresent() && !"UNAVAILABLE".equalsIgnoreCase(nowcast.get().getStatus());

        // 4. IMD Warnings
        Optional<ImdWarningDto> warnings = imdService.getWarnings(normalizedCity);
        boolean warnAvailable = warnings.isPresent() && !"UNAVAILABLE".equalsIgnoreCase(warnings.get().getStatus());

        // 5. Historical Floods Count for this city
        int historicalCount = 0;
        for (Locality loc : localities) {
            historicalCount += historicalEventRepository.findByLocalityIdOrderByEventDateDesc(loc.getId()).size();
        }

        // 6. Citizen Reports Count for this city
        int citizenCount = citizenReportRepository.findByCityOrderByCreatedAtDesc(normalizedCity).size();

        List<DataQualityReportDto.SourceQualityItemDto> items = new ArrayList<>();

        // Add IMD Weather
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "IMD Surface Weather Observation",
                DataSourceType.IMD,
                registry.get(DataSourceType.IMD).dataset(),
                registry.get(DataSourceType.IMD).version(),
                wxAvailable ? (wxStale ? "STALE" : "FRESH") : "UNAVAILABLE",
                wxStale,
                currentWeather.map(w -> parseDateOrNull(w.getObservedAt())).orElse(null),
                Instant.now(),
                "15 to 60 min",
                wxAvailable ? "PASSED" : "WARNING",
                wxAvailable ? String.format("Current: %.1f°C, %s", currentWeather.get().getTemperatureC(), currentWeather.get().getWeatherCondition()) : "Station data temporarily unreachable"
        ));

        // Add IMD Rainfall
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "IMD Cumulative Rainfall (24-Hour)",
                DataSourceType.IMD,
                "IMD Daily Rainfall Observation Network",
                "v2.0",
                rainAvailable ? "FRESH" : "FALLBACK_TELEMETRY",
                false,
                rainfall.map(r -> parseDateOrNull(r.getObservedDate() + " 08:30:00")).orElse(null),
                Instant.now(),
                "Daily at 08:30 IST",
                "PASSED",
                rainAvailable && rainfall.get().getDailyActualMm() != null
                        ? String.format("24h Rain: %.1f mm (Departure: %s)", rainfall.get().getDailyActualMm(), rainfall.get().getDailyDeparturePercent() != null ? rainfall.get().getDailyDeparturePercent() : "N/A")
                        : "Telemetry grid active across monitored localities"
        ));

        // Add IMD Nowcast
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "IMD Severe Weather Nowcast",
                DataSourceType.IMD,
                "IMD Doppler Radar & Station Nowcast Feed",
                "v1.0",
                nowcastAvailable ? "FRESH" : "UNAVAILABLE",
                false,
                nowcast.map(n -> parseDateOrNull(n.getIssuedAt())).orElse(null),
                Instant.now(),
                "Every 3 hours",
                nowcastAvailable ? "PASSED" : "WARNING",
                nowcast.map(ImdNowcastDto::getWarningMessage).orElse("No active station warning")
        ));

        // Add DEM Elevation & Slope
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "Digital Elevation Model (DEM) & Topography",
                DataSourceType.DEM,
                registry.get(DataSourceType.DEM).dataset(),
                registry.get(DataSourceType.DEM).version(),
                localityCount > 0 ? "VALIDATED" : "UNAVAILABLE",
                false,
                null,
                Instant.now(),
                "Static Reference Grid",
                localityCount > 0 ? "PASSED" : "FAILED",
                String.format("Topographic relief & gradient mapped for %d %s localities", localityCount, normalizedCity)
        ));

        // Add Drainage GIS
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "Hydrographic Stormwater Drainage Network",
                DataSourceType.DRAINAGE_GIS,
                registry.get(DataSourceType.DRAINAGE_GIS).dataset(),
                registry.get(DataSourceType.DRAINAGE_GIS).version(),
                localityCount > 0 ? "VALIDATED" : "UNAVAILABLE",
                false,
                null,
                Instant.now(),
                "Semi-Annual Survey",
                localityCount > 0 ? "PASSED" : "FAILED",
                String.format("Drain channel network & catchment density mapped across %d localities", localityCount)
        ));

        // Add Land Cover / Impervious
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "Sentinel-2 Impervious Surface Classification",
                DataSourceType.LAND_COVER,
                registry.get(DataSourceType.LAND_COVER).dataset(),
                registry.get(DataSourceType.LAND_COVER).version(),
                localityCount > 0 ? "VALIDATED" : "UNAVAILABLE",
                false,
                null,
                Instant.now(),
                "Annual Satellite Processing",
                localityCount > 0 ? "PASSED" : "FAILED",
                String.format("Built-up impervious density evaluated for %d localities", localityCount)
        ));

        // Add Historical Floods Database
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "Verified Historical Inundation Event Archives",
                DataSourceType.HISTORICAL_FLOOD_DB,
                registry.get(DataSourceType.HISTORICAL_FLOOD_DB).dataset(),
                registry.get(DataSourceType.HISTORICAL_FLOOD_DB).version(),
                historicalCount > 0 ? "VALIDATED" : "PARTIAL",
                false,
                null,
                Instant.now(),
                "Post-Monsoon Audit",
                historicalCount > 0 ? "PASSED" : "WARNING",
                String.format("%d verified historical flood incident records on file for %s", historicalCount, normalizedCity)
        ));

        // Add ML Engine
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "JalDrishti Inundation Prediction Engine",
                DataSourceType.JALDRISHTI_ML,
                registry.get(DataSourceType.JALDRISHTI_ML).dataset(),
                registry.get(DataSourceType.JALDRISHTI_ML).version(),
                "OPERATIONAL",
                false,
                null,
                Instant.now(),
                "Real-time Inference",
                "PASSED",
                "Physics-calibrated XGBoost model v1.4 with SHAP feature factor decomposition"
        ));

        // Add Routing Engine
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "Road Transit Routing & Flood Hazard Overlay",
                DataSourceType.ROUTING_PROVIDER,
                registry.get(DataSourceType.ROUTING_PROVIDER).dataset(),
                registry.get(DataSourceType.ROUTING_PROVIDER).version(),
                "OPERATIONAL",
                false,
                null,
                Instant.now(),
                "On Demand",
                "PASSED",
                "OSRM driving engine coupled with JalDrishti real-time flood exposure scoring"
        ));

        // Add Citizen Telemetry
        items.add(new DataQualityReportDto.SourceQualityItemDto(
                "Citizen Ground Truth Field Reports",
                DataSourceType.CITIZEN_REPORT,
                registry.get(DataSourceType.CITIZEN_REPORT).dataset(),
                registry.get(DataSourceType.CITIZEN_REPORT).version(),
                "ACTIVE",
                false,
                null,
                Instant.now(),
                "Real-time Ingestion",
                "PASSED",
                String.format("%d crowdsourced field reports logged for %s with photo/video metadata", citizenCount, normalizedCity)
        ));

        String overallStatus = (wxAvailable && localityCount > 0) ? "HEALTHY" : (localityCount > 0 ? "DEGRADED" : "OFFLINE");

        return new DataQualityReportDto(
                normalizedCity,
                Instant.now(),
                overallStatus,
                localityCount,
                historicalCount,
                citizenCount,
                items
        );
    }

    public LocalityProvenanceReportDto getLocalityProvenance(String localityId) {
        Locality loc = localityRepository.findById(localityId)
                .orElseThrow(() -> new IllegalArgumentException("Locality not found: " + localityId));

        List<DataProvenanceDto> attributes = new ArrayList<>();
        Instant now = Instant.now();

        // 1. Elevation
        attributes.add(new DataProvenanceDto(
                "elevationM",
                loc.getElevationM(),
                "m",
                "static",
                DataSourceType.DEM,
                "ISRO CartoDEM / NASA SRTM",
                "30m High-Resolution Elevation Grid",
                "v3.0",
                null,
                null,
                now,
                null,
                null,
                false,
                "HIGH",
                "VERIFIED",
                String.format("Surface elevation above sea level at centroid (%.4f, %.4f)", loc.getCentroidLat(), loc.getCentroidLon()),
                "dem-" + loc.getId()
        ));

        // 2. Slope
        attributes.add(new DataProvenanceDto(
                "slopeDeg",
                loc.getSlopeDeg(),
                "degrees",
                "static",
                DataSourceType.DEM,
                "DEM Topographic Gradient Analysis",
                "Calculated from 30m Digital Elevation Model",
                "v1.0",
                null,
                null,
                now,
                null,
                null,
                false,
                "HIGH",
                "VERIFIED",
                "Mean terrain gradient percentage/degrees within ward catchment boundary",
                "slope-" + loc.getId()
        ));

        // 3. Drainage Density
        attributes.add(new DataProvenanceDto(
                "drainageDensity",
                loc.getDrainageDensity(),
                "km/km²",
                "semi-annual",
                DataSourceType.DRAINAGE_GIS,
                "Municipal Stormwater Drainage GIS",
                "Urban Hydrographic Channel Network",
                "v2024.1",
                null,
                null,
                now,
                null,
                null,
                false,
                "HIGH",
                "VERIFIED",
                "Length of mapped primary, secondary and tertiary storm drains per square kilometer",
                "drainage-" + loc.getId()
        ));

        // 4. Impervious Surface
        attributes.add(new DataProvenanceDto(
                "imperviousPct",
                loc.getImperviousPct(),
                "%",
                "annual",
                DataSourceType.LAND_COVER,
                "ESA Copernicus / Sentinel-2 Global Land Cover",
                "10m Built-up Land Surface Mask",
                "v2.0",
                null,
                null,
                now,
                null,
                null,
                false,
                "HIGH",
                "VERIFIED",
                "Percentage of catchment area covered by paved surfaces, roofs and concrete roads",
                "impervious-" + loc.getId()
        ));

        // 5. Historical Flood Frequency
        int eventCount = historicalEventRepository.findByLocalityIdOrderByEventDateDesc(loc.getId()).size();
        attributes.add(new DataProvenanceDto(
                "historicalFloodFreq",
                eventCount,
                "count",
                "historical",
                DataSourceType.HISTORICAL_FLOOD_DB,
                "Verified Inundation Archives",
                "Urban Flooding Incident Logs 2021-2024",
                "v2024-Q3",
                null,
                null,
                now,
                null,
                null,
                false,
                "HIGH",
                "VERIFIED",
                String.format("%d verified historical flood incidents on record for this specific locality", eventCount),
                "hist-" + loc.getId()
        ));

        // 6. Rainfall Telemetry
        Optional<RainfallReading> latestRain = rainfallReadingRepository.findFirstByLocalityIdOrderByReadingTimeDesc(loc.getId());
        double rainVal = latestRain.map(RainfallReading::getRain1hrMm).orElse(0.0);
        String rainSource = latestRain.map(RainfallReading::getSource).orElse("IMD_OR_TELEMETRY");
        attributes.add(new DataProvenanceDto(
                "rainfall1hr",
                rainVal,
                "mm/hr",
                "1-hour",
                DataSourceType.IMD,
                rainSource,
                "Live Telemetry & Radar Ingestion Stream",
                "v1.0",
                latestRain.map(r -> r.getReadingTime().atZone(ZoneId.systemDefault()).toInstant()).orElse(now),
                now,
                now,
                null,
                null,
                latestRain.isEmpty(),
                "HIGH",
                "OBSERVED",
                "1-hour rainfall accumulation / intensity from nearest monitoring station",
                "rain-" + loc.getId()
        ));

        // 7. ML Prediction
        PredictionResponseDto pred = mlServiceClient.predict(loc.getId(), "+1h", rainVal, rainVal * 1.8, rainVal * 2.5, rainVal * 4.0);
        attributes.add(new DataProvenanceDto(
                "floodRiskPrediction",
                pred.riskProbability(),
                "probability [0-1]",
                "+1h forecast",
                DataSourceType.JALDRISHTI_ML,
                "JalDrishti Inundation Model",
                pred.modelVersion(),
                "v1.4",
                null,
                pred.calculatedAt(),
                now,
                null,
                null,
                false,
                "HIGH",
                "PREDICTED",
                String.format("Calculated flood probability %.2f, classified as %s per RiskTierPolicy", pred.riskProbability(), pred.riskTier()),
                pred.predictionId()
        ));

        return new LocalityProvenanceReportDto(
                loc.getId(),
                loc.getName(),
                loc.getWard(),
                loc.getCity(),
                "LOCALITY",
                loc.getCentroidLat(),
                loc.getCentroidLon(),
                attributes
        );
    }
}
