package com.restspotfinder.domain.fuel.repository;

import com.restspotfinder.domain.fuel.entity.FuelUpdateHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FuelUpdateHistoryRepository extends JpaRepository<FuelUpdateHistory, Long> {
    Optional<FuelUpdateHistory> findFirstByIsSuccessTrueOrderByUpdateStartedAtDesc();
}
