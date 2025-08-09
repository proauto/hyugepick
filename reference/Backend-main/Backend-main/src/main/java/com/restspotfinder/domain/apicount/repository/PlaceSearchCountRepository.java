package com.restspotfinder.domain.apicount.repository;

import com.restspotfinder.domain.apicount.entity.PlaceSearchCount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Optional;

public interface PlaceSearchCountRepository extends JpaRepository<PlaceSearchCount, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM PlaceSearchCount c WHERE c.createdAt = :today")
    Optional<PlaceSearchCount> findByDateWithPessimisticLock(LocalDate today);
}