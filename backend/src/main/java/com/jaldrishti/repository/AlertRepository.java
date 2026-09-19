package com.jaldrishti.repository;

import com.jaldrishti.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByStatusOrderByCreatedAtDesc(String status);
    List<Alert> findAllByOrderByCreatedAtDesc();
}
