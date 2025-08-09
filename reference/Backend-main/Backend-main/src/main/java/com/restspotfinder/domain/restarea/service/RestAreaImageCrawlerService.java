//package com.restspotfinder.domain.restarea.service;
//
//import com.restspotfinder.domain.restarea.entity.RestArea;
//import com.restspotfinder.domain.restarea.repository.RestAreaRepository;
//import com.restspotfinder.restarea.response.CrawlResult;
//import jakarta.annotation.PreDestroy;
//import jakarta.transaction.Transactional;
//import lombok.extern.slf4j.Slf4j;
//import org.openqa.selenium.*;
//import org.openqa.selenium.support.ui.ExpectedConditions;
//import org.openqa.selenium.support.ui.WebDriverWait;
//import org.springframework.stereotype.Service;
//
//import java.time.Duration;
//import java.util.List;
//
//@Service
//@Slf4j
//@Transactional
//public class RestAreaImageCrawlerService {
//
//    private final WebDriver webDriver;
//    private final RestAreaRepository restAreaRepository;
//
//    public RestAreaImageCrawlerService(WebDriver webDriver, RestAreaRepository restAreaRepository) {
//        this.webDriver = webDriver;
//        this.restAreaRepository = restAreaRepository;
//    }
//
//    public CrawlResult crawlAllRestAreaImages() {
//        List<RestArea> restAreas = restAreaRepository.findAll();
//        int successCount = 0;
//        int failCount = 0;
//
//        log.info("네이버 지도 URL이 있는 휴게소 {}개 처리 시작", restAreas.size());
//
//        for (RestArea restArea : restAreas) {
//            try {
//                if (restArea.getMainImg() == null) {
//                    String imageUrl = crawlImageFromNaverMap(restArea.getNaverMapUrl());
//
//                    if (imageUrl != null) {
//                        restArea.setMainImg(imageUrl);
//                        restAreaRepository.save(restArea);
//                        successCount++;
//                        System.out.println("휴게소 = " + restArea.getName() + "image = " + imageUrl);
//                        log.info("휴게소 '{}' 이미지 URL 수집 완료: {}", restArea.getName(), imageUrl);
//                    } else {
//                        failCount++;
//                        System.err.println("휴게소 = " + restArea.getName() + " 실패");
//                        log.warn("휴게소 '{}' 이미지 URL 수집 실패", restArea.getName());
//                    }
//                } else {
//                    log.debug("휴게소 '{}' 이미지 URL 이미 존재", restArea.getName());
//                }
//
//                // 요청 간격 조절 (1초 대기)
//                Thread.sleep(1000);
//
//            } catch (Exception e) {
//                failCount++;
//                log.error("휴게소 '{}' 처리 중 오류: {}", restArea.getName(), e.getMessage(), e);
//            }
//        }
//
//        return CrawlResult.builder()
//                .totalCount(restAreas.size())
//                .successCount(successCount)
//                .failCount(failCount)
//                .build();
//    }
//
//    public String crawlImageFromNaverMap(String naverMapUrl) {
//        if (naverMapUrl == null || naverMapUrl.trim().isEmpty()) {
//            return null;
//        }
//
//        try {
//            webDriver.get(naverMapUrl);
//
//            // 페이지 로딩 대기
//            WebDriverWait wait = new WebDriverWait(webDriver, Duration.ofSeconds(10));
//
//            // 이미지 요소들을 찾기 위한 여러 시도
//            String imageUrl = null;
//
//            // 방법 1: place_thumb QX0J7 클래스를 가진 a 태그에서 img 추출
//            imageUrl = findImageBySpecificATag();
//            if (imageUrl != null) return imageUrl;
//
//            log.info("네이버 지도 URL에서 이미지를 찾을 수 없음: {}", naverMapUrl);
//            return null;
//
//        } catch (Exception e) {
//            log.error("네이버 지도 크롤링 중 오류: {}", e.getMessage(), e);
//            return null;
//        }
//    }
//
//    private String findImageBySpecificATag() {
//        try {
//            WebDriverWait wait = new WebDriverWait(webDriver, Duration.ofSeconds(10));
//
//            // entryIframe으로 switch
//            wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt("entryIframe"));
//
//            // iframe 내부에서 페이지 로딩 대기
//            Thread.sleep(3000);
//
//            // place_thumb QX0J7 클래스를 가진 a 태그 찾기
//            List<WebElement> aElements = webDriver.findElements(By.cssSelector("a.place_thumb.QX0J7"));
//
//            for (WebElement aElement : aElements) {
//                // a 태그 내부의 img 태그 찾기
//                List<WebElement> imgElements = aElement.findElements(By.tagName("img"));
//
//                for (WebElement img : imgElements) {
//                    String src = img.getAttribute("src");
//                    if (isValidImageUrl(src)) {
//                        log.info("유효한 이미지 URL 발견: {}", src);
//                        return src;
//                    }
//                }
//            }
//
//        } catch (Exception e) {
//            log.warn("place_thumb QX0J7 클래스 검색 중 오류: {}", e.getMessage());
//        } finally {
//            // 메인 프레임으로 다시 전환
//            try {
//                webDriver.switchTo().defaultContent();
//            } catch (Exception e) {
//                log.warn("메인 프레임 전환 실패: {}", e.getMessage());
//            }
//        }
//        return null;
//    }
//
////    private String findImageBySpecificATag() {
////        System.out.println("findImageBySpecificATag 들어옴");
////        try {
////            WebDriverWait wait = new WebDriverWait(webDriver, Duration.ofSeconds(20));
////
////            // place_thumb QX0J7 클래스를 가진 a 태그 찾기
////            List<WebElement> aElements = wait.until(ExpectedConditions.presenceOfAllElementsLocatedBy(
////                    By.cssSelector("a.place_thumb.QX0J7")));
////
////            log.info("place_thumb QX0J7 클래스를 가진 a 태그 {}개 발견", aElements.size());
////            System.out.println("place_thumb QX0J7 클래스를 가진 a 태그 " + aElements.size() + "개 발견");
////
////            for (WebElement aElement : aElements) {
////                // a 태그 내부의 img 태그 찾기
////                List<WebElement> imgElements = aElement.findElements(By.tagName("img"));
////                log.info("a 태그 내부 img 태그 {}개 발견", imgElements.size());
////                System.out.println("a 태그 내부 img 태그 " + imgElements.size() + "개 발견");
////
////                for (WebElement img : imgElements) {
////                    String src = img.getAttribute("src");
////                    log.info("발견된 이미지 URL: {}", src);
////                    System.out.println("발견된 이미지 URL: " + src);
////
////                    if (isValidImageUrl(src)) {
////                        log.info("유효한 이미지 URL 발견: {}", src);
////                        System.out.println("유효한 이미지 URL 발견: " + src);
////                        return src;
////                    } else {
////                        System.out.println("유효하지 않은 이미지 URL: " + src);
////                    }
////                }
////            }
////        } catch (TimeoutException e) {
////            log.info("place_thumb QX0J7 클래스를 가진 a 태그를 찾을 수 없음 (TimeoutException)");
////            System.out.println("place_thumb QX0J7 클래스를 가진 a 태그를 찾을 수 없음 (TimeoutException)");
////        } catch (Exception e) {
////            log.warn("place_thumb QX0J7 클래스 검색 중 오류: {}", e.getMessage());
////            System.out.println("place_thumb QX0J7 클래스 검색 중 오류: " + e.getMessage());
////            e.printStackTrace();
////        }
////        System.out.println("findImageBySpecificATag null 반환");
////        return null;
////    }
//
//    private String findImageByClassName(String className) {
//        try {
//            WebDriverWait wait = new WebDriverWait(webDriver, Duration.ofSeconds(5));
//
//            // 일반적인 className으로 시도
//            List<WebElement> imageElements = webDriver.findElements(By.className(className));
//            for (WebElement img : imageElements) {
//                String src = img.getAttribute("src");
//                if (isValidImageUrl(src)) {
//                    return src;
//                }
//            }
//        } catch (TimeoutException e) {
//            log.debug("클래스명 '{}'로 이미지를 찾을 수 없음", className);
//        }
//        return null;
//    }
//
//    private String findImageByGenericSelector() {
//        try {
//            // 네이버 지도에서 자주 사용되는 이미지 셀렉터들
//            String[] selectors = {
//                    "a.place_thumb.QX0J7 img",  // 특정 클래스의 a 태그 내 img
//                    "a.place_thumb img",        // place_thumb 클래스의 a 태그 내 img
//                    "img[src*='pstatic.net']",
//                    "img[src*='naver.net']",
//                    ".place_thumb img",
//                    ".photo_area img",
//                    ".list_photo img"
//            };
//
//            for (String selector : selectors) {
//                List<WebElement> images = webDriver.findElements(By.cssSelector(selector));
//                log.debug("셀렉터 '{}' - {}개 이미지 발견", selector, images.size());
//
//                for (WebElement img : images) {
//                    String src = img.getAttribute("src");
//                    if (isValidImageUrl(src)) {
//                        log.info("유효한 이미지 URL 발견 (셀렉터: {}): {}", selector, src);
//                        return src;
//                    }
//                }
//            }
//        } catch (Exception e) {
//            log.debug("일반 셀렉터로 이미지 검색 실패: {}", e.getMessage());
//        }
//        return null;
//    }
//
//    private boolean isValidImageUrl(String url) {
//        if (url == null || url.trim().isEmpty()) {
//            return false;
//        }
//
//        return url.startsWith("http") &&
//                (url.contains(".jpg") || url.contains(".jpeg") || url.contains(".png") || url.contains(".gif")) &&
//                !url.contains("icon") &&
//                !url.contains("logo") &&
//                !url.contains("btn") &&
//                !url.contains("arrow");
//    }
//
//    @PreDestroy
//    public void cleanup() {
//        if (webDriver != null) {
//            webDriver.quit();
//        }
//    }
//}