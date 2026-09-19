package com.jaldrishti.repository;

import com.jaldrishti.entity.RainfallReading;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RainfallReadingRepository extends JpaRepository<RainfallReading, Long> {
    Optional<RainfallReading> findFirstByLocalityIdOrderByReadingTimeDesc(String localityId);
}
