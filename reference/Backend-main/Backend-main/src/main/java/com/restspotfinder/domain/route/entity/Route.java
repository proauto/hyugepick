package com.restspotfinder.domain.route.entity;

import com.restspotfinder.domain.route.controller.request.RouteRequestDTO;
import com.restspotfinder.domain.route.enums.RouteOption;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.List;


@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long routeId;
    private Long searchId;
    private String distance; // 거리 (meters)
    private String duration; // 시간 (millisecond)
    private String tollFare; // 통행료
    private String fuelPrice; // 연료비
    @Enumerated(EnumType.STRING)
    private RouteOption routeOption;  // 경로 옵션
    @Column(columnDefinition = "geometry(LineString, 4326)")
    private LineString lineString; // 경로 Path
    private LocalDateTime createdDate;

    private Point start; // 출발지
    private Point goal; // 목적지
    private String startName; // 출발지 명
    private String goalName; // 목적지 명
    private Point waypoint1; // 경유지 1
    private Point waypoint2; // 경유지 2
    private Point waypoint3; // 경유지 3
    private Point waypoint4; // 경유지 4
    private Point waypoint5; // 경유지 5

    public static Route from(NaverRoute naverRoute, long searchId, RouteRequestDTO routeRequestDTO) {
        Route.RouteBuilder builder = Route.builder()
                .searchId(searchId)
                .distance(naverRoute.getDistance())
                .duration(naverRoute.getDuration())
                .tollFare(naverRoute.getTollFare())
                .fuelPrice(naverRoute.getFuelPrice())
                .lineString(new GeometryFactory().createLineString(naverRoute.getPath()))
                .routeOption(naverRoute.getOption())
                .createdDate(LocalDateTime.now())
                .start(convertStringToPoint(routeRequestDTO.getStart()))
                .startName(routeRequestDTO.getStartName())
                .goal(convertStringToPoint(routeRequestDTO.getGoal()))
                .goalName(routeRequestDTO.getGoalName());

        if (routeRequestDTO.isWaypointsEmpty())
            return builder.build();

        String[] waypointArr = routeRequestDTO.getWaypoints().split("\\|");
        for (int i = 0; i < waypointArr.length; i++) {
            Point waypoint = convertStringToPoint(waypointArr[i]);
            switch (i) {
                case 0: builder.waypoint1(waypoint); break;
                case 1: builder.waypoint2(waypoint); break;
                case 2: builder.waypoint3(waypoint); break;
                case 3: builder.waypoint4(waypoint); break;
                case 4: builder.waypoint5(waypoint); break;
            }
        }

        return builder.build();
    }

    public static List<Route> fromList(List<NaverRoute> naverRouteList, long searchId, RouteRequestDTO routeRequestDTO) {
        return naverRouteList.stream().map(naverRoute -> Route.from(naverRoute, searchId, routeRequestDTO)).toList();
    }

    public static Point convertStringToPoint(String location) {
        String[] locationArr = location.split(",");
        double longitude = Double.parseDouble(locationArr[0]);
        double latitude = Double.parseDouble(locationArr[1]);

        Coordinate coordinate = new Coordinate(longitude, latitude);
        return new GeometryFactory().createPoint(coordinate);
    }
}