package com.restspotfinder.domain.restarea.service.impl;

import com.restspotfinder.domain.fuel.entity.FuelUpdateHistory;
import com.restspotfinder.domain.fuel.error.FuelErrorCode;
import com.restspotfinder.domain.interchange.service.InterchangeService;
import com.restspotfinder.domain.restarea.collection.RestAreas;
import com.restspotfinder.domain.restarea.entity.RestArea;
import com.restspotfinder.domain.restarea.repository.RestAreaRepository;
import com.restspotfinder.domain.restarea.dto.RestAreaResponse;
import com.restspotfinder.domain.restarea.dto.RestAreaDetailResponse;
import com.restspotfinder.domain.restarea.service.RestAreaService;
import com.restspotfinder.domain.fuel.repository.FuelUpdateHistoryRepository;
import com.restspotfinder.domain.route.entity.Route;
import com.restspotfinder.domain.route.repository.RouteRepository;
import com.restspotfinder.domain.route.enums.Direction;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.restspotfinder.exception.BusinessException;
import com.restspotfinder.domain.restarea.error.RestAreaErrorCode;
import com.restspotfinder.domain.route.error.RouteErrorCode;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RestAreaServiceImpl implements RestAreaService {
    private final RestAreaRepository restAreaRepository;
    private final RouteRepository routeRepository;
    private final FuelUpdateHistoryRepository fuelUpdateHistoryRepository;

    private final InterchangeService interchangeService;

    @Override
    public RestAreaDetailResponse getDetailById(long restAreaId) {
        RestArea restArea = restAreaRepository.findByIdWithFuelStation(restAreaId)
                .orElseThrow(() -> new BusinessException(RestAreaErrorCode.NOT_FOUND));

        FuelUpdateHistory fuelUpdateHistory = fuelUpdateHistoryRepository.findFirstByIsSuccessTrueOrderByUpdateStartedAtDesc()
                .orElseThrow(() -> new BusinessException(FuelErrorCode.NOT_FOUND));

        return RestAreaDetailResponse.of(restArea, fuelUpdateHistory.getUpdateStartedAt());
    }

    @Override
    public List<RestAreaResponse> getRestAreasWithPointCounts(long routeId) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new BusinessException(RouteErrorCode.NOT_FOUND));

        // 1. 먼저 접근 가능한 휴게소 목록을 가져옴
        RestAreas accessibleRestAreas = getAccessibleRestAreas(route);
        List<RestArea> restAreaList = accessibleRestAreas.restAreaList();

        // 2. 각 휴게소에 대해 다음 휴게소까지의 거리를 포함한 응답 생성
        return IntStream.range(0, restAreaList.size())
                .mapToObj(i -> {
                    RestArea current = restAreaList.get(i);

                    // 마지막 휴게소가 아니면 다음 휴게소까지의 거리 계산
                    Double distance = Optional.of(i)
                            .filter(index -> index < restAreaList.size() - 1)
                            .map(index -> restAreaList.get(index + 1))
                            .map(next -> restAreaRepository.findDistanceBetweenPointsInKm(
                                    route.getLineString(),
                                    current.getPoint(),
                                    next.getPoint()
                            ))
                            .orElse((double) 0);

                    RestAreaResponse restAreaResponse = RestAreaResponse.from(current);
                    restAreaResponse.setNextRestAreaDistance(distance);

                    return restAreaResponse;
                })
                .collect(Collectors.toList());
    }

    private RestAreas getAccessibleRestAreas(Route route) {
        List<RestArea> restAreaList = restAreaRepository.findNearbyRoutes(route.getLineString(), 500);
        RestAreas restAreas = new RestAreas(restAreaList);

        Set<String> routeNameSet = restAreas.extractRouteNames();
        Map<String, Direction> directionMap = routeNameSet.stream()
                .collect(Collectors.toMap(
                        routeName -> routeName,
                        routeName -> interchangeService.getDirectionByRoute(route, routeName)));

        return restAreas.filterAccessible(directionMap);
    }
}
