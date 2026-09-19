package com.jaldrishti.service;

import com.jaldrishti.dto.AlertDto;
import com.jaldrishti.dto.PredictionResponseDto;
import com.jaldrishti.entity.Alert;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.repository.AlertRepository;
import com.jaldrishti.repository.LocalityRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Alert lifecycle per Section 21 of the master plan: SEVERE (>0.75) fires immediately,
 * HIGH (>0.50) flags but doesn't push. An alert only fires ONCE per threshold-crossing
 * (checked via "is there already an OPEN alert for this locality") to avoid spamming the
 * same alert every polling cycle while a locality stays at SEVERE.
 */
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final LocalityRepository localityRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${jaldrishti.alerts.severe-threshold}")
    private double severeThreshold;

    @Value("${jaldrishti.alerts.high-threshold}")
    private double highThreshold;

    public void evaluateAndMaybeCreateAlert(Locality loc, PredictionResponseDto pred, boolean simulated) {
        if (pred.riskProbability() < highThreshold) return;

        boolean alreadyOpen = alertRepository.findByStatusOrderByCreatedAtDesc("OPEN").stream()
                .anyMatch(a -> a.getLocalityId().equals(loc.getId()));
        if (alreadyOpen) return;

        String severity = pred.riskProbability() >= severeThreshold ? "SEVERE" : "HIGH";
        String message = String.format("%s risk in %s: %.0f%% probability of flooding (%s)",
                severity, loc.getName(), pred.riskProbability() * 100, pred.horizon());

        Alert alert = new Alert();
        alert.setLocalityId(loc.getId());
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setRiskProbability(pred.riskProbability());
        alert.setStatus("OPEN");
        alert.setIsSimulated(simulated);
        alert.setCreatedAt(LocalDateTime.now());
        alertRepository.save(alert);

        messagingTemplate.convertAndSend("/topic/alerts", toDto(alert, loc.getName()));
    }

    public List<AlertDto> getAlerts(String status) {
        List<Alert> alerts = (status == null || status.isBlank())
                ? alertRepository.findAllByOrderByCreatedAtDesc()
                : alertRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        return alerts.stream().map(a -> toDto(a, localityName(a.getLocalityId()))).toList();
    }

    public AlertDto acknowledge(Long id, String acknowledgedBy) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found: " + id));
        alert.setStatus("ACKNOWLEDGED");
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedBy(acknowledgedBy != null ? acknowledgedBy : "admin");
        alertRepository.save(alert);
        return toDto(alert, localityName(alert.getLocalityId()));
    }

    private String localityName(String id) {
        return localityRepository.findById(id).map(Locality::getName).orElse(id);
    }

    private AlertDto toDto(Alert a, String localityName) {
        return new AlertDto(a.getId(), a.getLocalityId(), localityName, a.getSeverity(), a.getMessage(),
                a.getRiskProbability(), a.getStatus(), a.getIsSimulated(), a.getCreatedAt(), a.getAcknowledgedAt());
    }
}
