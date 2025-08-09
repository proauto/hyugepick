package com.restspotfinder.domain.notice.dto;

import jakarta.validation.constraints.NotNull;

public record NoticeCreate(
        @NotNull String title,
        @NotNull String content
) {
}