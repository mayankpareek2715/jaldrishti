package com.jaldrishti.imd;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaldrishti.imd.config.ImdCityMapping;
import com.jaldrishti.imd.dto.ImdCurrentWeatherDto;
import com.jaldrishti.imd.dto.ImdNowcastDto;
import com.jaldrishti.imd.dto.ImdRainfallDto;
import com.jaldrishti.imd.dto.ImdWarningDto;
import com.jaldrishti.imd.mapper.ImdResponseMapper;
import com.jaldrishti.imd.service.ImdCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class ImdIntegrationTest {

    private ImdResponseMapper mapper;
    private ImdCityMapping mapping;
    private ImdCacheService cache;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mapper = new ImdResponseMapper();
        mapping = new ImdCityMapping();
        cache = new ImdCacheService();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Verify city mapping resolves Bhubaneswar and Bengaluru correctly")
    void testCityMapping() {
        Optional<ImdCityMapping.CityMetadata> blr = mapping.getMetadata("Bengaluru");
        assertTrue(blr.isPresent());
        assertEquals("BENGALURU URBAN", blr.get().getImdDistrict());
        assertEquals("43295", blr.get().getPrimaryStationId());

        Optional<ImdCityMapping.CityMetadata> bbsr = mapping.getMetadata("Bhubaneswar");
        assertTrue(bbsr.isPresent());
        assertEquals("KHORDHA", bbsr.get().getImdDistrict());
        assertEquals("42971", bbsr.get().getPrimaryStationId());
    }

    @Test
    @DisplayName("Verify Current Weather mapper parses IMD fields without converting 24h rainfall to mm/hr")
    void testCurrentWeatherMapping() throws Exception {
        String json = """
        {
          "ID": "43295",
          "STATION": "BENGALURU CITY",
          "DISTRICT": "BENGALURU URBAN",
          "STATE": "KARNATAKA",
          "DATE": "2026-09-18",
          "TIME": "17:30:00",
          "CURR_TEMP": "27.4",
          "RH": "72",
          "WIND_SPEED": "12",
          "WIND_DIRECTION": "240",
          "MSLP": "1008.2",
          "RAINFALL_24_HR": "18.5",
          "WEATHER_CODE": "5"
        }
        """;

        JsonNode root = objectMapper.readTree(json);
        ImdCityMapping.CityMetadata meta = mapping.getMetadata("Bengaluru").get();
        Optional<ImdCurrentWeatherDto> dtoOpt = mapper.mapCurrentWeather(root, meta);

        assertTrue(dtoOpt.isPresent());
        ImdCurrentWeatherDto dto = dtoOpt.get();
        assertEquals("IMD", dto.getSource());
        assertEquals(27.4, dto.getTemperatureC());
        assertEquals(72.0, dto.getHumidityPercent());
        assertEquals(18.5, dto.getRainfall24hMm(), "24h rainfall must preserve exact value and not be modified to hourly");
        assertEquals("Light Rain", dto.getWeatherCondition());
        assertFalse(dto.getIsStale());
        assertEquals("LIVE", dto.getStatus());
    }

    @Test
    @DisplayName("Verify District Rainfall mapper preserves official departures and categories")
    void testDistrictRainfallMapping() throws Exception {
        String json = """
        [
          {
            "District": "KHORDHA",
            "Date": "2026-09-18",
            "Daily Actual": "12.40",
            "Daily Normal": "8.50",
            "Daily Departure Per": "+46%",
            "Daily Category": "Excess",
            "Weekly Actual": "45.00",
            "Weekly Normal": "38.20"
          }
        ]
        """;

        JsonNode root = objectMapper.readTree(json);
        ImdCityMapping.CityMetadata meta = mapping.getMetadata("Bhubaneswar").get();
        Optional<ImdRainfallDto> dtoOpt = mapper.mapRainfall(root, meta);

        assertTrue(dtoOpt.isPresent());
        ImdRainfallDto dto = dtoOpt.get();
        assertEquals(12.40, dto.getDailyActualMm());
        assertEquals(8.50, dto.getDailyNormalMm());
        assertEquals("+46%", dto.getDailyDeparturePercent());
        assertEquals("Excess", dto.getDailyCategory());
    }

    @Test
    @DisplayName("Verify District Nowcast mapper respects IMD intensity bands")
    void testDistrictNowcastMapping() throws Exception {
        String json = """
        [
          {
            "District": "BENGALURU URBAN",
            "DateTime": "2026-09-18 19:00:00",
            "Validity": "3 hours",
            "Rain_Intensity": "Moderate rain",
            "Warning_Color": "#FFFF00",
            "Message": "Moderate rain accompanied by gusty winds likely over Bengaluru Urban"
          }
        ]
        """;

        JsonNode root = objectMapper.readTree(json);
        ImdCityMapping.CityMetadata meta = mapping.getMetadata("Bengaluru").get();
        Optional<ImdNowcastDto> dtoOpt = mapper.mapNowcast(root, meta);

        assertTrue(dtoOpt.isPresent());
        ImdNowcastDto dto = dtoOpt.get();
        assertEquals("Moderate rain", dto.getRainIntensityCategory());
        assertEquals("MODERATE", dto.getWarningSeverity());
        assertTrue(dto.getWarningMessage().contains("Moderate rain"));
    }

    @Test
    @DisplayName("Verify District Warning mapper preserves multi-day bulletin")
    void testDistrictWarningMapping() throws Exception {
        String json = """
        [
          {
            "District": "KHORDHA",
            "date_obs": "2026-09-18",
            "day1_color": "#FFFF00",
            "day1_warning": "Thunderstorm with lightning",
            "day2_color": "#FFA500",
            "day2_warning": "Heavy rain likely",
            "day3_color": "#10B981",
            "day3_warning": "No warning",
            "day4_color": "#10B981",
            "day4_warning": "No warning",
            "day5_color": "#10B981",
            "day5_warning": "No warning"
          }
        ]
        """;

        JsonNode root = objectMapper.readTree(json);
        ImdCityMapping.CityMetadata meta = mapping.getMetadata("Bhubaneswar").get();
        Optional<ImdWarningDto> dtoOpt = mapper.mapWarnings(root, meta);

        assertTrue(dtoOpt.isPresent());
        ImdWarningDto dto = dtoOpt.get();
        assertEquals(5, dto.getDailyWarnings().size());
        assertEquals("Thunderstorm with lightning", dto.getDailyWarnings().get(0).getWarningText());
        assertEquals("Heavy rain likely", dto.getDailyWarnings().get(1).getWarningText());
    }

    @Test
    @DisplayName("Verify In-Memory Cache TTL and expiration behavior")
    void testCacheTtlAndStaleEvaluation() throws InterruptedException {
        String key = "test:weather:key";
        ImdCurrentWeatherDto item = ImdCurrentWeatherDto.builder()
                .city("Bengaluru")
                .temperatureC(25.0)
                .build();

        // 1 second TTL
        cache.put(key, item, 1);
        Optional<ImdCacheService.CacheEntry<ImdCurrentWeatherDto>> hit = cache.get(key, ImdCurrentWeatherDto.class);
        assertTrue(hit.isPresent());
        assertFalse(hit.get().isExpired());

        // Wait for expiry
        Thread.sleep(1100);
        hit = cache.get(key, ImdCurrentWeatherDto.class);
        assertTrue(hit.isPresent(), "Stale entry must remain available for resilience fallback");
        assertTrue(hit.get().isExpired(), "Cache entry should now be marked expired");
    }
}