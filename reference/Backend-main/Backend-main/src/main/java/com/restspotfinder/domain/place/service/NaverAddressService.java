package com.restspotfinder.domain.place.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.ArrayList;
import java.util.List;

import static com.restspotfinder.domain.place.entity.NaverPlace.fromJsonNode;

@Component
@RequiredArgsConstructor
public class NaverAddressService {
    private final ApiCountService apiCountService;
    @Value("${naver.cloud-platform.geocode-url}")
    String REQUEST_URL;
    @Value("${naver.cloud-platform.client-id}")
    String CLOUD_CLIENT_ID;
    @Value("${naver.cloud-platform.client-secret}")
    String CLOUD_CLIENT_SECRET;


    @Transactional
    public List<NaverPlace> getPlaceListByAddress(String address) {
        apiCountService.checkAddressSearchCount(LocalDate.now());
        
        String requestURL = REQUEST_URL + "?query=" + address;
        JsonNode jsonNode = connectCloud(requestURL);

        List<NaverPlace> naverPlaceList = new ArrayList<>();
        JsonNode addressesNode = jsonNode.get("addresses");

        if (addressesNode != null && addressesNode.isArray()) {
            for (JsonNode addressNode : addressesNode) {
                NaverPlace place = fromJsonNode(addressNode);
                naverPlaceList.add(place);
            }
        }

        return naverPlaceList;

    }

    public JsonNode connectCloud(String requestURL) {
        try {
            HttpComponentsClientHttpRequestFactory httpRequestFactory = new HttpComponentsClientHttpRequestFactory();
            RestTemplate restTemplate = new RestTemplate(httpRequestFactory);
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-ncp-apigw-api-key-id", CLOUD_CLIENT_ID);
            headers.set("x-ncp-apigw-api-key", CLOUD_CLIENT_SECRET);

            HttpEntity<Object> entity = new HttpEntity<>(headers);
            ResponseEntity<String> responseEntity = restTemplate.exchange(requestURL, HttpMethod.GET, entity, String.class);

            return new ObjectMapper().readTree(responseEntity.getBody());
        } catch (Exception e) {
            throw new BusinessException(PlaceErrorCode.EXTERNAL_API_ERROR);
        }
    }
}


