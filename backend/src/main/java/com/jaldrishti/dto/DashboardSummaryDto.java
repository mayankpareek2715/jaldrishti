package com.jaldrishti.dto;

import java.util.List;

public record DashboardSummaryDto(
        Integer totalLocalities,
        Integer highRiskCount,
        Integer severeRiskCount,
        Integer openAlertCount,
        List<RiskMapEntryDto> topRiskLocalities,
        List<AlertDto> recentAlerts
) {}
