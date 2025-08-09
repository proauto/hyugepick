package com.restspotfinder.domain.interchange.collection;

import com.restspotfinder.domain.interchange.entity.Interchange;
import com.restspotfinder.domain.route.enums.Direction;

import java.util.List;

public class Interchanges {
    private final List<Interchange> interchangeList;

    public Interchanges(List<Interchange> interchangeList) {
        this.interchangeList = interchangeList;
    }

    public Interchange getStart() {
        if (interchangeList.isEmpty()) {
            throw new IllegalStateException("교차로 목록이 비어 있습니다.");
        }
        return interchangeList.get(0);
    }

    public Interchange getEnd() {
        if (interchangeList.isEmpty()) {
            throw new IllegalStateException("교차로 목록이 비어 있습니다.");
        }
        return interchangeList.get(interchangeList.size() - 1);
    }

    public Direction calculateDirection() {
        if (interchangeList.size() < 2) {
            System.err.println("경로 판별 에러: 교차로가 부족합니다.");
            return Direction.UNKNOWN;
        }

        int weight = getStart().getWeight() - getEnd().getWeight();
        return weight > 0 ? Direction.UP : Direction.DOWN;
    }
}
