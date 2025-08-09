package com.restspotfinder.domain.route.dto;

import lombok.Builder;
import lombok.Getter;
import org.locationtech.jts.geom.Coordinate;

import java.util.Arrays;
import java.util.List;

@Getter
@Builder
public class CoordinateResponse {
    private double lat;
    private double lng;

    public static CoordinateResponse from(Coordinate coordinate){
        return CoordinateResponse.builder()
                .lat(coordinate.getY())
                .lng(coordinate.getX())
                .build();
    }

    public static List<CoordinateResponse> fromArray(Coordinate[] coordinates){
        return Arrays.stream(coordinates).map(CoordinateResponse::from).toList();
    }
}
