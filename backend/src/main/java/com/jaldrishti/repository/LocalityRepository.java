package com.jaldrishti.repository;

import com.jaldrishti.entity.Locality;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocalityRepository extends JpaRepository<Locality, String> {
    java.util.List<Locality> findByCityIgnoreCase(String city);
}
