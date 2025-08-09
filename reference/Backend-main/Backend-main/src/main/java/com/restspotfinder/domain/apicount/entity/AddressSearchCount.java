package com.restspotfinder.domain.apicount.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.*;

import java.time.LocalDate;

@Getter
@Entity
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class AddressSearchCount {
    @Id
    private LocalDate createdAt;
    private long naverCount;

    public static AddressSearchCount init(LocalDate date){
        return AddressSearchCount.builder()
                .createdAt(date)
                .naverCount(0)
                .build();
    }

    public void increase(){
        ++naverCount;
    }
}
