package com.restspotfinder.domain.interchange.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import com.restspotfinder.domain.place.entity.NaverPlace;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Entity
@Getter
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class Interchange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long interchangeId;
    @Setter
    private String name; // 출입구 명
    @Setter
    private String routeName; // 도로 노선 명
    private double latitude; // 위도
    private double longitude; // 경도
    private boolean isStart; // 도로의 시작점
    @Setter
    private Integer weight; // 출입구 순서

    @JsonIgnore
    @Column(columnDefinition = "geometry(Point, 4326)")
    private Point point;

    public static Interchange from(JsonNode node) {
        GeometryFactory geometryFactory = new GeometryFactory();
        double xValue = node.get("경도").asDouble(0);
        double yValue = node.get("위도").asDouble(0);
        Point point = geometryFactory.createPoint(new Coordinate(xValue, yValue));
        return Interchange.builder()
                .name(node.get("IC명").asText("")) // 기본값으로 "" 사용
                .routeName(node.get("노선명").asText(""))
                .point(point)
                .latitude(yValue) // 기본값으로 0 사용
                .longitude(xValue)
                .build();
    }

    public static Interchange from(String name, String routeName, NaverPlace naverPlace) {
        GeometryFactory geometryFactory = new GeometryFactory();
        double xValue = Double.parseDouble(naverPlace.getMapX());
        double yValue =Double.parseDouble(naverPlace.getMapY());
        Point point = geometryFactory.createPoint(new Coordinate(xValue, yValue));
        return Interchange.builder()
                .name(name) // 기본값으로 "" 사용
                .routeName(routeName)
                .point(point)
                .latitude(yValue) // 기본값으로 0 사용
                .longitude(xValue)
                .build();
    }

    public static Map<String, List<Interchange>> listToGroupingRouteNameMap(List<Interchange> interchangeList) {
        return interchangeList.stream().collect(Collectors.groupingBy(Interchange::getRouteName));
    }
}