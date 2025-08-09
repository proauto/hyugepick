package com.restspotfinder.domain.place.error;

import com.restspotfinder.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum PlaceErrorCode implements ErrorCode {
    EXTERNAL_API_ERROR("PLACE_EXTERNAL_API_ERROR", "외부 API 호출 중 오류가 발생했습니다.", HttpStatus.BAD_GATEWAY);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
} 