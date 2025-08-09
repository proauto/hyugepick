package com.restspotfinder.domain.fuel.controller;

import com.restspotfinder.domain.fuel.entity.FuelStation;
import com.restspotfinder.domain.fuel.service.FuelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class FuelController {

    private final FuelService fuelService;

    @GetMapping("/api/fuel")
    public ResponseEntity<?> getAll() {
        List<FuelStation> responses = fuelService.getAll();

        return ResponseEntity.ok(responses);
    }

    @PutMapping("/api/fuel")
    public ResponseEntity<?> updateFuelStations() {
        fuelService.updateFuelStationsFromApi();

        return ResponseEntity.ok().build();
    }
}
