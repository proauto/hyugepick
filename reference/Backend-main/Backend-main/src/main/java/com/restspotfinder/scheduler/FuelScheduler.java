package com.restspotfinder.scheduler;

import com.restspotfinder.domain.fuel.service.FuelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class FuelScheduler {
    private final FuelService fuelService;

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    public void updateFuelStationDaily() {
        fuelService.updateFuelStationsFromApi();
    }
}
