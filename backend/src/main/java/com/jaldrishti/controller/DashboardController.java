package com.jaldrishti.controller;

import com.jaldrishti.dto.AlertDto;
import com.jaldrishti.dto.DashboardSummaryDto;
import com.jaldrishti.dto.RiskMapEntryDto;
import com.jaldrishti.service.AlertService;
import com.jaldrishti.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final RiskService riskService;
    private final AlertService alertService;

    @GetMapping("/summary")
    public DashboardSummaryDto getSummary() {
        List<RiskMapEntryDto> riskMap = riskService.getRiskMap("+1h");
        long highCount = riskMap.stream().filter(r -> "HIGH".equals(r.riskTier())).count();
        long severeCount = riskMap.stream().filter(r -> "SEVERE".equals(r.riskTier())).count();

        List<RiskMapEntryDto> topRisk = riskMap.stream()
                .sorted(Comparator.comparingDouble(RiskMapEntryDto::riskProbability).reversed())
                .limit(5)
                .toList();

        List<AlertDto> openAlerts = alertService.getAlerts("OPEN");

        return new DashboardSummaryDto(
                riskMap.size(), (int) highCount, (int) severeCount, openAlerts.size(),
                topRisk, openAlerts.stream().limit(5).toList());
    }
}
