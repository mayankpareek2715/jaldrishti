package com.jaldrishti.config;

import com.jaldrishti.repository.LocalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final LocalityRepository localityRepository;
    private final DataSource dataSource;
    private final com.jaldrishti.service.RainfallIngestionService rainfallIngestionService;

    @Override
    public void run(String... args) {
        if (localityRepository.count() == 0) {
            log.info("Empty database detected. Seeding GIS localities, historical flood events, and initial citizen reports...");
            try {
                ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource("seed_data.sql"));
                populator.setIgnoreFailedDrops(true);
                populator.setContinueOnError(true);
                populator.execute(dataSource);
                log.info("Database seeding complete! Seeded {} localities.", localityRepository.count());
            } catch (Exception e) {
                log.error("Failed to seed initial database: {}", e.getMessage());
            }
        }
        try {
            rainfallIngestionService.pollAllLocalities();
        } catch (Exception e) {
            log.warn("Initial rainfall ingestion failed: {}", e.getMessage());
        }
    }
}