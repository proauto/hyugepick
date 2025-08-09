package com.restspotfinder.domain.restarea.repository;

import com.restspotfinder.domain.restarea.entity.RestArea;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RestAreaRepository extends JpaRepository<RestArea, Long> {
    List<RestArea> findByRouteName(String routeName);
    
    @Query("SELECT r FROM RestArea r LEFT JOIN FETCH r.fuelStation WHERE r.restAreaId = :restAreaId")
    Optional<RestArea> findByIdWithFuelStation(@Param("restAreaId") Long restAreaId);

    /***
     * 경로 LineString <-> 휴게소 좌표 비교 (500m 이내에 있는지 체크)
     * 출발지(LineString 의 첫번째 값)와 가까운 순으로 정렬
     ***/
    @Query(value = "SELECT r.* FROM rest_area r " +
            "WHERE ST_DWithin( " +
            "    CAST(ST_SetSRID(:route, 4326) AS geography), " +
            "    CAST(ST_SetSRID(r.point, 4326) AS geography), :distance) " +
            "ORDER BY ST_Distance(ST_SetSRID(r.point, 4326), ST_StartPoint(:route)) ASC",
            nativeQuery = true)
    List<RestArea> findNearbyRoutes(@Param("route") LineString route, @Param("distance") int distance);

    /***
     * 두 점 사이의 LineString 구간 거리 계산 (km 단위)
     * 한국 좌표계(EPSG:5179)로 변환하여 정확한 거리 측정
     ***/
    @Query(value = """
    SELECT ST_Length(
        ST_Transform(
            ST_LineSubstring(
                :lineString,
                ST_LineLocatePoint(:lineString, :point1),
                ST_LineLocatePoint(:lineString, :point2)
            ),
            5179
        )
    ) / 1000.0
    """, nativeQuery = true)
    Double findDistanceBetweenPointsInKm(
            @Param("lineString") LineString lineString,
            @Param("point1") Point point1,
            @Param("point2") Point point2
    );
}