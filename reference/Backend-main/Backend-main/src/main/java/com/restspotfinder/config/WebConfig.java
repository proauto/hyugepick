package com.restspotfinder.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173","https://www.restspotfinder.kr","https://restspotfinder.kr")
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
//                .exposedHeaders("Custom-Header") // 클라이언트가 해당 Header에 접근하는 걸 허용
                .allowCredentials(true)
                .maxAge(86400);
    }
}