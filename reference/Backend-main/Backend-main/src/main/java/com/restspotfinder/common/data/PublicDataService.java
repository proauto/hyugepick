package com.restspotfinder.common.data;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.restspotfinder.domain.interchange.entity.Interchange;
import com.restspotfinder.domain.restarea.entity.RestArea;
import com.restspotfinder.domain.sleeparea.domain.SleepArea;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;


@Service
public class PublicDataService {
    public List<RestArea> getRestAreaData() {
        ClassPathResource jsonFile = new ClassPathResource("/RestArea.json");
        ObjectMapper objectMapper = new ObjectMapper();
        List<RestArea> restAreaList = new ArrayList<>();
        try {
            JsonNode rootNode = objectMapper.readTree(jsonFile.getInputStream());
            ArrayNode recordsNode = (ArrayNode) rootNode.get("records");

            for (JsonNode node : recordsNode) {
                RestArea restArea = RestArea.from(node);
                restAreaList.add(restArea);
                System.out.println("restArea = " + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(restArea));
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return restAreaList;
    }

    public List<Interchange> getInterchangeData() {
        ClassPathResource jsonFile = new ClassPathResource("/Interchange.json");
        ObjectMapper objectMapper = new ObjectMapper();
        List<Interchange> interchangeList = new ArrayList<>();
        try {
            JsonNode rootNode = objectMapper.readTree(jsonFile.getInputStream());

            for (JsonNode node : rootNode) {
                Interchange ic = Interchange.from(node);
                interchangeList.add(ic);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return interchangeList;
    }

    public List<SleepArea> getSleepAreaData() {
        ClassPathResource jsonFile = new ClassPathResource("/SleepArea.json");
        ObjectMapper objectMapper = new ObjectMapper();
        List<SleepArea> sleepAreaList = new ArrayList<>();
        try {
            JsonNode rootNode = objectMapper.readTree(jsonFile.getInputStream());
            ArrayNode recordsNode = (ArrayNode) rootNode.get("records");

            for (JsonNode node : recordsNode) {
                SleepArea sleepArea = SleepArea.from(node);
                sleepAreaList.add(sleepArea);
                System.out.println("sleepArea = " + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(sleepArea));
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return sleepAreaList;
    }
}