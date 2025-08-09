package com.restspotfinder.domain.fuel.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.fasterxml.jackson.databind.JsonNode;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FuelStation {

    @Id
    private String serviceAreaCode; // 영업부대시설코드

    private String serviceAreaName; // 주유소명
    private String routeName; // 노선명
    private String direction; // 방향
    private String gasolinePrice; // 휘발유가격
    private String diselPrice; // 경유가격
    private String lpgPrice; // LPG가격
    private String oilCompany;
    private String telNo; // 전화번호
    private String svarAddr; // 휴게소주소

    public static FuelStation from(JsonNode node) {
        return FuelStation.builder()
                .serviceAreaCode(node.path("serviceAreaCode").asText())
                .serviceAreaName(node.path("serviceAreaName").asText())
                .routeName(node.path("routeName").asText())
                .direction(node.path("direction").asText())
                .gasolinePrice(node.path("gasolinePrice").asText())
                .diselPrice(node.path("diselPrice").asText())
                .lpgPrice(node.path("lpgPrice").asText())
                .oilCompany(node.path("oilCompany").asText())
                .telNo(node.path("telNo").asText())
                .svarAddr(node.path("svarAddr").asText())
                .build();
    }
}
