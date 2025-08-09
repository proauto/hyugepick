package com.restspotfinder.domain.restarea.error;

import com.restspotfinder.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum RestAreaErrorCode implements ErrorCode {
    NOT_FOUND("RESTAREA_NOT_FOUND", "해당 휴게소를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    NAVER_MAP_URL_NOT_FOUND("NAVER_MAP_URL_NOT_FOUND", "네이버 지도 URL이 없습니다.", HttpStatus.BAD_REQUEST),
    DB_ERROR("RESTAREA_DB_ERROR", "휴게소 데이터베이스 오류가 발생했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    JSON_CONVERT_ERROR("RESTAREA_JSON_CONVERT_ERROR", "JSON을 RestArea 엔티티로 변환하는데 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
} 