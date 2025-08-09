package com.restspotfinder.domain.route.collection;

import com.restspotfinder.domain.route.entity.Route;

import java.util.List;

public record Routes(List<Route> routeList) {

    public String getStartName() {
        return routeList.get(0).getStartName();
    }

    public String getGoalName() {
        return routeList.get(0).getGoalName();
    }
}