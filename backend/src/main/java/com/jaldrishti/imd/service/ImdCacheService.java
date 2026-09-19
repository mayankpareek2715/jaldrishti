package com.jaldrishti.imd.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class ImdCacheService {

    public static class CacheEntry<T> {
        private final T data;
        private final long createdAtEpochMs;
        private final long ttlMs;

        public CacheEntry(T data, long ttlSeconds) {
            this.data = data;
            this.createdAtEpochMs = System.currentTimeMillis();
            this.ttlMs = Math.max(1, ttlSeconds) * 1000L;
        }

        public T getData() {
            return data;
        }

        public long getAgeSeconds() {
            return Math.max(0, (System.currentTimeMillis() - createdAtEpochMs) / 1000L);
        }

        public boolean isExpired() {
            return (System.currentTimeMillis() - createdAtEpochMs) >= ttlMs;
        }
    }

    private final Map<String, CacheEntry<?>> storage = new ConcurrentHashMap<>();

    public <T> void put(String key, T data, long ttlSeconds) {
        if (key == null || data == null) return;
        storage.put(key, new CacheEntry<>(data, ttlSeconds));
        log.debug("IMD Cache PUT: key='{}', TTL={}s", key, ttlSeconds);
    }

    @SuppressWarnings("unchecked")
    public <T> Optional<CacheEntry<T>> get(String key, Class<T> clazz) {
        CacheEntry<?> entry = storage.get(key);
        if (entry != null && clazz.isInstance(entry.getData())) {
            return Optional.of((CacheEntry<T>) entry);
        }
        return Optional.empty();
    }

    public boolean has(String key) {
        return storage.containsKey(key);
    }

    public void clear() {
        storage.clear();
    }

    public long size() {
        return storage.size();
    }
}