package com.restspotfinder.place.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
public class NaverAddressServiceTest {

    @Autowired
    private MockMvc mockMvc;

    @Mock
    private RestTemplate restTemplate;

    private String mockResponseJson;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        mockResponseJson = "{\n" +
                "  \"status\": \"OK\",\n" +
                "  \"addresses\": [\n" +
                "    {\n" +
                "      \"roadAddress\": \"경기도 성남시 분당구 불정로 6 NAVER그린팩토리\",\n" +
                "      \"jibunAddress\": \"경기도 성남시 분당구 정자동 178-1 NAVER그린팩토리\",\n" +
                "      \"x\": \"127.1052310\",\n" +
                "      \"y\": \"37.3595158\"\n" +
                "    }\n" +
                "  ]\n" +
                "}";
    }

    @Test
    void testGetPlaceListByAddress() throws Exception {
        when(restTemplate.exchange("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=정자동 178-1", org.springframework.http.HttpMethod.GET, null, String.class))
                .thenReturn(ResponseEntity.ok(mockResponseJson));

        mockMvc.perform(get("/api/place/naver/address?address=정자동 178-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("경기도 성남시 분당구 불정로 6 NAVER그린팩토리"))
                .andExpect(jsonPath("$.data[0].lng").value("127.1052310"))
                .andExpect(jsonPath("$.data[0].lat").value("37.3595158"))
                .andExpect(jsonPath("$.data[0].address").value("경기도 성남시 분당구 불정로 6 NAVER그린팩토리"))
                .andExpect(jsonPath("$.data[0].category").value(nullValue()));
    }
}
