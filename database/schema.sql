-- JalDrishti PostgreSQL schema (PostgreSQL 18.4 compatible, no PostGIS required)
-- Geometry is stored as JSONB (GeoJSON-style polygon/point) and processed in application code.
-- This keeps setup to a single `psql -f schema.sql` with zero extra extensions.

DROP TABLE IF EXISTS citizen_reports CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS risk_predictions CASCADE;
DROP TABLE IF EXISTS simulation_runs CASCADE;
DROP TABLE IF EXISTS rainfall_readings CASCADE;
DROP TABLE IF EXISTS historical_events CASCADE;
DROP TABLE IF EXISTS localities CASCADE;

CREATE TABLE localities (
    id              VARCHAR(50) PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    ward            VARCHAR(120),
    city            VARCHAR(80) NOT NULL DEFAULT 'Bengaluru',
    centroid_lat    DOUBLE PRECISION NOT NULL,
    centroid_lon    DOUBLE PRECISION NOT NULL,
    polygon_geojson JSONB,
    elevation_m     DOUBLE PRECISION NOT NULL,
    slope_deg       DOUBLE PRECISION NOT NULL,
    drainage_density DOUBLE PRECISION NOT NULL,
    impervious_pct  DOUBLE PRECISION NOT NULL,
    historical_flood_freq INTEGER NOT NULL DEFAULT 0,
    is_bbmp_flood_prone BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE historical_events (
    id              BIGSERIAL PRIMARY KEY,
    locality_id     VARCHAR(50) NOT NULL REFERENCES localities(id),
    event_date      DATE NOT NULL,
    rainfall_mm     DOUBLE PRECISION,
    description     VARCHAR(255),
    source          VARCHAR(120)
);

CREATE TABLE rainfall_readings (
    id              BIGSERIAL PRIMARY KEY,
    locality_id     VARCHAR(50) NOT NULL REFERENCES localities(id),
    reading_time    TIMESTAMP NOT NULL DEFAULT NOW(),
    rain_15min_mm   DOUBLE PRECISION NOT NULL DEFAULT 0,
    rain_1hr_mm     DOUBLE PRECISION NOT NULL DEFAULT 0,
    rain_3hr_mm     DOUBLE PRECISION NOT NULL DEFAULT 0,
    rain_3day_cum_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
    rain_7day_cum_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
    forecast_1_3hr_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
    source          VARCHAR(30) NOT NULL DEFAULT 'open-meteo'
);
CREATE INDEX idx_rainfall_locality_time ON rainfall_readings(locality_id, reading_time DESC);

CREATE TABLE simulation_runs (
    id              BIGSERIAL PRIMARY KEY,
    locality_id     VARCHAR(50) NOT NULL REFERENCES localities(id),
    scenario_name   VARCHAR(40),
    simulated_rainfall_mm DOUBLE PRECISION NOT NULL,
    horizon         VARCHAR(10) NOT NULL DEFAULT '+1h',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_predictions (
    id              BIGSERIAL PRIMARY KEY,
    locality_id     VARCHAR(50) NOT NULL REFERENCES localities(id),
    predicted_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    horizon         VARCHAR(10) NOT NULL,
    risk_probability DOUBLE PRECISION NOT NULL,
    risk_tier       VARCHAR(12) NOT NULL,
    top_factors     JSONB,
    model_version   VARCHAR(30),
    is_simulated    BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_risk_locality_time ON risk_predictions(locality_id, predicted_at DESC);

CREATE TABLE alerts (
    id              BIGSERIAL PRIMARY KEY,
    locality_id     VARCHAR(50) NOT NULL REFERENCES localities(id),
    severity        VARCHAR(12) NOT NULL,
    message         VARCHAR(255) NOT NULL,
    risk_probability DOUBLE PRECISION,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    is_simulated    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(80)
);
CREATE INDEX idx_alerts_status ON alerts(status);

CREATE TABLE citizen_reports (
    id              BIGSERIAL PRIMARY KEY,
    locality_id     VARCHAR(50) NOT NULL REFERENCES localities(id),
    locality_name   VARCHAR(120),
    city            VARCHAR(80) NOT NULL DEFAULT 'Bengaluru',
    location_description VARCHAR(255),
    water_level_feet DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    description     TEXT,
    photo_url       VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_citizen_reports_locality ON citizen_reports(locality_id);

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    full_name       VARCHAR(150),
    avatar_url      VARCHAR(500),
    role            VARCHAR(50) NOT NULL DEFAULT 'ROLE_USER',
    auth_provider   VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
    google_id       VARCHAR(150),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
