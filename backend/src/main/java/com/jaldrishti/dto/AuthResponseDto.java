package com.jaldrishti.dto;

public record AuthResponseDto(
    String token,
    String tokenType,
    long expiresIn,
    UserDto user
) {
    public AuthResponseDto(String token, long expiresIn, UserDto user) {
        this(token, "Bearer", expiresIn, user);
    }
}
