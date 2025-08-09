package com.restspotfinder.domain.interchange.repository;

import com.restspotfinder.domain.interchange.entity.Interchange;
import org.locationtech.jts.geom.LineString;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;


public interface InterchangeRepository extends JpaRepository<Interchange, Long> {
    List<Interchange> findByNameContainingOrderByInterchangeId(String name);

    @Query(value = "SELECT i.* FROM interchange i " +
            "WHERE i.route_name = :routeName AND ST_DWithin( " +
            "    CAST(ST_SetSRID(:route, 4326) AS geography), " +
            "    CAST(ST_SetSRID(i.point, 4326) AS geography), :distance) " +
            "ORDER BY ST_Distance(ST_SetSRID(i.point, 4326), ST_StartPoint(:route)) ASC",
            nativeQuery = true)
    List<Interchange> findNearbyRoutes(@Param("route") LineString route, @Param("routeName") String routeName, @Param("distance") int distance);

    @Query(value = "SELECT i.* FROM interchange i " +
            "WHERE i.route_name = :routeName " +
            "ORDER BY ST_Distance( " +
            "    CAST(ST_SetSRID(i.point, 4326) AS geography), " +
            "    (SELECT CAST(ST_SetSRID(point, 4326) AS geography) " +
            "     FROM interchange " +
            "     WHERE route_name = :routeName AND is_start = true LIMIT 1)) ASC",
            nativeQuery = true)
    List<Interchange> sortHighwayByStartPoint(@Param("routeName") String routeName);
}