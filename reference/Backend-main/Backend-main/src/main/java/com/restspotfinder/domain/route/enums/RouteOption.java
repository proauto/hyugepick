package com.restspotfinder.domain.route.enums;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

import java.util.List;

@Getter
@Schema(enumAsRef = true, description = """
        경로 탐색 옵션:
        * `fast` - 실시간 빠른길
        * `optimal` - 실시간 최적
        * `comfort` - 실시간 편한길
        * `avoidtoll` - 무료 우선
        * `avoidcaronly` - 자동차 전용 도로 회피 우선
        """)
public enum RouteOption {
    fast("trafast", "실시간 빠른길"),
    optimal("traoptimal", "실시간 최적"),
    comfort("tracomfort", "실시간 편한길"),
    avoidtoll("traavoidtoll", "무료 우선"),
    avoidcaronly("traavoidcaronly", "자동차 전용 도로 회피 우선");

    private final String value;
    private final String desc;

    RouteOption(String value, String desc) {
        this.value = value;
        this.desc = desc;
    }

    public static String getOptionValues(int page) {
        return (page == 1) ? fast.getValue() + ":" + optimal.getValue() + ":" + comfort.getValue()
                : avoidtoll.getValue() + ":" + avoidcaronly.getValue();
    }

    public static List<RouteOption> getOptionList(int page) {
        return (page == 1) ? List.of(fast, optimal, comfort)
                : List.of(avoidtoll, avoidcaronly);
    }
}
