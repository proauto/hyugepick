//package com.restspotfinder.domain.restarea.controller;
//
//import com.restspotfinder.domain.restarea.entity.RestArea;
//import com.restspotfinder.domain.restarea.repository.RestAreaRepository;
//import com.restspotfinder.domain.restarea.service.RestAreaImageCrawlerService;
//import com.restspotfinder.restarea.response.CrawlResult;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//import com.restspotfinder.exception.BusinessException;
//import com.restspotfinder.domain.restarea.error.RestAreaErrorCode;
//
//import java.util.HashMap;
//import java.util.Map;
//
//@RestController
//@RequestMapping("/api/restarea-crawler")
//@Slf4j
//public class RestAreaCrawlerController {
//
//    private final RestAreaImageCrawlerService crawlerService;
//    private final RestAreaRepository restAreaRepository;
//
//    public RestAreaCrawlerController(RestAreaImageCrawlerService crawlerService,
//                                     RestAreaRepository restAreaRepository) {
//        this.crawlerService = crawlerService;
//        this.restAreaRepository = restAreaRepository;
//    }
//
//    @PostMapping("/crawl-images")
//    public ResponseEntity<CrawlResult> crawlAllImages() {
//        try {
//            log.info("RestArea 이미지 크롤링 시작");
//
//            CrawlResult result = crawlerService.crawlAllRestAreaImages();
//            result.setMessage(String.format("크롤링 완료 - 성공: %d개, 실패: %d개, 성공률: %.1f%%",
//                    result.getSuccessCount(),
//                    result.getFailCount(),
//                    result.getSuccessRate()));
//
//            return ResponseEntity.ok(result);
//
//        } catch (Exception e) {
//            log.error("크롤링 요청 처리 실패: {}", e.getMessage(), e);
//
//            CrawlResult errorResult = CrawlResult.builder()
//                    .totalCount(0)
//                    .successCount(0)
//                    .failCount(0)
//                    .message("크롤링 중 오류가 발생했습니다: " + e.getMessage())
//                    .build();
//
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResult);
//        }
//    }
//
//
//    @PostMapping("/crawl-single/{restAreaId}")
//    public ResponseEntity<Map<String, Object>> crawlSingleRestArea(@PathVariable Long restAreaId) {
//        try {
//            RestArea restArea = restAreaRepository.findById(restAreaId)
//                    .orElseThrow(() -> new BusinessException(RestAreaErrorCode.NOT_FOUND));
//
//            if (restArea.getNaverMapUrl() == null) {
//                throw new BusinessException(RestAreaErrorCode.NAVER_MAP_URL_NOT_FOUND);
//            }
//
//            String imageUrl = crawlerService.crawlImageFromNaverMap(restArea.getNaverMapUrl());
//
//            Map<String, Object> result = new HashMap<>();
//            if (imageUrl != null) {
//                restArea.setMainImg(imageUrl);
//                restAreaRepository.save(restArea);
//
//                result.put("success", true);
//                result.put("imageUrl", imageUrl);
//                result.put("message", "이미지 URL 수집 완료");
//            } else {
//                result.put("success", false);
//                result.put("message", "이미지를 찾을 수 없습니다.");
//            }
//
//            return ResponseEntity.ok(result);
//
//        } catch (Exception e) {
//            Map<String, Object> errorResult = new HashMap<>();
//            errorResult.put("success", false);
//            errorResult.put("message", e.getMessage());
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResult);
//        }
//    }
//}