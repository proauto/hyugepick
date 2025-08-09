package com.restspotfinder.domain.route.service;

import com.restspotfinder.domain.apicount.service.ApiCountService;
import com.restspotfinder.domain.route.collection.Routes;
import com.restspotfinder.domain.route.controller.request.RouteRequestDTO;
import com.restspotfinder.domain.route.entity.NaverRoute;
import com.restspotfinder.domain.route.entity.Route;
import com.restspotfinder.domain.route.repository.RouteRepository;
import com.restspotfinder.domain.search.entity.Search;
import com.restspotfinder.domain.search.repository.SearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.restspotfinder.exception.BusinessException;
import com.restspotfinder.domain.route.error.RouteErrorCode;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteService {
    private final RouteRepository routeRepository;
    private final SearchRepository searchRepository;
    private final NaverRouteService naverRouteService;
    private final ApiCountService apiCountService;

    @Transactional
    public Routes create(RouteRequestDTO routeRequestDTO) {
        // 월간 한도 60,000 건
        apiCountService.checkRoutSearchCount(LocalDate.now());

        List<NaverRoute> naverRouteList = naverRouteService.getRouteData(routeRequestDTO);
        Search search = searchRepository.save(Search.fromRequestDTO(routeRequestDTO));

        List<Route> routeList = Route.fromList(naverRouteList, search.getSearchId(), routeRequestDTO);
        List<Route> savedRouteList = routeRepository.saveAll(routeList);

        return new Routes(savedRouteList);
    }

    @Transactional
    public Route getOneById(long routeId){
        return routeRepository.findById(routeId)
                .orElseThrow(() -> new BusinessException(RouteErrorCode.NOT_FOUND));
    }

    @Transactional
    public Routes getListBySearchId(long searchId) {
        List<Route> routeList = routeRepository.findBySearchId(searchId);

        if (routeList == null || routeList.isEmpty()) {
            throw new BusinessException(RouteErrorCode.INVALID_ROUTE_LIST);
        }
        Routes routes = new Routes(routeList);

        Search search = Search.fromRoutes(routes);
        searchRepository.save(search);

        return routes;
    }
}