package com.restspotfinder.logging;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LoggingFilter implements Filter {

    private final LoggingService loggingService;

    @Value("${app.logging.request.slow-threshold:3000}")
    private long slowThreshold;

    // 로그 제외할 경로들
    private static final Set<String> EXCLUDED_PATHS = Set.of("/health", "/actuator", "/favicon.ico", "/swagger-ui", "/v3/api-docs");

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String requestUri = httpRequest.getRequestURI();

        // 제외 경로 체크
        if (EXCLUDED_PATHS.stream().anyMatch(requestUri::startsWith)) {
            chain.doFilter(request, response);
            return;
        }

        // 요청 ID 생성 및 MDC 설정
        String requestId = UUID.randomUUID().toString().substring(0, 12);
        MDC.put("requestId", requestId);
        MDC.put("method", httpRequest.getMethod());
        MDC.put("uri", requestUri);

        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(httpRequest);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(httpResponse);

        long startTime = System.currentTimeMillis();

        try {
            chain.doFilter(wrappedRequest, wrappedResponse);

            long duration = System.currentTimeMillis() - startTime;
            int status = wrappedResponse.getStatus();

            if (status >= 500) {
                loggingService.logServerError(wrappedRequest, wrappedResponse, duration, status);
            } else if (status >= 400) {
                loggingService.logClientError(wrappedRequest, wrappedResponse, duration, status);
            } else {
                loggingService.logAccess(wrappedRequest, wrappedResponse, duration, status);

                if (duration > slowThreshold) {
                    loggingService.logSlowRequest(wrappedRequest, wrappedResponse, duration, status);
                }
            }
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            loggingService.logException(wrappedRequest, e, duration);
            throw e;
        } finally {
            wrappedResponse.copyBodyToResponse();
            MDC.clear();
        }
    }
}