package com.jaldrishti.controller;

import com.jaldrishti.dto.AlertDto;
import com.jaldrishti.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public List<AlertDto> getAlerts(@RequestParam(required = false) String status) {
        return alertService.getAlerts(status);
    }

    @PostMapping("/{id}/acknowledge")
    public AlertDto acknowledge(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String by = body != null ? body.get("acknowledgedBy") : null;
        return alertService.acknowledge(id, by);
    }
}
