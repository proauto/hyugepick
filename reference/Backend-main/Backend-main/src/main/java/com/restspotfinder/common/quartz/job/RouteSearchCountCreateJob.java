package com.restspotfinder.common.quartz.job;

import com.restspotfinder.domain.apicount.entity.RouteSearchCount;
import com.restspotfinder.domain.apicount.repository.RouteSearchCountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.JobExecutionContext;
import org.springframework.scheduling.quartz.QuartzJobBean;

import java.time.LocalDate;

@Slf4j
@RequiredArgsConstructor
public class RouteSearchCountCreateJob extends QuartzJobBean {
    private final RouteSearchCountRepository routeSearchCountRepository;

    @Override
    protected void executeInternal(JobExecutionContext jobExecutionContext) {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        routeSearchCountRepository.save(RouteSearchCount.init(tomorrow));
    }
}