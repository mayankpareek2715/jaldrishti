package com.jaldrishti.repository;

import com.jaldrishti.entity.RiskPrediction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RiskPredictionRepository extends JpaRepository<RiskPrediction, Long> {
    Optional<RiskPrediction> findFirstByLocalityIdAndHorizonAndIsSimulatedFalseOrderByPredictedAtDesc(
            String localityId, String horizon);

    List<RiskPrediction> findByLocalityIdOrderByPredictedAtDesc(String localityId);
}
