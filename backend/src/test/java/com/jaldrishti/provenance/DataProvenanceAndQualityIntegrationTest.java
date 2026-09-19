package com.jaldrishti.provenance;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class DataProvenanceAndQualityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Verify /api/data-quality for Bengaluru returns structured dataset report")
    void testBengaluruDataQuality() throws Exception {
        mockMvc.perform(get("/api/data-quality").param("city", "Bengaluru"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city", is("Bengaluru")))
                .andExpect(jsonPath("$.totalLocalitiesMonitored", greaterThanOrEqualTo(12)))
                .andExpect(jsonPath("$.sources", hasSize(greaterThanOrEqualTo(8))))
                .andExpect(jsonPath("$.sources[?(@.sourceType == 'IMD')]", not(empty())))
                .andExpect(jsonPath("$.sources[?(@.sourceType == 'DEM')]", not(empty())))
                .andExpect(jsonPath("$.sources[?(@.sourceType == 'DRAINAGE_GIS')]", not(empty())))
                .andExpect(jsonPath("$.sources[?(@.sourceType == 'LAND_COVER')]", not(empty())))
                .andExpect(jsonPath("$.sources[?(@.sourceType == 'HISTORICAL_FLOOD_DB')]", not(empty())))
                .andExpect(jsonPath("$.sources[?(@.sourceType == 'JALDRISHTI_ML')]", not(empty())));
    }

    @Test
    @DisplayName("Verify /api/data-quality for Bhubaneswar returns structured dataset report")
    void testBhubaneswarDataQuality() throws Exception {
        mockMvc.perform(get("/api/data-quality").param("city", "Bhubaneswar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city", is("Bhubaneswar")))
                .andExpect(jsonPath("$.totalLocalitiesMonitored", greaterThanOrEqualTo(6)))
                .andExpect(jsonPath("$.sources", hasSize(greaterThanOrEqualTo(8))));
    }

    @Test
    @DisplayName("Verify locality provenance returns full lineage for Koramangala")
    void testLocalityProvenance() throws Exception {
        mockMvc.perform(get("/api/localities/koramangala/provenance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.localityId", is("koramangala")))
                .andExpect(jsonPath("$.city", is("Bengaluru")))
                .andExpect(jsonPath("$.attributes", hasSize(greaterThanOrEqualTo(6))))
                .andExpect(jsonPath("$.attributes[?(@.fieldName == 'elevationM')].unit", hasItem("m")))
                .andExpect(jsonPath("$.attributes[?(@.fieldName == 'slopeDeg')].unit", hasItem("degrees")))
                .andExpect(jsonPath("$.attributes[?(@.fieldName == 'drainageDensity')].unit", hasItem("km/km²")))
                .andExpect(jsonPath("$.attributes[?(@.fieldName == 'imperviousPct')].unit", hasItem("%")))
                .andExpect(jsonPath("$.attributes[?(@.fieldName == 'historicalFloodFreq')].unit", hasItem("count")))
                .andExpect(jsonPath("$.attributes[?(@.fieldName == 'elevationM')].sourceType", hasItem("DEM")));
    }

    @Test
    @DisplayName("Verify /api/data-sources returns complete 9-source registry")
    void testDataSourcesRegistry() throws Exception {
        mockMvc.perform(get("/api/data-sources"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(9)))
                .andExpect(jsonPath("$[?(@.type == 'IMD')].name", hasItem(containsString("Meteorological"))))
                .andExpect(jsonPath("$[?(@.type == 'IMD')].provider", hasItem(containsString("Earth Sciences"))))
                .andExpect(jsonPath("$[?(@.type == 'DEM')].dataset", hasItem(containsString("Elevation"))));
    }
}
