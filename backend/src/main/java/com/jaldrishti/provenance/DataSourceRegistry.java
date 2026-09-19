package com.jaldrishti.provenance;

import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Authoritative central data source registry for JalDrishti.
 * Defines provider, dataset, version, license, update frequency, and verification status.
 */
@Component
public class DataSourceRegistry {

    public record SourceDescriptor(
            DataSourceType type,
            String name,
            String provider,
            String dataset,
            String version,
            String license,
            String updateFrequency,
            String documentationUrl,
            boolean enabled
    ) {}

    private final Map<DataSourceType, SourceDescriptor> registry = new EnumMap<>(DataSourceType.class);

    public DataSourceRegistry() {
        register(new SourceDescriptor(
                DataSourceType.IMD,
                "India Meteorological Department",
                "Ministry of Earth Sciences, Govt. of India",
                "National Weather Forecasting Centre Observation & Nowcast Feeds",
                "API Gateway v2.0",
                "Govt of India Open Data / IMD API Terms",
                "15 to 60 minutes",
                "https://api.imd.gov.in/public/api_reference.html",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.DEM,
                "Digital Elevation Model",
                "ISRO CartoDEM / NASA SRTM",
                "30-Meter High-Resolution Topographic Elevation Relief Grid",
                "SRTM GL1 v3.0 / CartoDEM R1",
                "Public Domain / Open Topo",
                "Static Reference Grid",
                "https://earthexplorer.usgs.gov",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.DRAINAGE_GIS,
                "Urban Stormwater & Drainage GIS Network",
                "BBMP SWD Department / BMC Municipal GIS",
                "Primary, Secondary & Tertiary Stormwater Drain Channels",
                "v2024.1",
                "State Municipal Open GIS",
                "Semi-Annual Survey",
                "https://bbmp.gov.in",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.LAND_COVER,
                "High-Resolution Land Cover & Imperviousness",
                "ESA Copernicus / Sentinel-2 Global Land Cover",
                "10-Meter Built-up & Impervious Surface Density Mask",
                "WorldCover v2.0",
                "CC-BY 4.0",
                "Annual Satellite Processing",
                "https://worldcover2021.esa.int",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.HISTORICAL_FLOOD_DB,
                "Verified Urban Inundation Events Database",
                "KSNDMC & JalDrishti Ground Truth Archives",
                "Georeferenced Monitored Waterlogging Incidents (2021-2024)",
                "v2024-Q3",
                "JalDrishti Research Archive",
                "Post-Monsoon Audit",
                "https://ksndmc.karnataka.gov.in",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.JALDRISHTI_ML,
                "JalDrishti Flood Hazard Inundation Model",
                "JalDrishti AI & Hydrology Research",
                "XGBoost Inundation Classifier with Calibrated Terrain Scorer",
                "v1.4.0-calibrated",
                "Proprietary Platform Engine",
                "Real-time Inference",
                "https://jaldrishti.org/ml-docs",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.JALDRISHTI_SIMULATION,
                "What-If Hydrological Scenario Simulator",
                "JalDrishti Hydrological Engine",
                "Synthetic Rainfall Stress-Testing Inundation Model",
                "v1.2-scenario",
                "Proprietary Platform Engine",
                "Interactive User Request",
                "https://jaldrishti.org/sim-docs",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.ROUTING_PROVIDER,
                "OSRM Road Network Routing Engine",
                "OpenStreetMap Contributors / Project OSRM",
                "Road Network Geometry with JalDrishti Dynamic Hazard Overlays",
                "Car Profile v5.27.1",
                "ODbL 1.0",
                "Weekly OSM Sync",
                "https://project-osrm.org",
                true
        ));

        register(new SourceDescriptor(
                DataSourceType.CITIZEN_REPORT,
                "Citizen Ground Verification Telemetry",
                "JalDrishti Mobile & Web Field Reports",
                "Crowdsourced Waterlogging Observations with Verification Status",
                "Live Telemetry Stream",
                "JalDrishti Terms of Service",
                "Real-time Ingestion",
                "https://jaldrishti.org/citizen",
                true
        ));
    }

    private void register(SourceDescriptor descriptor) {
        registry.put(descriptor.type(), descriptor);
    }

    public SourceDescriptor get(DataSourceType type) {
        return registry.get(type);
    }

    public List<SourceDescriptor> getAll() {
        return new ArrayList<>(registry.values());
    }
}
