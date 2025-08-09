package com.restspotfinder.domain.fuel.service;

import com.restspotfinder.domain.fuel.entity.FuelStation;
import com.restspotfinder.domain.fuel.entity.FuelUpdateHistory;
import com.restspotfinder.domain.fuel.repository.FuelStationRepository;
import com.restspotfinder.domain.fuel.repository.FuelUpdateHistoryRepository;
import com.restspotfinder.exception.BusinessException;
import com.restspotfinder.domain.fuel.error.FuelErrorCode;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FuelService {
    private final FuelStationRepository fuelStationRepository;
    private final FuelUpdateHistoryRepository fuelUpdateHistoryRepository;
    private final FuelApiClient fuelApiClient;

    public List<FuelStation> getAll() {
        return fuelStationRepository.findAll();
    }

    @Transactional
    public void updateFuelStationsFromApi() {
        try {
            List<FuelStation> fetchedList = fuelApiClient.fetchAll();
            
            if (fetchedList == null || fetchedList.isEmpty()) {
                FuelUpdateHistory history = FuelUpdateHistory.create(false, 0);
                fuelUpdateHistoryRepository.save(history);

                throw new BusinessException(FuelErrorCode.API_DATA_EMPTY);
            }
            
            List<FuelStation> savedList = fuelStationRepository.saveAll(fetchedList);

            FuelUpdateHistory history = FuelUpdateHistory.create(true, savedList.size());
            fuelUpdateHistoryRepository.save(history);
            log.info("주유소 가격 데이터 업데이트 완료 - 업데이트된 데이터: {}건", savedList.size());
            
        } catch (Exception e) {
            FuelUpdateHistory history = FuelUpdateHistory.create(false, 0);
            fuelUpdateHistoryRepository.save(history);

            log.error("주유소 가격 데이터 업데이트 예상치 못한 오류: {}", e.getMessage());
            throw new BusinessException(FuelErrorCode.UPDATE_FAILED, e);
        }
    }
}
