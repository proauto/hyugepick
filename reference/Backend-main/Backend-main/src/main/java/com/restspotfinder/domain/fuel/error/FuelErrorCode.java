package com.restspotfinder.domain.fuel.error;

import com.restspotfinder.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum FuelErrorCode implements ErrorCode {
    NOT_FOUND("FUEL_NOT_FOUND", "해당 주유소를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    API_DATA_EMPTY("FUEL_API_DATA_EMPTY", "API에서 가져온 주유소 데이터가 비어있습니다.", HttpStatus.BAD_REQUEST),
    UPDATE_FAILED("FUEL_UPDATE_FAILED", "주유소 가격 데이터 업데이트에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
