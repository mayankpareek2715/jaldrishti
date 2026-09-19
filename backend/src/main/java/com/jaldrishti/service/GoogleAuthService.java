package com.jaldrishti.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;

@Service
@Slf4j
public class GoogleAuthService {

    private final RestTemplate restTemplate;
    private final String expectedClientId;

    public GoogleAuthService(
            RestTemplate restTemplate,
            @Value("${jaldrishti.google.client-id:}") String expectedClientId) {
        this.restTemplate = restTemplate;
        this.expectedClientId = expectedClientId;
    }

    public record GoogleUserPayload(
        String googleId,
        String email,
        boolean emailVerified,
        String name,
        String picture
    ) {}

    public GoogleUserPayload verifyIdToken(String idToken) {
        try {
            // Google's official public tokeninfo endpoint
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);

            if (response == null || response.has("error_description") || response.has("error")) {
                String error = response != null ? response.path("error_description").asText() : "Empty response";
                log.warn("Google token verification failed: {}", error);
                throw new IllegalArgumentException("Invalid Google token: " + error);
            }

            // Verify issuer
            String iss = response.path("iss").asText();
            if (!"accounts.google.com".equals(iss) && !"https://accounts.google.com".equals(iss)) {
                log.warn("Invalid Google token issuer: {}", iss);
                throw new IllegalArgumentException("Invalid Google token issuer");
            }

            // Verify audience if configured
            if (expectedClientId != null && !expectedClientId.isBlank()) {
                String aud = response.path("aud").asText();
                if (!expectedClientId.equals(aud)) {
                    log.warn("Google token audience mismatch. Expected: {}, Got: {}", expectedClientId, aud);
                    throw new IllegalArgumentException("Google token audience mismatch");
                }
            }

            // Verify expiration
            long exp = response.path("exp").asLong(0);
            if (exp > 0 && exp < Instant.now().getEpochSecond()) {
                throw new IllegalArgumentException("Google token has expired");
            }

            // Verify email verified
            boolean emailVerified = response.path("email_verified").asBoolean(false) ||
                    "true".equalsIgnoreCase(response.path("email_verified").asText());
            if (!emailVerified) {
                throw new RuntimeException("Google email is not verified");
            }

            String googleId = response.path("sub").asText();
            String email = response.path("email").asText();
            String name = response.path("name").asText(email.split("@")[0]);
            String picture = response.path("picture").asText(null);

            return new GoogleUserPayload(googleId, email, true, name, picture);
        } catch (Exception e) {
            log.error("Google auth verification error: {}", e.getMessage());
            throw new RuntimeException("Google authentication failed: " + e.getMessage(), e);
        }
    }
}
