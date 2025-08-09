package com.restspotfinder.domain.route.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.restspotfinder.domain.route.enums.RouteOption;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.locationtech.jts.geom.Coordinate;

import java.util.ArrayList;
import java.util.List;


@Getter
@Builder
@AllArgsConstructor
public class NaverRoute {
    private RouteOption option; // 경로 옵션
    private String distance; // 거리 단위 (m)
    private String duration; // 시간 단위 (ms)
    private String tollFare; // 통행료
    private String fuelPrice; // 연료비
    private Coordinate[] path;

    public static NaverRoute from(JsonNode jsonNode, RouteOption option){
        return NaverRoute.builder()
                .option(option)
                .distance(extractText(jsonNode, option,"distance"))
                .duration(extractText(jsonNode, option,"duration"))
                .tollFare(extractText(jsonNode, option,"tollFare"))
                .fuelPrice(extractText(jsonNode, option,"fuelPrice"))
                .path(extractPath(jsonNode,option))
                .build();
    }

    public static List<NaverRoute> fromList(JsonNode jsonNode, List<RouteOption> optionList) {
        return optionList.stream().map(option -> NaverRoute.from(jsonNode, option)).toList();
    }

    public static String extractText(JsonNode node, RouteOption option, String term){
       return node.get("route").get(option.getValue()).get(0).get("summary").get(term).asText();
    }

    public static Coordinate[] extractPath(JsonNode jsonNode, RouteOption option){
        ArrayNode pathNode = (ArrayNode) jsonNode.get("route").get(option.getValue()).get(0).get("path");
        List<Coordinate> path = new ArrayList<>();
        for (JsonNode node : pathNode) {
            double x = node.get(0).asDouble();
            double y = node.get(1).asDouble();
            path.add(new Coordinate(x, y));
        }
        return path.toArray(new Coordinate[0]);
    }
}
