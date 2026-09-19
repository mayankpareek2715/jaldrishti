package com.jaldrishti.controller;

import com.jaldrishti.provenance.DataQualityReportDto;
import com.jaldrishti.provenance.DataSourceRegistry;
import com.jaldrishti.provenance.LocalityProvenanceReportDto;
import com.jaldrishti.service.DataQualityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DataQualityController {

    private final DataQualityService dataQualityService;
    private final DataSourceRegistry dataSourceRegistry;

    @GetMapping("/data-quality")
    public ResponseEntity<DataQualityReportDto> getDataQuality(@RequestParam(defaultValue = "Bengaluru") String city) {
        return ResponseEntity.ok(dataQualityService.getCityDataQuality(city));
    }

    @GetMapping("/localities/{id}/provenance")
    public ResponseEntity<LocalityProvenanceReportDto> getLocalityProvenance(@PathVariable String id) {
        return ResponseEntity.ok(dataQualityService.getLocalityProvenance(id));
    }

    @GetMapping("/data-sources")
    public ResponseEntity<List<DataSourceRegistry.SourceDescriptor>> getDataSources() {
        return ResponseEntity.ok(dataSourceRegistry.getAll());
    }
}
