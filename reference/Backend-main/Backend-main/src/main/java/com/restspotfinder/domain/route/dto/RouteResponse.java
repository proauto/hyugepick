package com.restspotfinder.domain.route.dto;

import com.restspotfinder.domain.route.collection.Routes;
import com.restspotfinder.domain.route.entity.Route;
import com.restspotfinder.domain.route.enums.RouteOption;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class RouteResponse {
    @Schema(description = "검색 고유 ID")
    private Long searchId;
    @Schema(description = "경로 고유 ID")
    private Long routeId;
    @Schema(description = "경로 탐색 옵션", enumAsRef = true)
    private RouteOption routeOption;
    @Schema(description = "경로 탐색 옵션 문구")
    private String optionText;
    @Schema(description = "총 거리 [단위: meter]")
    private String distance;
    @Schema(description = "예상 시간 [단위: ms]")
    private String duration;
    @Schema(description = "통행료 [단위: 원]")
    private String tollFare; // 통행료
    @Schema(description = "연료비 [단위: 원]")
    private String fuelPrice; // 연료비
    @Schema(description = "경로 조회 날짜")
    private LocalDateTime createdDate;
    @Schema(description = "경로 Path")
    private List<CoordinateResponse> coordinates;

    public static RouteResponse from(Route route) {
        return RouteResponse.builder()
                .routeId(route.getRouteId())
                .searchId(route.getSearchId())
                .distance(route.getDistance())
                .duration(route.getDuration())
                .tollFare(route.getTollFare())
                .fuelPrice(route.getFuelPrice())
                .routeOption(route.getRouteOption())
                .optionText(route.getRouteOption().getDesc())
                .createdDate(route.getCreatedDate())
                .coordinates(CoordinateResponse.fromArray(route.getLineString().getCoordinates()))
                .build();
    }

    public static List<RouteResponse> fromRoutes(Routes routes){
        return routes.routeList().stream().map(RouteResponse::from).toList();
    }
}