package com.restspotfinder.domain.restarea.service;

import com.restspotfinder.domain.restarea.dto.RestAreaResponse;
import com.restspotfinder.domain.restarea.dto.RestAreaDetailResponse;
import java.util.List;


public interface RestAreaService {
    RestAreaDetailResponse getDetailById(long restAreaId);

    List<RestAreaResponse> getRestAreasWithPointCounts(long routeI);
}