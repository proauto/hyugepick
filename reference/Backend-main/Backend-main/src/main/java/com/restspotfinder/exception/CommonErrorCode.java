package com.restspotfinder.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 공통 에러 코드
 * 전역적으로 사용되는 일반적인 에러 코드들
 */
@Getter
@RequiredArgsConstructor
public enum CommonErrorCode implements ErrorCode {

    // 400 - Bad Request
    VALIDATION_FAILED("VALIDATION_FAILED", "입력값 검증에 실패했습니다.", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST_FORMAT("INVALID_REQUEST_FORMAT", "잘못된 요청 형식입니다.", HttpStatus.BAD_REQUEST),
    MISSING_REQUIRED_PARAMETER("MISSING_REQUIRED_PARAMETER", "필수 파라미터가 누락되었습니다.", HttpStatus.BAD_REQUEST),

    // 401 - Unauthorized
    UNAUTHORIZED("UNAUTHORIZED", "인증이 필요합니다.", HttpStatus.UNAUTHORIZED),

    // 403 - Forbidden
    ACCESS_DENIED("ACCESS_DENIED", "접근이 거부되었습니다.", HttpStatus.FORBIDDEN),

    // 404 - Not Found
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),

    // 409 - Conflict
    DUPLICATE_RESOURCE("DUPLICATE_RESOURCE", "중복된 리소스입니다.", HttpStatus.CONFLICT),

    // 429 - Too Many Requests
    TOO_MANY_REQUESTS("TOO_MANY_REQUESTS", "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS),

    // 500 - Internal Server Error
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", HttpStatus.INTERNAL_SERVER_ERROR),
    DATABASE_ERROR("DATABASE_ERROR", "데이터베이스 오류가 발생했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    EXTERNAL_API_ERROR("EXTERNAL_API_ERROR", "외부 서비스 연동 중 오류가 발생했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),

    // 503 - Service Unavailable
    SERVICE_UNAVAILABLE("SERVICE_UNAVAILABLE", "서비스를 일시적으로 사용할 수 없습니다.", HttpStatus.SERVICE_UNAVAILABLE);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}