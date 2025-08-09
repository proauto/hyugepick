package com.restspotfinder.domain.place.dto;

import com.restspotfinder.domain.place.entity.NaverPlace;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlaceResponse {
    @Schema(description = "장소 명")
    private String name;
    @Schema(description = "위도 [Y값]")
    private String lat;
    @Schema(description = "경도 [X값]")
    private String lng;
    @Schema(description = "카테고리 ex) 지하철,전철")
    private String category;
    @Schema(description = "도로 명 주소")
    private String address;

    public static PlaceResponse from(NaverPlace naverPlace) {
        return PlaceResponse.builder()
                .name(naverPlace.getTitle())
                .lat(naverPlace.getMapY())
                .lng(naverPlace.getMapX())
                .category(naverPlace.getCategory())
                .address(naverPlace.getRoadAddress())
                .build();
    }

    public static List<PlaceResponse> fromList(List<NaverPlace> naverPlaceList) {
        return naverPlaceList.stream().map(PlaceResponse::from).toList();
    }
}