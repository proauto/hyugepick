package com.restspotfinder.domain.fuel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.restspotfinder.domain.fuel.entity.FuelStation;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class FuelApiClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ex.api.key}")
    private String API_KEY;
    private static final String API_URL = "https://data.ex.co.kr/openapi/business/curStateStation";

    public List<FuelStation> fetchAll() {
        int pageNo = 1;
        int numOfRows = 100; // 한 페이지 최대 row 수 (API 문서에 따라 조정)
        int maxPage = 4;
        List<FuelStation> result = new ArrayList<>();
        boolean hasMore = true;

        while (hasMore && pageNo <= maxPage) {
            String uri = UriComponentsBuilder.fromHttpUrl(API_URL)
                    .queryParam("key", API_KEY)
                    .queryParam("type", "json")
                    .queryParam("pageNo", pageNo)
                    .queryParam("numOfRows", numOfRows)
                    .toUriString();
            try {
                String response = restTemplate.getForObject(uri, String.class);
                JsonNode root = objectMapper.readTree(response);
                JsonNode list = root.path("list");

                if (list.isArray() && list.size() > 0) {
                    for (JsonNode node : list) {
                        FuelStation station = FuelStation.from(node);
                        result.add(station);
                    }
                    pageNo++;
                } else {
                    hasMore = false;
                }
            } catch (Exception e) {
                e.printStackTrace();
                hasMore = false;
            }
        }
        return result;
    }
}
