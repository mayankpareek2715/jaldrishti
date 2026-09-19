package com.jaldrishti.controller;

import com.jaldrishti.dto.LocalityDetailDto;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.repository.LocalityRepository;
import com.jaldrishti.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/localities")
@RequiredArgsConstructor
public class LocalityController {

    private final LocalityRepository localityRepository;
    private final RiskService riskService;

    @GetMapping
    public List<Locality> getAll() {
        return localityRepository.findAll();
    }

    @GetMapping("/{id}")
    public LocalityDetailDto getDetail(@PathVariable String id) {
        return riskService.getLocalityDetail(id);
    }
}
