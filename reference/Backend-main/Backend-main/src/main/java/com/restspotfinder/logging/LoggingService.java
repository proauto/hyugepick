package com.restspotfinder.logging;

import com.restspotfinder.logging.util.LogDataBuilder;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class LoggingService {

    private static final Logger ACCESS_LOG = LoggerFactory.getLogger("ACCESS");
    private static final Logger ERROR_LOG = LoggerFactory.getLogger("ERROR");
    private static final Logger SLOW_LOG = LoggerFactory.getLogger("SLOW");

    private final LogDataBuilder logDataBuilder;

    public void logAccess(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, long duration, int status) {
        try {
            Map<String, Object> logData = logDataBuilder.buildAccessLog(request, duration, status);
            ACCESS_LOG.info("{}", logDataBuilder.toJson(logData));
        } catch (Exception e) {
            ACCESS_LOG.warn("Failed to log access: {}", e.getMessage());
        }
    }

    public void logClientError(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, long duration, int status) {
        try {
            Map<String, Object> logData = logDataBuilder.buildClientErrorLog(request, duration, status);
            ERROR_LOG.warn("{}", logDataBuilder.toJson(logData));
        } catch (Exception e) {
            ERROR_LOG.warn("Failed to log client error: {}", e.getMessage());
        }
    }

    public void logServerError(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, long duration, int status) {
        try {
            Map<String, Object> logData = logDataBuilder.buildServerErrorLog(request, response, duration, status);
            ERROR_LOG.error("{}", logDataBuilder.toJson(logData));
        } catch (Exception e) {
            ERROR_LOG.warn("Failed to log server error: {}", e.getMessage());
        }
    }

    public void logSlowRequest(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, long duration, int status) {
        try {
            Map<String, Object> logData = logDataBuilder.buildSlowRequestLog(request, duration, status);
            SLOW_LOG.warn("{}", logDataBuilder.toJson(logData));
        } catch (Exception e) {
            SLOW_LOG.warn("Failed to log slow request: {}", e.getMessage());
        }
    }

    public void logException(ContentCachingRequestWrapper request, Exception e, long duration) {
        try {
            Map<String, Object> logData = logDataBuilder.buildExceptionLog(request, e, duration);
            ERROR_LOG.error("{}", logDataBuilder.toJson(logData));
            ERROR_LOG.error("Exception stacktrace:", e);
        } catch (Exception ex) {
            ERROR_LOG.warn("Failed to log exception: {}", ex.getMessage());
        }
    }
}