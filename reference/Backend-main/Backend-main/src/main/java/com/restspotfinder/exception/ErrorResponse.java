package com.restspotfinder.exception;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private String code;
    private String message;
    private String requestId;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    public static ErrorResponse of(String code, String message, String requestId) {
        return ErrorResponse.builder()
                .code(code)
                .message(message)
                .requestId(requestId)
                .timestamp(LocalDateTime.now())
                .build();
    }
}