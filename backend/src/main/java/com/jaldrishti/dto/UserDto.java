package com.jaldrishti.dto;

import com.jaldrishti.entity.User;

public record UserDto(
    Long id,
    String email,
    String fullName,
    String avatarUrl,
    String role,
    String authProvider
) {
    public static UserDto fromEntity(User user) {
        return new UserDto(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getAvatarUrl(),
            user.getRole(),
            user.getAuthProvider()
        );
    }
}
