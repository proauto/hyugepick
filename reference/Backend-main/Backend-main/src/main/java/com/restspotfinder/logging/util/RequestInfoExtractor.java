package com.restspotfinder.logging.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Component
public class RequestInfoExtractor {

    @Value("${app.logging.request.max-body-size:10000}")
    private int maxBodySize;

    public String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public String maskUserAgent(String userAgent) {
        if (userAgent == null) return null;
        return userAgent.length() > 100 ? userAgent.substring(0, 100) + "..." : userAgent;
    }

    public Map<String, String> getSafeHeaders(HttpServletRequest request) {
        Map<String, String> headers = new HashMap<>();
        Set<String> excludeHeaders = Set.of("authorization", "cookie", "x-api-key");

        Collections.list(request.getHeaderNames()).forEach(name -> {
            if (!excludeHeaders.contains(name.toLowerCase())) {
                headers.put(name, request.getHeader(name));
            }
        });
        return headers;
    }

    public String getRequestBody(ContentCachingRequestWrapper request) {
        try {
            byte[] content = request.getContentAsByteArray();
            if (content.length > 0 && content.length < maxBodySize) {
                String contentType = request.getContentType();
                if (contentType != null && contentType.contains("application/json")) {
                    return new String(content);
                }
            }
        } catch (Exception e) {
            // 무시
        }
        return null;
    }

    public String getResponseBody(ContentCachingResponseWrapper response) {
        try {
            byte[] content = response.getContentAsByteArray();
            if (content.length > 0 && content.length < maxBodySize) {
                String contentType = response.getContentType();
                if (contentType != null && contentType.contains("application/json")) {
                    return new String(content);
                }
            }
        } catch (Exception e) {
            // 무시
        }
        return null;
    }
}