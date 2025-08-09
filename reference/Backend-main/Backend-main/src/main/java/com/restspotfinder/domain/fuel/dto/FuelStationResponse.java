package com.restspotfinder.domain.fuel.dto;

import com.restspotfinder.domain.fuel.entity.FuelStation;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FuelStationResponse {

    private String serviceAreaName;
    private String gasolinePrice;
    private String diselPrice;
    private String lpgPrice;
    private String oilCompany;
    private String telNo;

    public static FuelStationResponse from(FuelStation station) {
        return FuelStationResponse.builder()
                .serviceAreaName(station.getServiceAreaName())
                .gasolinePrice(station.getGasolinePrice())
                .diselPrice(station.getDiselPrice())
                .lpgPrice(station.getLpgPrice())
                .oilCompany(station.getOilCompany())
                .telNo(station.getTelNo())
                .build();
    }
}
