package com.jaldrishti.repository;

import com.jaldrishti.entity.HistoricalEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HistoricalEventRepository extends JpaRepository<HistoricalEvent, Long> {
    List<HistoricalEvent> findByLocalityIdOrderByEventDateDesc(String localityId);
}
