package com.restspotfinder.domain.apicount.error;

import com.restspotfinder.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum ApiCountErrorCode implements ErrorCode {
    PLACE_API_CALL_LIMIT_EXCEEDED("PLACE_API_CALL_LIMIT_EXCEEDED", "Place API 호출 한도를 초과했습니다.", HttpStatus.TOO_MANY_REQUESTS),
    ROUTE_API_CALL_LIMIT_EXCEEDED("ROUTE_API_CALL_LIMIT_EXCEEDED", "Route API 호출 한도를 초과했습니다.", HttpStatus.TOO_MANY_REQUESTS);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}