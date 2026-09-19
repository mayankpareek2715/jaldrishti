package com.jaldrishti.service;

import com.jaldrishti.dto.*;
import com.jaldrishti.entity.User;
import com.jaldrishti.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoderService passwordEncoder;
    private final JwtService jwtService;
    private final GoogleAuthService googleAuthService;

    @Transactional
    public AuthResponseDto register(RegisterRequestDto req) {
        String normalizedEmail = req.email().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setFullName(req.fullName().trim());
        user.setRole("ROLE_USER");
        user.setAuthProvider("LOCAL");
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved);

        return new AuthResponseDto(token, jwtService.getExpirationMs(), UserDto.fromEntity(saved));
    }

    public AuthResponseDto login(LoginRequestDto req) {
        String normalizedEmail = req.email().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (user.getPasswordHash() == null) {
            throw new IllegalArgumentException("This account was created with Google Sign-In. Please click 'Continue with Google'");
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponseDto(token, jwtService.getExpirationMs(), UserDto.fromEntity(user));
    }

    @Transactional
    public AuthResponseDto googleLogin(GoogleLoginRequestDto req) {
        var googleUser = googleAuthService.verifyIdToken(req.idToken());
        String normalizedEmail = googleUser.email().trim().toLowerCase();

        // Check if user exists by email or by googleId
        var existingUserOpt = userRepository.findByEmail(normalizedEmail)
                .or(() -> userRepository.findByGoogleId(googleUser.googleId()));

        User user;
        if (existingUserOpt.isPresent()) {
            // Case 2 & 3: Link or update existing account
            user = existingUserOpt.get();
            user.setGoogleId(googleUser.googleId());

            if ("LOCAL".equals(user.getAuthProvider())) {
                user.setAuthProvider("BOTH"); // Linked account
                log.info("Linked Google account to existing user: {}", normalizedEmail);
            }

            if (user.getAvatarUrl() == null && googleUser.picture() != null) {
                user.setAvatarUrl(googleUser.picture());
            }
            if ((user.getFullName() == null || user.getFullName().isBlank()) && googleUser.name() != null) {
                user.setFullName(googleUser.name());
            }
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
        } else {
            // Case 1: Brand new Google user
            user = new User();
            user.setEmail(normalizedEmail);
            user.setFullName(googleUser.name());
            user.setAvatarUrl(googleUser.picture());
            user.setGoogleId(googleUser.googleId());
            user.setRole("ROLE_USER");
            user.setAuthProvider("GOOGLE");
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());

            user = userRepository.save(user);
            log.info("Created new user via Google Sign-In: {}", normalizedEmail);
        }

        String token = jwtService.generateToken(user);
        return new AuthResponseDto(token, jwtService.getExpirationMs(), UserDto.fromEntity(user));
    }

    public UserDto getCurrentUser(String token) {
        if (token == null || !jwtService.validateToken(token)) {
            throw new IllegalArgumentException("Invalid or expired session token");
        }
        String email = jwtService.extractEmail(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserDto.fromEntity(user);
    }
}
