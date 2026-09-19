package com.jaldrishti.controller;

import com.jaldrishti.dto.InterventionRecommendationDto;
import com.jaldrishti.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interventions")
@RequiredArgsConstructor
public class InterventionController {

    private final RiskService riskService;

    @GetMapping
    public List<InterventionRecommendationDto> getInterventions(@RequestParam(required = false) String city) {
        return riskService.getInterventionRecommendations(city);
    }
}
