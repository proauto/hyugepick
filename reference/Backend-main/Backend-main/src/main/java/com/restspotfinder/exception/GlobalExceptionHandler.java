package com.restspotfinder.exception;

import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;


/**
 * 예외를 공통으로 처리
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * BusinessException 처리
     * 비즈니스 로직에서 발생하는 예외
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        String code = e.getErrorCode().getCode();
        String message = e.getErrorCode().getMessage();
        String requestId = MDC.get("requestId");
        ErrorResponse errorResponse = ErrorResponse.of(code, message, requestId);

        return ResponseEntity
                .status(e.getErrorCode().getHttpStatus())
                .body(errorResponse);
    }

    /**
     * Validation 예외 처리
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException e) {
        String code = CommonErrorCode.VALIDATION_FAILED.getCode();
        String message = e.getBindingResult().getFieldErrors().get(0).getDefaultMessage();
        String requestId = MDC.get("requestId");
        ErrorResponse errorResponse = ErrorResponse.of(code, message, requestId);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(errorResponse);
    }

    /**
     * 예상치 못한 시스템 예외 처리
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(Exception e) {
        e.printStackTrace();

        String code = CommonErrorCode.INTERNAL_SERVER_ERROR.getCode();
        String message = CommonErrorCode.INTERNAL_SERVER_ERROR.getMessage();
        String requestId = MDC.get("requestId");
        ErrorResponse errorResponse = ErrorResponse.of(code, message, requestId);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorResponse);
    }
}