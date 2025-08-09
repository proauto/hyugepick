package com.restspotfinder.domain.route.repository;

import com.restspotfinder.domain.route.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Long> {
    List<Route> findBySearchId(long searchId);
}