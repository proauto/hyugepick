package com.restspotfinder.domain.sleeparea.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
@ToString
public class SleepArea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sleepAreaId;
    private String sleepAreaName; // "졸음쉼터명"
    private String stateName; // "시도명"
    private String cityName; // "시군구명"
    private String routeType; // "도로종류"
    private String routeName; // "도로노션명"
    private int routeNumber; // "도로노선번호"
    private String routeDirection; // "도로노션방향"
    private String address; // "소재지도로명주소"
    private String addressOld; // "소재지지번주소"
    @JsonIgnore
    @Column(columnDefinition = "geometry(Point, 4326)")
    private Point point;
    private double latitude; // "위도"
    private double longitude; // "경도"
    private int parkingSpaceCount; // "주차면수"
    private Boolean hasRestroom; // "화장실유무"
    private String otherFacilities; // "기타편의시설"
    private String managementAgency; // "관리기관명"
    private String managementPhone; // "관리기관전화번호"
    private String dataDate; // "데이터기준일자"

    @Setter
    private Integer weight; // 방향 판단 가중치
    private String naverMapUrl; // 매칭되는 네이버 맵 페이지 URL

    public static SleepArea from(JsonNode node) {
        GeometryFactory geometryFactory = new GeometryFactory();
        double longitude = node.get("경도").asDouble(0);  // 기본값으로 0 사용
        double latitude = node.get("위도").asDouble(0);
        Point point = geometryFactory.createPoint(new Coordinate(longitude, latitude));
        return SleepArea.builder()
                .sleepAreaName(node.get("졸음쉼터명").asText(""))
                .stateName(node.get("시도명").asText(""))
                .cityName(node.get("시군구명").asText(""))
                .routeType(node.get("도로종류").asText(""))
                .routeName(node.get("도로노선명").asText(""))
                .routeNumber(node.get("도로노선번호").asInt(0))
                .routeDirection(node.get("도로노선방향").asText(""))
                .address(node.get("소재지도로명주소").asText(""))
                .addressOld(node.get("소재지지번주소").asText(""))
                .point(point)
                .latitude(latitude)
                .longitude(longitude)
                .parkingSpaceCount(node.get("주차면수").asInt(0))
                .hasRestroom("Y".equals(node.get("화장실유무").asText(null)))
                .otherFacilities(node.get("기타편의시설").asText(""))
                .managementAgency(node.get("관리기관명").asText(""))
                .managementPhone(node.get("관리기관전화번호").asText(""))
                .dataDate(node.get("데이터기준일자").asText(""))
                .build();
    }
}
