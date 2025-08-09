package com.restspotfinder.domain.fuel.repository;

import com.restspotfinder.domain.fuel.entity.FuelStation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FuelStationRepository extends JpaRepository<FuelStation, String> {
    Optional<FuelStation> findByServiceAreaName(String serviceAreaName);
}
