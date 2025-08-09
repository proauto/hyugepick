package com.restspotfinder.domain.search.enums;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;


@Getter
@Schema(enumAsRef = true, description = """
        검색 타입:
        * `route` - 경로 검색
        * `recent` - 최근 경로 검색 by SearchId
        """)
public enum SearchType {
    recent("recent", "최근 경로 검색"),
    route("route", "경로 검색");

    private final String value;
    private final String desc;

    SearchType(String value, String desc) {
        this.value = value;
        this.desc = desc;
    }
}