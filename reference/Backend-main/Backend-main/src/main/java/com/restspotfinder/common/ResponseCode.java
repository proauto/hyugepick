package com.restspotfinder.common;

import lombok.Getter;

@Getter
public enum ResponseCode {
    SUCCESS(200, "SUCCESS"),
    COMPLETE_NO_RESULTS(201, "EXECUTION COMPLETE, NO RESULTS FOUND"),

    PARAM_ERROR(301, "PARAM_ERROR"),
    DB_ERROR(302, "DB_ERROR"),
    API_CALL_LIMIT_ERROR(303, "API_CALL_LIMIT_ERROR"),

    OUT_OF_RANGE(400, "OUT_OF_RANGE"),
    UNAUTHORIZED(401, "UNAUTHORIZED"),
    FORBIDDEN(403, "FORBIDDEN"),
    ACCESS_DENIED(403, "ACCESS_DENIED"),
    LIMIT_EXCEEDED(403, "LIMIT_EXCEEDED"),
    NOT_FOUND(404, "NOT_FOUND"),
    RESOURCE_NOT_EXIST(404, "RESOURCE_NOT_EXIST"),

    INTERNAL_SERVER_ERROR(500, "INTERNAL_SERVER_ERROR "),
    SERVICE_UNAVAILABLE(503, "SERVICE_UNAVAILABLE"),

    UNKNOWN_ERROR(1001, "UNKNOWN_ERROR"),
    DUPLICATE_ERROR(1002, "DUPLICATE_ERROR");

    private final Integer code;
    private final String msg;

    ResponseCode(Integer code, String msg) {
        this.code = code;
        this.msg = msg;
    }
}