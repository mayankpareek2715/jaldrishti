package com.jaldrishti.provenance;

/**
 * Controlled authoritative source types for all JalDrishti data points.
 * Arbitrary frontend or client strings are not permitted.
 */
public enum DataSourceType {
    IMD("India Meteorological Department", "Official Observation & Forecast API"),
    DEM("Digital Elevation Model", "SRTM 30m / CartoDEM Elevation Pipeline"),
    DRAINAGE_GIS("GIS Drainage Network", "Hydrographic Vector Drainage Layer"),
    LAND_COVER("Remote Sensing Land Cover", "Sentinel-2 10m LULC Classification"),
    HISTORICAL_FLOOD_DB("Historical Flood Database", "Verified Urban Flooding Event Logs"),
    JALDRISHTI_ML("JalDrishti ML Inference", "XGBoost v1.4 / Calibrated Physics Model"),
    JALDRISHTI_SIMULATION("JalDrishti Simulation Engine", "What-If Scenario Modeling (Hypothetical)"),
    ROUTING_PROVIDER("Road Network Routing", "OSRM Road Transit & Flood Hazard Overlay"),
    CITIZEN_REPORT("Citizen Telemetry", "Field Citizen Reports (User Observation)");

    private final String displayName;
    private final String description;

    DataSourceType(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }
}
