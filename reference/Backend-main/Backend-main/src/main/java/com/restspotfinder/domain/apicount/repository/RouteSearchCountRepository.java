package com.restspotfinder.domain.apicount.repository;

import com.restspotfinder.domain.apicount.entity.RouteSearchCount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Optional;

public interface RouteSearchCountRepository extends JpaRepository<RouteSearchCount, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM RouteSearchCount c WHERE c.createdAt = :startOfMonth")
    Optional<RouteSearchCount> findByDateWithPessimisticLock(LocalDate startOfMonth);
}