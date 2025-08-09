package com.restspotfinder.domain.route.error;

import com.restspotfinder.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum RouteErrorCode implements ErrorCode {
    NOT_FOUND("ROUTE_NOT_FOUND", "해당 경로를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    INVALID_ROUTE_LIST("ROUTE_INVALID_LIST", "routeList는 비어 있을 수 없습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
} 