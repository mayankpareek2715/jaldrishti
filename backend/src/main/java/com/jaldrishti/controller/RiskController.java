package com.jaldrishti.controller;

import com.jaldrishti.dto.RiskMapEntryDto;
import com.jaldrishti.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RiskController {

    private final RiskService riskService;

    @GetMapping("/risk-map")
    public List<RiskMapEntryDto> getRiskMap(@RequestParam(defaultValue = "+1h") String horizon) {
        return riskService.getRiskMap(horizon);
    }
}
