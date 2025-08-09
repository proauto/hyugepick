package com.restspotfinder.domain.fuel.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelUpdateHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Boolean isSuccess;
    private Integer updatedCount;
    private LocalDateTime updateStartedAt;

    public static FuelUpdateHistory create(Boolean isSuccess, Integer updatedCount) {
        return FuelUpdateHistory.builder()
                .isSuccess(isSuccess)
                .updatedCount(updatedCount)
                .updateStartedAt(LocalDateTime.now())
                .build();
    }
}
