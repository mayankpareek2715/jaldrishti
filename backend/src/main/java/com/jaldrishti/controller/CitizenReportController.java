package com.jaldrishti.controller;

import com.jaldrishti.dto.CitizenReportDto;
import com.jaldrishti.dto.CreateCitizenReportRequestDto;
import com.jaldrishti.service.CitizenReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/citizen-reports")
@RequiredArgsConstructor
public class CitizenReportController {

    private final CitizenReportService citizenReportService;

    @GetMapping
    public List<CitizenReportDto> getReports(@RequestParam(required = false) String city) {
        return citizenReportService.getReports(city);
    }

    @PostMapping
    public CitizenReportDto createReport(@Valid @RequestBody CreateCitizenReportRequestDto request) {
        return citizenReportService.createReport(request);
    }

    @PutMapping("/{id}/status")
    public CitizenReportDto updateStatus(@PathVariable Long id, @RequestParam String status) {
        return citizenReportService.updateStatus(id, status);
    }
}
