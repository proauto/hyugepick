package com.restspotfinder.common;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommonResponse(int code, String message, Object data) {
    public static CommonResponse from(ResponseCode responseCode) {
        return CommonResponse.builder()
                .code(responseCode.getCode())
                .message(responseCode.getMsg())
                .build();
    }
    public static CommonResponse of(ResponseCode responseCode, Object data) {
        return CommonResponse.builder()
                .code(responseCode.getCode())
                .message(responseCode.getMsg())
                .data(data)
                .build();
    }
}