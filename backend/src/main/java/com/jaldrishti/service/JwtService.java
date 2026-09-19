package com.jaldrishti.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jaldrishti.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class JwtService {

    private final String secret;
    private final long expirationMs;
    private final ObjectMapper objectMapper;

    public JwtService(
            @Value("${jaldrishti.jwt.secret:JalDrishtiUrbanFloodIntelligenceSecureSecretKey2026!}") String secret,
            @Value("${jaldrishti.jwt.expiration-ms:86400000}") long expirationMs,
            ObjectMapper objectMapper) {
        this.secret = secret;
        this.expirationMs = expirationMs;
        this.objectMapper = objectMapper;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public String generateToken(User user) {
        try {
            long now = Instant.now().getEpochSecond();
            long exp = now + (expirationMs / 1000);

            Map<String, Object> header = new HashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            Map<String, Object> payload = new HashMap<>();
            payload.put("sub", user.getEmail());
            payload.put("id", user.getId());
            payload.put("name", user.getFullName());
            payload.put("role", user.getRole());
            payload.put("iat", now);
            payload.put("exp", exp);

            String encodedHeader = base64UrlEncode(objectMapper.writeValueAsBytes(header));
            String encodedPayload = base64UrlEncode(objectMapper.writeValueAsBytes(payload));
            String content = encodedHeader + "." + encodedPayload;

            String signature = sign(content, secret);
            return content + "." + signature;
        } catch (Exception e) {
            log.error("Failed to generate JWT: {}", e.getMessage());
            throw new RuntimeException("Could not generate JWT token", e);
        }
    }

    public boolean validateToken(String token) {
        try {
            if (token == null || !token.contains(".")) return false;
            String[] parts = token.split("\\.");
            if (parts.length != 3) return false;

            String content = parts[0] + "." + parts[1];
            String signature = parts[2];

            String expectedSignature = sign(content, secret);
            if (!MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
                return false;
            }

            // Check expiration
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            Map<String, Object> claims = objectMapper.readValue(payloadBytes, Map.class);
            Number exp = (Number) claims.get("exp");
            if (exp != null && exp.longValue() < Instant.now().getEpochSecond()) {
                return false;
            }

            return true;
        } catch (Exception e) {
            log.warn("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    public String extractEmail(String token) {
        try {
            String[] parts = token.split("\\.");
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            Map<String, Object> claims = objectMapper.readValue(payloadBytes, Map.class);
            return (String) claims.get("sub");
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String data, String key) throws Exception {
        Mac hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        hmac.init(secretKey);
        byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return base64UrlEncode(hash);
    }

    private String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
