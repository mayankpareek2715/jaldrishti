package com.jaldrishti.service;

import com.jaldrishti.dto.CitizenReportDto;
import com.jaldrishti.dto.CreateCitizenReportRequestDto;
import com.jaldrishti.entity.CitizenReport;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.repository.CitizenReportRepository;
import com.jaldrishti.repository.LocalityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CitizenReportService {

    private final CitizenReportRepository citizenReportRepository;
    private final LocalityRepository localityRepository;

    public List<CitizenReportDto> getReports(String city) {
        List<CitizenReport> reports = (city != null && !city.isBlank())
                ? citizenReportRepository.findByCityOrderByIdDesc(city)
                : citizenReportRepository.findAllByOrderByIdDesc();

        return reports.stream().map(this::toDto).toList();
    }

    public CitizenReportDto createReport(CreateCitizenReportRequestDto req) {
        Locality loc = localityRepository.findById(req.localityId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown locality ID: " + req.localityId()));

        CitizenReport r = new CitizenReport();
        r.setLocalityId(loc.getId());
        r.setLocalityName(loc.getName());
        r.setCity(loc.getCity());
        r.setLocationDescription(req.locationDescription());
        r.setWaterLevelFeet(req.waterLevelFeet());
        r.setDescription(req.description());
        r.setPhotoUrl(req.photoUrl());
        r.setStatus("PENDING");

        CitizenReport saved = citizenReportRepository.save(r);
        return toDto(saved);
    }

    public CitizenReportDto updateStatus(Long id, String status) {
        CitizenReport r = citizenReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));

        r.setStatus(status.toUpperCase());
        CitizenReport saved = citizenReportRepository.save(r);
        return toDto(saved);
    }

    private CitizenReportDto toDto(CitizenReport r) {
        return new CitizenReportDto(
                r.getId(),
                r.getLocalityId(),
                r.getLocalityName(),
                r.getCity(),
                r.getLocationDescription(),
                r.getWaterLevelFeet(),
                r.getDescription(),
                r.getPhotoUrl(),
                r.getStatus(),
                r.getCreatedAt()
        );
    }
}
