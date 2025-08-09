package com.restspotfinder.domain.apicount.service;

import com.restspotfinder.domain.apicount.entity.AddressSearchCount;
import com.restspotfinder.domain.apicount.entity.PlaceSearchCount;
import com.restspotfinder.domain.apicount.entity.RouteSearchCount;
import com.restspotfinder.domain.apicount.error.ApiCountErrorCode;
import com.restspotfinder.exception.BusinessException;
import com.restspotfinder.domain.apicount.repository.AddressSearchCountRepository;
import com.restspotfinder.domain.apicount.repository.PlaceSearchCountRepository;
import com.restspotfinder.domain.apicount.repository.RouteSearchCountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ApiCountService {
    private final PlaceSearchCountRepository placeSearchCountRepository;
    private final RouteSearchCountRepository routeSearchCountRepository;
    private final AddressSearchCountRepository addressSearchCountRepository;

    @Transactional
    public void checkPlaceSearchCount(LocalDate today) {
        PlaceSearchCount placeSearchCount = placeSearchCountRepository.findByDateWithPessimisticLock(today)
                .orElse(PlaceSearchCount.init(today));

        long apiCallCount = placeSearchCount.getNaverCount();
        if (apiCallCount >= 25000) // 일일 한도 25,000 건
            throw new BusinessException(ApiCountErrorCode.PLACE_API_CALL_LIMIT_EXCEEDED);

        placeSearchCount.increase();
        placeSearchCountRepository.save(placeSearchCount);
    }

    @Transactional
    public void checkRoutSearchCount(LocalDate today) {
        LocalDate startOfMonth = today.withDayOfMonth(1);
        RouteSearchCount routeSearchCount = routeSearchCountRepository.findByDateWithPessimisticLock(startOfMonth)
                .orElse(RouteSearchCount.init(startOfMonth));

        long apiCallCount = routeSearchCount.getNaverCount();
        if (apiCallCount >= 60000) // 월간 한도 60,000 건
            throw new BusinessException(ApiCountErrorCode.ROUTE_API_CALL_LIMIT_EXCEEDED);

        routeSearchCount.increase();
        routeSearchCountRepository.save(routeSearchCount);
    }

    @Transactional
    public void checkAddressSearchCount(LocalDate today) {
        AddressSearchCount addressSearchCount = addressSearchCountRepository.findByCreatedAt(today)
                .orElse(AddressSearchCount.init(today));

        long apiCallCount = addressSearchCount.getNaverCount();
        if (apiCallCount >= 25000) // 일일 한도 25,000 건
            throw new BusinessException(ApiCountErrorCode.PLACE_API_CALL_LIMIT_EXCEEDED);

        addressSearchCount.increase();
        addressSearchCountRepository.save(addressSearchCount);
    }
}