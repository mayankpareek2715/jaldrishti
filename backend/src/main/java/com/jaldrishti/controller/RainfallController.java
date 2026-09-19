package com.jaldrishti.controller;

import com.jaldrishti.entity.RainfallReading;
import com.jaldrishti.repository.LocalityRepository;
import com.jaldrishti.repository.RainfallReadingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/rainfall")
@RequiredArgsConstructor
public class RainfallController {

    private final RainfallReadingRepository rainfallReadingRepository;
    private final LocalityRepository localityRepository;

    @GetMapping
    public List<RainfallReading> getLatestRainfall(@RequestParam(required = false) String localityId) {
        if (localityId != null) {
            return rainfallReadingRepository.findFirstByLocalityIdOrderByReadingTimeDesc(localityId)
                    .map(List::of).orElse(List.of());
        }
        return localityRepository.findAll().stream()
                .map(loc -> rainfallReadingRepository.findFirstByLocalityIdOrderByReadingTimeDesc(loc.getId()))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
    }
}
