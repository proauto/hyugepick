package com.restspotfinder.domain.place.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.stream.StreamSupport;

@Getter
@Builder
@AllArgsConstructor
public class NaverPlace {
    private String title;
    private String mapX; // x값
    private String mapY; // y값
    private String category;
    private String address;
    private String roadAddress;
    private String link;
    private String description;
    private String telephone;

    public static NaverPlace from(JsonNode node) {
        return NaverPlace.builder()
                .title(formatTitle(node.get("title").asText()))
                .mapX(formatX(node.get("mapx").asText()))
                .mapY(formatY(node.get("mapy").asText()))
                .category(formatCategory(node.get("category").asText()))
                .address(node.get("address").asText())
                .roadAddress(node.get("roadAddress").asText())
                .link(node.get("link").asText())
                .description(node.get("description").asText())
                .telephone(node.get("telephone").asText())
                .build();
    }

    public static List<NaverPlace> fromArray(ArrayNode arrayNode){
        return StreamSupport.stream(arrayNode.spliterator(), false)
                .map(NaverPlace::from)
                .toList();
    }

    private static String formatTitle(String title) {
        return title.replaceAll("<.*?>", "");
    }

    private static String formatX(String mapX) {
        return mapX.substring(0, 3) + "." + mapX.substring(3);
    }

    private static String formatY(String mapY) {
        return mapY.substring(0, 2) + "." + mapY.substring(2);
    }

    private static String formatCategory(String category) {
        String[] parts = category.split(">");
        return parts[parts.length - 1];
    }

    public static NaverPlace fromJsonNode(JsonNode node) {
        String title = node.has("roadAddress") && !node.get("roadAddress").asText().isEmpty()
                ? node.get("roadAddress").asText() : node.get("jibunAddress").asText();

        return NaverPlace.builder()
                .title(title)  // 도로명 또는 지번 주소
                .mapX(node.get("x").asText())
                .mapY(node.get("y").asText())
                .category(null)
                .address(node.get("jibunAddress").asText())  // 지번 주소
                .roadAddress(node.get("roadAddress").asText())  // 도로명 주소
                .link(null)
                .description(null)
                .telephone(null)
                .build();
    }
}