package com.jaldrishti.controller;

import com.jaldrishti.dto.PredictionResponseDto;
import com.jaldrishti.dto.SimulateRequestDto;
import com.jaldrishti.service.RiskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulation")
@RequiredArgsConstructor
public class SimulationController {

    private final RiskService riskService;

    /** Every response from this endpoint carries simulated=true -- see Section 22 of the plan:
     *  the frontend MUST render a visible "simulated scenario" banner whenever this is used. */
    @PostMapping
    public PredictionResponseDto simulate(@Valid @RequestBody SimulateRequestDto request) {
        return riskService.simulate(request);
    }
}
