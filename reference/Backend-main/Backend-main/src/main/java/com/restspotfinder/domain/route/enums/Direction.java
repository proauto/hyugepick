package com.restspotfinder.domain.route.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum Direction {
    UP("상행"),
    DOWN("하행"),
    BOTH("양방향"),
    UNKNOWN("판별 불가");

    private final String label;
}
