package com.restspotfinder.logging.util;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SensitiveDataMasker {

    private static final Map<String, String> SENSITIVE_PATTERNS = Map.of(
            "password", "****",
            "token", "****"
    );

    public String maskSensitiveData(String data) {
        String maskedData = data;

        for (Map.Entry<String, String> entry : SENSITIVE_PATTERNS.entrySet()) {
            // JSON 필드 마스킹 패턴
            String pattern = "\"" + entry.getKey() + "\"\\s*:\\s*\"[^\"]*\"";
            String replacement = "\"" + entry.getKey() + "\":\"" + entry.getValue() + "\"";
            maskedData = maskedData.replaceAll(pattern, replacement);

            // JWT Bearer 토큰 마스킹 (부분 마스킹)
            if ("token".equals(entry.getKey())) {
                maskedData = maskedData.replaceAll(
                        "Bearer\\s+([A-Za-z0-9\\-_.]{20})[A-Za-z0-9\\-_.]*",
                        "Bearer $1****"
                );
            }
        }

        return maskedData;
    }

    public String maskPassword(String password) {
        if (password == null || password.length() <= 4) {
            return "****";
        }
        return password.substring(0, Math.min(4, password.length())) + "****";
    }

    public String maskJwtToken(String token) {
        if (token == null || token.length() <= 20) {
            return "****";
        }
        return token.substring(0, 20) + "****";
    }
}