package com.restspotfinder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication(scanBasePackages = {"com.restspotfinder", "com.log_module", "com.exception_module"})
public class RestSpotFinderApplication {

    public static void main(String[] args) {
        SpringApplication.run(RestSpotFinderApplication.class, args);
    }

}
