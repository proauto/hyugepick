package com.restspotfinder.domain.restarea.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import com.restspotfinder.domain.route.enums.Direction;
import com.restspotfinder.domain.fuel.entity.FuelStation;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;

import java.util.Objects;


@Entity
@Getter
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class RestArea {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long restAreaId;
    private String name; // "휴게소명"
    private String routeName; // "도로노선명"
    private String routeDirection; // "도로노선방향"
    @JsonIgnore
    @Column(columnDefinition = "geometry(Point, 4326)")
    private Point point;
    private double latitude; // "위도"
    private double longitude; // "경도"
    private String type; // "휴게소종류"
    private String operatingStartTime; // "휴게소운영시작시각"
    private String operatingEndTime; // "휴게소운영종료시각"
    private int parkingSpaceCount; // "주차면수"
    private Boolean isMaintenanceAvailable; // "경정비가능여부"
    private Boolean hasGasStation; // "주유소유무"
    private Boolean hasLpgChargingStation; // "LPG충전소유무"
    private Boolean hasElectricChargingStation; // "전기차충전소유무"
    private Boolean isBusTransferAvailable; // "버스환승가능여부"
    private Boolean isRestArea; // "쉼터유무"
    private Boolean hasRestroom; // "화장실유무"
    private Boolean hasPharmacy; // "약국유무"
    private Boolean hasNursingRoom; // "수유실유무"
    private Boolean hasStore; // "매점유무"
    private Boolean hasRestaurant; // "음식점유무"
    private String otherFacilities; // "기타편의시설"
    private String representativeFood; // "휴게소대표음식명"
    private String phoneNumber; // "휴게소전화번호"

    @Setter
    private Integer weight; // 방향 판단 가중치
    private String naverMapUrl; // 매칭되는 네이버 맵 페이지 URL

    private String mainImg; // 네이버맵 대표 이미지 src
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fuelId", referencedColumnName = "serviceAreaCode", insertable = false, updatable = false)
    private FuelStation fuelStation;

    public boolean isAccessible(Direction routeDirectionFromRoute) {
        return routeDirectionFromRoute != null &&
                (
                        routeDirectionFromRoute == Direction.UNKNOWN ||
                                Objects.equals(this.routeDirection, routeDirectionFromRoute.getLabel()) ||
                                Objects.equals(this.routeDirection, Direction.BOTH.getLabel())
                );
    }

    public static RestArea from(JsonNode node) {
        GeometryFactory geometryFactory = new GeometryFactory();
        double xValue = node.get("경도").asDouble(0);
        double yValue = node.get("위도").asDouble(0);
        Point point = geometryFactory.createPoint(new Coordinate(xValue, yValue));
        return RestArea.builder()
                .name(node.get("휴게소명").asText("")) // 기본값으로 "" 사용
                .routeName(node.get("도로노선명").asText(""))
                .routeDirection(node.get("도로노선방향").asText(""))
                .point(point)
                .latitude(node.get("위도").asDouble(0)) // 기본값으로 0 사용
                .longitude(node.get("경도").asDouble(0))
                .type(node.get("휴게소종류").asText(""))
                .operatingStartTime(node.get("휴게소운영시작시각").asText(""))
                .operatingEndTime(node.get("휴게소운영종료시각").asText(""))
                .parkingSpaceCount(node.get("주차면수").asInt(0))
                .isMaintenanceAvailable("Y".equals(node.get("경정비가능여부").asText(null)))
                .hasGasStation("Y".equals(node.get("주유소유무").asText(null)))
                .hasLpgChargingStation("Y".equals(node.get("LPG충전소유무").asText(null)))
                .hasElectricChargingStation("Y".equals(node.get("전기차충전소유무").asText(null)))
                .isBusTransferAvailable("Y".equals(node.get("버스환승가능여부").asText(null)))
                .isRestArea("Y".equals(node.get("쉼터유무").asText(null)))
                .hasRestroom("Y".equals(node.get("화장실유무").asText(null)))
                .hasPharmacy("Y".equals(node.get("약국유무").asText(null)))
                .hasNursingRoom("Y".equals(node.get("수유실유무").asText(null)))
                .hasStore("Y".equals(node.get("매점유무").asText(null)))
                .hasRestaurant("Y".equals(node.get("음식점유무").asText(null)))
                .otherFacilities(node.get("기타편의시설").asText(""))
                .representativeFood(node.get("휴게소대표음식명").asText(""))
                .phoneNumber(node.get("휴게소전화번호").asText(""))
                .build();
    }
}
