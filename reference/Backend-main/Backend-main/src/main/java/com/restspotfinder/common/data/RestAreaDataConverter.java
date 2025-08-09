package com.restspotfinder.common.data;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.restspotfinder.domain.restarea.entity.RestArea;
import org.springframework.core.io.ClassPathResource;
import com.restspotfinder.exception.BusinessException;
import com.restspotfinder.domain.restarea.error.RestAreaErrorCode;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class RestAreaDataConverter {
    
    public static List<RestArea> convertJsonToRestAreas(String jsonFilePath) {
        ClassPathResource jsonFile = new ClassPathResource(jsonFilePath);
        ObjectMapper objectMapper = new ObjectMapper();
        List<RestArea> restAreaList = new ArrayList<>();
        
        try {
            JsonNode rootNode = objectMapper.readTree(jsonFile.getInputStream());
            ArrayNode recordsNode = (ArrayNode) rootNode.get("records");

            for (JsonNode node : recordsNode) {
                RestArea restArea = RestArea.from(node);
                System.out.println("restArea = " + restArea);
                restAreaList.add(restArea);
            }

            System.out.println("restAreaList = " + restAreaList.size());
        } catch (IOException e) {
            throw new BusinessException(RestAreaErrorCode.JSON_CONVERT_ERROR);
        }
        
        return restAreaList;
    }

    // 사용 예시
    public static void main(String[] args) {
        List<RestArea> restAreas = convertJsonToRestAreas("/RestArea_latest.json");
        System.out.println("Converted " + restAreas.size() + " rest areas");
    }
} 