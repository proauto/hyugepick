package com.restspotfinder.domain.restarea.controller;

import com.restspotfinder.domain.restarea.dto.RestAreaResponse;
import com.restspotfinder.domain.restarea.dto.RestAreaDetailResponse;
import com.restspotfinder.domain.restarea.service.RestAreaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@Tag(name = "휴게소[RestArea] API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/restarea")
public class RestAreaController {
    private final RestAreaService restAreaService;

    @Operation(summary = "단 건 휴게소 상세 조회 API")
    @ApiResponse(responseCode = "200", content = {@Content(mediaType = "application/json", schema = @Schema(implementation = RestAreaDetailResponse.class))})
    @GetMapping
    public ResponseEntity<RestAreaDetailResponse> getOneByRestAreaId(@RequestParam long restAreaId) {
        RestAreaDetailResponse response = restAreaService.getDetailById(restAreaId);
        
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "경로 별 접근 가능 휴게소 목록 조회 API")
    @ApiResponse(responseCode = "200", content = {@Content(mediaType = "application/json", array =
    @ArraySchema(schema = @Schema(implementation = RestAreaResponse.class)))})
    @GetMapping("/route")
    public ResponseEntity<?> getListByRouteId(@RequestParam long routeId) {
        List<RestAreaResponse> responses = restAreaService.getRestAreasWithPointCounts(routeId);
        
        return ResponseEntity.ok(responses);
    }
}