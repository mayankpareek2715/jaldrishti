package com.jaldrishti.controller;

import com.jaldrishti.dto.FloodRouteRequestDto;
import com.jaldrishti.dto.FloodRouteResponseDto;
import com.jaldrishti.service.FloodRouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/flood-routes")
@RequiredArgsConstructor
public class FloodRouteController {

    private final FloodRouteService floodRouteService;

    @PostMapping
    public FloodRouteResponseDto findFloodAwareRoutes(@Valid @RequestBody FloodRouteRequestDto request) {
        return floodRouteService.findFloodAwareRoutes(request);
    }
}
