package com.jaldrishti.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequestDto(
    @NotBlank(message = "Google ID Token is required")
    String idToken
) {}
