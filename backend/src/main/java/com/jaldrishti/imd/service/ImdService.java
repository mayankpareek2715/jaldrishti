package com.jaldrishti.imd.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jaldrishti.imd.client.ImdClient;
import com.jaldrishti.imd.config.ImdCityMapping;
import com.jaldrishti.imd.config.ImdProperties;
import com.jaldrishti.imd.dto.*;
import com.jaldrishti.imd.mapper.ImdResponseMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImdService {

    private final ImdClient client;
    private final ImdResponseMapper mapper;
    private final ImdCacheService cache;
    private final ImdCityMapping cityMapping;
    private final ImdProperties properties;

    // Track health diagnostics
    private volatile String lastSuccessfulFetchTime = null;
    private volatile String lastErrorText = null;

    // Coalescing locks for concurrent requests
    private final ConcurrentHashMap<String, Object> locks = new ConcurrentHashMap<>();

    private static final DateTimeFormatter ISO_DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Retrieves normalized current weather with cache-first and stale-fallback strategy.
     */
    public Optional<ImdCurrentWeatherDto> getCurrentWeather(String city) {
        ImdCityMapping.CityMetadata meta = cityMapping.getMetadataOrDefault(city);
        String cacheKey = "current_wx:" + meta.getCityName().toLowerCase() + ":" + meta.getPrimaryStationId();

        // 1. Check cache
        Optional<ImdCacheService.CacheEntry<ImdCurrentWeatherDto>> cached = cache.get(cacheKey, ImdCurrentWeatherDto.class);
        if (cached.isPresent() && !cached.get().isExpired()) {
            ImdCurrentWeatherDto dto = cached.get().getData();
            dto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            dto.setIsStale(false);
            dto.setStatus("LIVE");
            return Optional.of(dto);
        }

        // 2. Coalesced fetch if IMD is configured
        synchronized (locks.computeIfAbsent(cacheKey, k -> new Object())) {
            // Double-check cache inside lock
            cached = cache.get(cacheKey, ImdCurrentWeatherDto.class);
            if (cached.isPresent() && !cached.get().isExpired()) {
                ImdCurrentWeatherDto dto = cached.get().getData();
                dto.setCacheAgeSeconds(cached.get().getAgeSeconds());
                dto.setIsStale(false);
                return Optional.of(dto);
            }

            if (properties.isImdConfigured() && !"mock".equalsIgnoreCase(properties.getProvider())) {
                try {
                    Optional<JsonNode> raw = client.fetchCurrentWeather(meta.getPrimaryStationId());
                    if (raw.isPresent()) {
                        Optional<ImdCurrentWeatherDto> mapped = mapper.mapCurrentWeather(raw.get(), meta);
                        if (mapped.isPresent()) {
                            ImdCurrentWeatherDto dto = mapped.get();
                            dto.setCacheAgeSeconds(0L);
                            dto.setIsStale(false);
                            dto.setStatus("LIVE");
                            cache.put(cacheKey, dto, properties.getCacheTtlCurrentWeatherSeconds());
                            lastSuccessfulFetchTime = LocalDateTime.now().format(ISO_DT);
                            lastErrorText = null;
                            return Optional.of(dto);
                        }
                    }
                } catch (Exception ex) {
                    lastErrorText = ex.getMessage();
                    log.error("Error fetching IMD current weather for {}: {}", city, ex.getMessage());
                }
            }
        }

        // 3. Stale cache fallback
        if (cached.isPresent()) {
            ImdCurrentWeatherDto staleDto = cached.get().getData();
            staleDto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            staleDto.setIsStale(true);
            staleDto.setStatus("STALE");
            return Optional.of(staleDto);
        }

        return Optional.empty();
    }

    /**
     * Retrieves normalized district nowcast.
     */
    public Optional<ImdNowcastDto> getNowcast(String city) {
        ImdCityMapping.CityMetadata meta = cityMapping.getMetadataOrDefault(city);
        String cacheKey = "nowcast:" + meta.getCityName().toLowerCase() + ":" + meta.getImdDistrict();

        Optional<ImdCacheService.CacheEntry<ImdNowcastDto>> cached = cache.get(cacheKey, ImdNowcastDto.class);
        if (cached.isPresent() && !cached.get().isExpired()) {
            ImdNowcastDto dto = cached.get().getData();
            dto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            dto.setIsStale(false);
            dto.setStatus("LIVE");
            return Optional.of(dto);
        }

        synchronized (locks.computeIfAbsent(cacheKey, k -> new Object())) {
            cached = cache.get(cacheKey, ImdNowcastDto.class);
            if (cached.isPresent() && !cached.get().isExpired()) {
                return Optional.of(cached.get().getData());
            }

            if (properties.isImdConfigured() && !"mock".equalsIgnoreCase(properties.getProvider())) {
                try {
                    Optional<JsonNode> raw = client.fetchDistrictNowcast();
                    if (raw.isPresent()) {
                        Optional<ImdNowcastDto> mapped = mapper.mapNowcast(raw.get(), meta);
                        if (mapped.isPresent()) {
                            ImdNowcastDto dto = mapped.get();
                            dto.setCacheAgeSeconds(0L);
                            dto.setIsStale(false);
                            dto.setStatus("LIVE");
                            cache.put(cacheKey, dto, properties.getCacheTtlNowcastSeconds());
                            lastSuccessfulFetchTime = LocalDateTime.now().format(ISO_DT);
                            return Optional.of(dto);
                        }
                    }
                } catch (Exception ex) {
                    lastErrorText = ex.getMessage();
                    log.error("Error fetching IMD nowcast for {}: {}", city, ex.getMessage());
                }
            }
        }

        if (cached.isPresent()) {
            ImdNowcastDto staleDto = cached.get().getData();
            staleDto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            staleDto.setIsStale(true);
            staleDto.setStatus("STALE");
            return Optional.of(staleDto);
        }

        return Optional.empty();
    }

    /**
     * Retrieves normalized district rainfall statistics.
     */
    public Optional<ImdRainfallDto> getRainfall(String city) {
        ImdCityMapping.CityMetadata meta = cityMapping.getMetadataOrDefault(city);
        String cacheKey = "rainfall:" + meta.getCityName().toLowerCase() + ":" + meta.getImdDistrict();

        Optional<ImdCacheService.CacheEntry<ImdRainfallDto>> cached = cache.get(cacheKey, ImdRainfallDto.class);
        if (cached.isPresent() && !cached.get().isExpired()) {
            ImdRainfallDto dto = cached.get().getData();
            dto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            dto.setIsStale(false);
            dto.setStatus("LIVE");
            return Optional.of(dto);
        }

        synchronized (locks.computeIfAbsent(cacheKey, k -> new Object())) {
            cached = cache.get(cacheKey, ImdRainfallDto.class);
            if (cached.isPresent() && !cached.get().isExpired()) {
                return Optional.of(cached.get().getData());
            }

            if (properties.isImdConfigured() && !"mock".equalsIgnoreCase(properties.getProvider())) {
                try {
                    Optional<JsonNode> raw = client.fetchDistrictRainfall();
                    if (raw.isPresent()) {
                        Optional<ImdRainfallDto> mapped = mapper.mapRainfall(raw.get(), meta);
                        if (mapped.isPresent()) {
                            ImdRainfallDto dto = mapped.get();
                            dto.setCacheAgeSeconds(0L);
                            dto.setIsStale(false);
                            dto.setStatus("LIVE");
                            cache.put(cacheKey, dto, properties.getCacheTtlRainfallSeconds());
                            lastSuccessfulFetchTime = LocalDateTime.now().format(ISO_DT);
                            return Optional.of(dto);
                        }
                    }
                } catch (Exception ex) {
                    lastErrorText = ex.getMessage();
                    log.error("Error fetching IMD rainfall for {}: {}", city, ex.getMessage());
                }
            }
        }

        if (cached.isPresent()) {
            ImdRainfallDto staleDto = cached.get().getData();
            staleDto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            staleDto.setIsStale(true);
            staleDto.setStatus("STALE");
            return Optional.of(staleDto);
        }

        return Optional.empty();
    }

    /**
     * Retrieves normalized district warnings.
     */
    public Optional<ImdWarningDto> getWarnings(String city) {
        ImdCityMapping.CityMetadata meta = cityMapping.getMetadataOrDefault(city);
        String cacheKey = "warnings:" + meta.getCityName().toLowerCase() + ":" + meta.getImdDistrict();

        Optional<ImdCacheService.CacheEntry<ImdWarningDto>> cached = cache.get(cacheKey, ImdWarningDto.class);
        if (cached.isPresent() && !cached.get().isExpired()) {
            ImdWarningDto dto = cached.get().getData();
            dto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            dto.setIsStale(false);
            dto.setStatus("LIVE");
            return Optional.of(dto);
        }

        synchronized (locks.computeIfAbsent(cacheKey, k -> new Object())) {
            cached = cache.get(cacheKey, ImdWarningDto.class);
            if (cached.isPresent() && !cached.get().isExpired()) {
                return Optional.of(cached.get().getData());
            }

            if (properties.isImdConfigured() && !"mock".equalsIgnoreCase(properties.getProvider())) {
                try {
                    Optional<JsonNode> raw = client.fetchDistrictWarning();
                    if (raw.isPresent()) {
                        Optional<ImdWarningDto> mapped = mapper.mapWarnings(raw.get(), meta);
                        if (mapped.isPresent()) {
                            ImdWarningDto dto = mapped.get();
                            dto.setCacheAgeSeconds(0L);
                            dto.setIsStale(false);
                            dto.setStatus("LIVE");
                            cache.put(cacheKey, dto, properties.getCacheTtlWarningsSeconds());
                            lastSuccessfulFetchTime = LocalDateTime.now().format(ISO_DT);
                            return Optional.of(dto);
                        }
                    }
                } catch (Exception ex) {
                    lastErrorText = ex.getMessage();
                    log.error("Error fetching IMD warnings for {}: {}", city, ex.getMessage());
                }
            }
        }

        if (cached.isPresent()) {
            ImdWarningDto staleDto = cached.get().getData();
            staleDto.setCacheAgeSeconds(cached.get().getAgeSeconds());
            staleDto.setIsStale(true);
            staleDto.setStatus("STALE");
            return Optional.of(staleDto);
        }

        return Optional.empty();
    }

    /**
     * Unified weather summary for a city.
     */
    public ImdWeatherSummaryDto getWeatherSummary(String city) {
        ImdCityMapping.CityMetadata meta = cityMapping.getMetadataOrDefault(city);
        Optional<ImdCurrentWeatherDto> current = getCurrentWeather(city);
        Optional<ImdNowcastDto> nowcast = getNowcast(city);
        Optional<ImdRainfallDto> rainfall = getRainfall(city);
        Optional<ImdWarningDto> warnings = getWarnings(city);

        boolean isStale = current.map(ImdCurrentWeatherDto::getIsStale).orElse(false);
        String lastUpdated = current.map(ImdCurrentWeatherDto::getObservedAt).orElse("Observation unavailable");

        return ImdWeatherSummaryDto.builder()
                .source(properties.isImdConfigured() ? "IMD" : "MOCK")
                .city(meta.getCityName())
                .district(meta.getImdDistrict())
                .fetchedAt(LocalDateTime.now().format(ISO_DT))
                .lastUpdatedText(lastUpdated)
                .isStale(isStale)
                .currentWeather(current.orElse(null))
                .nowcast(nowcast.orElse(null))
                .rainfall(rainfall.orElse(null))
                .warnings(warnings.orElse(null))
                .build();
    }

    /**
     * Health and diagnostics check for IMD provider.
     */
    public ImdHealthStatusDto getHealthStatus(String city) {
        boolean configured = properties.isImdConfigured();
        String status = !configured ? "DEGRADED" : (lastErrorText == null ? "UP" : "DEGRADED");

        return ImdHealthStatusDto.builder()
                .provider(configured ? "IMD" : "MOCK")
                .status(status)
                .configured(configured)
                .lastSuccessfulFetch(lastSuccessfulFetchTime)
                .lastError(lastErrorText)
                .cacheAvailable(cache.size() > 0)
                .cachedEntriesCount(cache.size())
                .build();
    }
}
