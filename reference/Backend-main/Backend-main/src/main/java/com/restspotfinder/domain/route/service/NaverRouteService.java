package com.restspotfinder.domain.route.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.restspotfinder.domain.route.controller.request.RouteRequestDTO;
import com.restspotfinder.domain.route.entity.NaverRoute;
import com.restspotfinder.domain.route.enums.RouteOption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;


@Slf4j
@Service
@RequiredArgsConstructor
public class NaverRouteService {
    @Value("${naver.cloud-platform.direct5-url}")
    String DIRECT5_URL;
    @Value("${naver.cloud-platform.client-id}")
    String CLIENT_ID;
    @Value("${naver.cloud-platform.client-secret}")
    String CLIENT_SECRET;

    public List<NaverRoute> getRouteData(RouteRequestDTO routeRequestDTO) {
        List<RouteOption> routeOption = RouteOption.getOptionList(routeRequestDTO.getPage());
        String requestURL = routeRequestDTO.getDirect5RequestUrl(DIRECT5_URL);
        JsonNode resultNode = connect(requestURL);

        return NaverRoute.fromList(resultNode, routeOption);
    }

    public JsonNode connect(String requestURL) {
        try {
            HttpComponentsClientHttpRequestFactory httpRequestFactory = new HttpComponentsClientHttpRequestFactory();
            RestTemplate restTemplate = new RestTemplate(httpRequestFactory);
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-ncp-apigw-api-key-id", CLIENT_ID);
            headers.set("x-ncp-apigw-api-key", CLIENT_SECRET);

            HttpEntity<Object> entity = new HttpEntity<>(headers);
            ResponseEntity<String> responseEntity = restTemplate.exchange(requestURL, HttpMethod.GET, entity, String.class);

            return new ObjectMapper().readTree(responseEntity.getBody());
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException();
        }
    }
}
