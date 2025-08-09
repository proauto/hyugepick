package com.restspotfinder.domain.place.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.restspotfinder.domain.apicount.service.ApiCountService;
import com.restspotfinder.domain.place.entity.NaverPlace;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import com.restspotfinder.exception.BusinessException;
import com.restspotfinder.domain.place.error.PlaceErrorCode;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class NaverPlaceService {
    private final ApiCountService apiCountService;
    @Value("${naver.developers.search-url}")
    String SEARCH_URL;
    @Value("${naver.developers.client-id}")
    String CLIENT_ID;
    @Value("${naver.developers.client-secret}")
    String CLIENT_SECRET;

    @Transactional
    public List<NaverPlace> getPlaceListBySearchTerm(String searchTerm) {
        apiCountService.checkPlaceSearchCount(LocalDate.now());
        
        String requestURL = SEARCH_URL + "?display=5&query=" + searchTerm;
        JsonNode jsonNode = connect(requestURL);

        return NaverPlace.fromArray((ArrayNode) jsonNode.get("items"));
    }

    public JsonNode connect(String requestURL) {
        try {
            HttpComponentsClientHttpRequestFactory httpRequestFactory = new HttpComponentsClientHttpRequestFactory();
            RestTemplate restTemplate = new RestTemplate(httpRequestFactory);
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", CLIENT_ID);
            headers.set("X-Naver-Client-Secret", CLIENT_SECRET);

            HttpEntity<Object> entity = new HttpEntity<>(headers);
            ResponseEntity<String> responseEntity = restTemplate.exchange(requestURL, HttpMethod.GET, entity, String.class);

            return new ObjectMapper().readTree(responseEntity.getBody());
        } catch (Exception e) {
            throw new BusinessException(PlaceErrorCode.EXTERNAL_API_ERROR);
        }
    }
}