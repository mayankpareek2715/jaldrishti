package com.jaldrishti.controller;

import com.jaldrishti.dto.RouteCheckRequestDto;
import com.jaldrishti.dto.RouteCheckResponseDto;
import com.jaldrishti.service.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/route-check")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @PostMapping
    public RouteCheckResponseDto checkRoute(@Valid @RequestBody RouteCheckRequestDto request) {
        return routeService.checkRoute(request);
    }
}
