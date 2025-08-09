package com.restspotfinder.domain.place.controller;

import com.restspotfinder.domain.place.service.NaverAddressService;
import com.restspotfinder.domain.apicount.service.ApiCountService;
import com.restspotfinder.domain.place.entity.NaverPlace;
import com.restspotfinder.domain.place.dto.PlaceResponse;
import com.restspotfinder.domain.place.service.NaverPlaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "장소[Place] API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/place")
public class PlaceController {
    private final ApiCountService apiCountService;
    private final NaverPlaceService naverPlaceSearchService;
    private final NaverAddressService naverAddressService;

    @Operation(summary = "NAVER 장소 검색 API", description = "일일 API 호출 제한량은 25,000 건이다. <b>25,000 건 초과 시 303 에러(API_CALL_LIMIT_ERROR)가 발생 한다.</b>")
    @ApiResponse(responseCode = "200", content = {@Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = PlaceResponse.class)))})
    @GetMapping("/naver")
    public ResponseEntity<?> getPlacesBySearchTerm(@RequestParam String searchTerm, @RequestParam(defaultValue = "false") boolean isTest) {
        List<NaverPlace> naverPlaceList = naverPlaceSearchService.getPlaceListBySearchTerm(searchTerm);
        
        return ResponseEntity.ok(PlaceResponse.fromList(naverPlaceList));
    }

    @Operation(summary = "NAVER 주소 검색 API(Geocoding)", description = "일일 API 호출 제한량은 25,000 건이다. <b>25,000 건 초과 시 303 에러(API_CALL_LIMIT_ERROR)가 발생 한다.</b>")
    @ApiResponse(responseCode = "200", content = {@Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = PlaceResponse.class)))})
    @GetMapping("/naver/address")
    public ResponseEntity<?> getPlaceListByAddress(@RequestParam String address, @RequestParam(defaultValue = "false") boolean isTest) {
        List<NaverPlace> naverPlaceList = naverAddressService.getPlaceListByAddress(address);
        
        return ResponseEntity.ok(PlaceResponse.fromList(naverPlaceList));
    }
}