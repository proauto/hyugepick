package com.restspotfinder.domain.search.entity;

import com.restspotfinder.domain.route.collection.Routes;
import com.restspotfinder.domain.route.controller.request.RouteRequestDTO;
import com.restspotfinder.domain.search.enums.SearchType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Search {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long searchId;
    @Enumerated(EnumType.STRING)
    private SearchType type; // ex) recent, route
    private String startName;
    private String goalName;
    private LocalDateTime createdAt;

    public static Search fromRequestDTO(RouteRequestDTO routeRequestDTO){
        return Search.builder()
                .type(SearchType.route)
                .startName(routeRequestDTO.getStartName())
                .goalName(routeRequestDTO.getGoalName())
                .createdAt(LocalDateTime.now())
                .build();
    }

    public static Search fromRoutes(Routes routes){
        return Search.builder()
                .type(SearchType.route)
                .startName(routes.getStartName())
                .goalName(routes.getGoalName())
                .createdAt(LocalDateTime.now())
                .build();
    }

    public static Search fromSearch(){
        return Search.builder()
                .type(SearchType.recent)
                .createdAt(LocalDateTime.now())
                .build();
    }
}