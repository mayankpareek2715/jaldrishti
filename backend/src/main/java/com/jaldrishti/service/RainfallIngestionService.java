package com.jaldrishti.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.entity.RainfallReading;
import com.jaldrishti.repository.LocalityRepository;
import com.jaldrishti.repository.RainfallReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RainfallIngestionService {

    private final LocalityRepository localityRepository;
    private final RainfallReadingRepository rainfallReadingRepository;
    private final RestTemplate restTemplate;

    @Value("${jaldrishti.rainfall.live-enabled:true}")
    private boolean liveEnabled;

    @Scheduled(fixedRateString = "${jaldrishti.rainfall.poll-interval-ms:300000}")
    public void pollAllLocalities() {
        List<Locality> localities = localityRepository.findAll();
        for (Locality loc : localities) {
            RainfallReading reading = liveEnabled ? fetchFromOpenMeteo(loc) : null;
            if (reading == null || reading.getRain1hrMm() < 5.0) {
                reading = demoReading(loc);
            }
            reading.setLocalityId(loc.getId());
            reading.setReadingTime(LocalDateTime.now());
            rainfallReadingRepository.save(reading);
        }
        log.info("Rainfall ingestion cycle complete for {} localities.", localities.size());
    }

    private RainfallReading fetchFromOpenMeteo(Locality loc) {
        try {
            String url = String.format(
                    "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s" +
                            "&hourly=precipitation&past_days=3&forecast_days=1&timezone=auto",
                    loc.getCentroidLat(), loc.getCentroidLon());
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);
            if (response == null || !response.has("hourly")) return null;

            JsonNode precipArray = response.get("hourly").get("precipitation");
            int n = precipArray.size();
            double last1hr = precipArray.get(n - 1).asDouble(0);
            double last3hr = sumLast(precipArray, n, 3);
            double last3day = sumLast(precipArray, n, 72);
            double last7day = last3day * 1.6;

            RainfallReading r = new RainfallReading();
            r.setRain15minMm(last1hr / 4.0);
            r.setRain1hrMm(last1hr);
            r.setRain3hrMm(last3hr);
            r.setRain3dayCumMm(last3day);
            r.setRain7dayCumMm(last7day);
            r.setForecast13hrMm(0.0);
            r.setSource("open-meteo");
            return r;
        } catch (RestClientException e) {
            log.warn("Open-Meteo fetch failed for {} ({}); using demo fallback.", loc.getName(), e.getMessage());
            return null;
        }
    }

    private double sumLast(JsonNode array, int n, int hours) {
        double sum = 0;
        int start = Math.max(0, n - hours);
        for (int i = start; i < n; i++) sum += array.get(i).asDouble(0);
        return sum;
    }

    private RainfallReading demoReading(Locality loc) {
        RainfallReading r = new RainfallReading();
        double baseRain = 4.0;
        if (loc.getIsBbmpFloodProne() && loc.getHistoricalFloodFreq() >= 6) {
            baseRain = 45.0;
        } else if (loc.getIsBbmpFloodProne() && loc.getHistoricalFloodFreq() >= 4) {
            baseRain = 28.0;
        } else if (loc.getHistoricalFloodFreq() >= 2) {
            baseRain = 16.0;
        }

        r.setRain15minMm(baseRain / 4.0);
        r.setRain1hrMm(baseRain);
        r.setRain3hrMm(baseRain * 2.1);
        r.setRain3dayCumMm(baseRain * 4.2);
        r.setRain7dayCumMm(baseRain * 7.5);
        r.setForecast13hrMm(baseRain * 0.8);
        r.setSource("demo");
        return r;
    }
}
