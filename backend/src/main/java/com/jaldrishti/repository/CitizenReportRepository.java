package com.jaldrishti.repository;

import com.jaldrishti.entity.CitizenReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CitizenReportRepository extends JpaRepository<CitizenReport, Long> {
    List<CitizenReport> findByCityOrderByIdDesc(String city);
    List<CitizenReport> findByCityOrderByCreatedAtDesc(String city);
    List<CitizenReport> findByLocalityIdOrderByIdDesc(String localityId);
    List<CitizenReport> findAllByOrderByIdDesc();
}
