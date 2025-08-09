package com.restspotfinder.logging.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class LogDataBuilder {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RequestInfoExtractor requestInfoExtractor;
    private final SensitiveDataMasker sensitiveDataMasker;

    @Value("${app.logging.request.slow-threshold:3000}")
    private long slowThreshold;

    // 성공 요청 로그
    public Map<String, Object> buildAccessLog(ContentCachingRequestWrapper request, long duration, int status) {
        Map<String, Object> logData = buildBaseLog(request, duration, status);
        return logData;
    }

    // 클라이언트 에러 로그 (4xx)
    public Map<String, Object> buildClientErrorLog(ContentCachingRequestWrapper request, long duration, int status) {
        Map<String, Object> logData = buildBaseLog(request, duration, status);
        addUserAgent(logData, request);
        return logData;
    }

    // 서버 에러 로그 (5xx)
    public Map<String, Object> buildServerErrorLog(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, long duration, int status) {
        Map<String, Object> logData = buildBaseLog(request, duration, status);
        logData.put("errorType", "SERVER_ERROR");
        addUserAgent(logData, request);
        addRequestHeaders(logData, request);
        addRequestBody(logData, request);
        addResponseBody(logData, response);
        return logData;
    }

    // 느린 요청 로그
    public Map<String, Object> buildSlowRequestLog(ContentCachingRequestWrapper request, long duration, int status) {
        Map<String, Object> logData = buildBaseLog(request, duration, status);
        logData.put("threshold", slowThreshold + "ms");
        return logData;
    }

    // 예외 로그
    public Map<String, Object> buildExceptionLog(ContentCachingRequestWrapper request, Exception e, long duration) {
        Map<String, Object> logData = new LinkedHashMap<>();
        logData.put("requestId", MDC.get("requestId"));
        logData.put("method", request.getMethod());
        logData.put("uri", request.getRequestURI());
        logData.put("timestamp", LocalDateTime.now());
        logData.put("duration", duration + "ms");
        logData.put("exception", e.getClass().getSimpleName());
        logData.put("message", e.getMessage());
        logData.put("clientIp", requestInfoExtractor.getClientIp(request));

        return logData;
    }

    // JSON 변환
    public String toJson(Map<String, Object> logData) {
        try {
            return objectMapper.writeValueAsString(logData);
        } catch (Exception e) {
            return logData.toString();
        }
    }

    // ===== Private Methods =====

    private Map<String, Object> buildBaseLog(ContentCachingRequestWrapper request, long duration, int status) {
        Map<String, Object> logData = new LinkedHashMap<>();
        logData.put("timestamp", LocalDateTime.now());
        logData.put("method", request.getMethod());
        logData.put("uri", request.getRequestURI());
        String queryString = request.getQueryString();
        if (queryString != null) {
            try {
                String decoded = URLDecoder.decode(queryString, StandardCharsets.UTF_8);
                logData.put("queryParams", decoded);
            } catch (Exception e) {
                logData.put("queryParams", queryString);
            }
        }
        logData.put("requestId", MDC.get("requestId"));
        logData.put("clientIp", requestInfoExtractor.getClientIp(request));
        logData.put("status", status);
        logData.put("duration", duration + "ms");
        return logData;
    }

    private void addQueryParams(Map<String, Object> logData, ContentCachingRequestWrapper request) {
        String queryString = request.getQueryString();
        if (queryString != null) {
            logData.put("queryParams", queryString);
        }
    }

    private void addUserAgent(Map<String, Object> logData, ContentCachingRequestWrapper request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null) {
            logData.put("userAgent", requestInfoExtractor.maskUserAgent(userAgent));
        }
    }

    private void addRequestHeaders(Map<String, Object> logData, ContentCachingRequestWrapper request) {
        Map<String, String> headers = requestInfoExtractor.getSafeHeaders(request);
        logData.put("requestHeaders", headers);
    }

    private void addRequestBody(Map<String, Object> logData, ContentCachingRequestWrapper request) {
        String requestBody = requestInfoExtractor.getRequestBody(request);
        if (requestBody != null) {
            logData.put("requestBody", sensitiveDataMasker.maskSensitiveData(requestBody));
        }
    }

    private void addResponseBody(Map<String, Object> logData, ContentCachingResponseWrapper response) {
        String responseBody = requestInfoExtractor.getResponseBody(response);
        if (responseBody != null) {
            logData.put("responseBody", responseBody);
        }
    }
}