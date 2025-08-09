package com.restspotfinder.domain.apicount.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Getter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteSearchCount {
    @Id
    private LocalDate createdAt;
    private int naverCount;

    public static RouteSearchCount init(LocalDate date){
        return RouteSearchCount.builder()
                .naverCount(0)
                .createdAt(date)
                .build();
    }

    public void increase(){
        ++naverCount;
    }
}