package com.restspotfinder.domain.restarea.dto;

import com.restspotfinder.domain.restarea.entity.RestArea;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;


@Getter
@Builder
public class RestAreaResponse {
    @Schema(description = "휴게소 고유 ID")
    private Long restAreaId;
    @Schema(description = "휴게소 명")
    private String name;
    @Schema(description = "도로 명")
    private String routeName;
    @Schema(description = "방향", example = "상행, 하행, 양방향")
    private String routeDirection;
    @Schema(description = "위도")
    private double lat;
    @Schema(description = "경도")
    private double lng;
    @Schema(description = "휴게소 종류")
    private String type;
    @Schema(description = "휴게소 운영 시작 시각")
    private String operatingStartTime;
    @Schema(description = "휴게소 운영 종료 시각")
    private String operatingEndTime;
    @Schema(description = "주차면 수")
    private int parkingSpaceCount;
    @Schema(description = "경정비 가능 여부")
    private Boolean isMaintenanceAvailable;
    @Schema(description = "주유소 유무")
    private Boolean hasGasStation;
    @Schema(description = "LPG 충전소 유무")
    private Boolean hasLpgChargingStation;
    @Schema(description = "전기차 충전소 유무")
    private Boolean hasElectricChargingStation;
    @Schema(description = "화장실 유무")
    private Boolean hasRestroom;
    @Schema(description = "약국 유무")
    private Boolean hasPharmacy;
    @Schema(description = "수유실 유무")
    private Boolean hasNursingRoom;
    @Schema(description = "매점 유무")
    private Boolean hasStore;
    @Schema(description = "음식점 유무")
    private Boolean hasRestaurant;
    @Schema(description = "기타 편의 시설")
    private String otherFacilities;
    @Schema(description = "휴게소 대표 음식명")
    private String representativeFood;
    @Schema(description = "휴게소 전화 번호")
    private String phoneNumber;
    @Schema(description = "매칭되는 NAVER MAP URL")
    private String naverMapUrl;
    @Schema(description = "다음 휴게소까지의 거리(km)")
    private Integer nextRestAreaDistance;

    public void setNextRestAreaDistance(Double nextRestAreaDistance) {
        this.nextRestAreaDistance = (int) Math.round(nextRestAreaDistance);
    }

    public static RestAreaResponse from(RestArea restArea) {
        return RestAreaResponse.builder()
                .restAreaId(restArea.getRestAreaId())
                .name(restArea.getName())
                .routeName(restArea.getRouteName())
                .routeDirection(restArea.getRouteDirection())
                .lat(restArea.getLatitude())
                .lng(restArea.getLongitude())
                .type(restArea.getType())
                .operatingStartTime(restArea.getOperatingStartTime())
                .operatingEndTime(restArea.getOperatingEndTime())
                .parkingSpaceCount(restArea.getParkingSpaceCount())
                .isMaintenanceAvailable(restArea.getIsMaintenanceAvailable())
                .hasGasStation(restArea.getHasGasStation())
                .hasLpgChargingStation(restArea.getHasLpgChargingStation())
                .hasElectricChargingStation(restArea.getHasElectricChargingStation())
                .hasRestroom(restArea.getHasRestroom())
                .hasPharmacy(restArea.getHasPharmacy())
                .hasNursingRoom(restArea.getHasNursingRoom())
                .hasStore(restArea.getHasStore())
                .hasRestaurant(restArea.getHasRestaurant())
                .otherFacilities(restArea.getOtherFacilities())
                .representativeFood(restArea.getRepresentativeFood())
                .phoneNumber(restArea.getPhoneNumber())
                .naverMapUrl(restArea.getNaverMapUrl())
                .nextRestAreaDistance(0)
                .build();
    }
}