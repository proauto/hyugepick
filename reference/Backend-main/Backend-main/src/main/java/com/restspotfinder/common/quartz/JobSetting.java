package com.restspotfinder.common.quartz;

import com.restspotfinder.common.quartz.job.PlaceSearchCountCreateJob;
import com.restspotfinder.common.quartz.job.RouteSearchCountCreateJob;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

import static org.quartz.JobBuilder.newJob;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class JobSetting {
    private final Scheduler scheduler;

    // 매일 11시 59분에 다음날 PlaceSearchCount 생성
    @PostConstruct
    public void createPlaceSearchCount(){
        JobDetail jobDetail = buildJobDetail(PlaceSearchCountCreateJob.class, new HashMap());
        try {
            scheduler.scheduleJob(jobDetail, buildJobTrigger("0 55 23 * * ?"));
        } catch (SchedulerException e){
            log.error(e.getMessage());
        }
    }

    // 매월 말일 오전 9시에 다음 달 RouteSearchCount 생성
    @PostConstruct
    public void createRouteSearchCount(){
        JobDetail jobDetail = buildJobDetail(RouteSearchCountCreateJob.class, new HashMap());
        try {
            scheduler.scheduleJob(jobDetail, buildJobTrigger("0 0 9 L * ?"));
        } catch (SchedulerException e){
            log.error(e.getMessage());
        }
    }

    public Trigger buildJobTrigger(String scheduleExp){
        return TriggerBuilder.newTrigger()
                .withSchedule(CronScheduleBuilder.cronSchedule(scheduleExp)).build();
    }

    public JobDetail buildJobDetail(Class job, Map params){
        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.putAll(params);

        return newJob(job).usingJobData(jobDataMap).build();
    }
}