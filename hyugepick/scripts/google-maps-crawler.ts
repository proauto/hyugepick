/**
 * 구글지도 크롤링을 통한 민자고속도로 휴게소 좌표 정확도 개선
 * Selenium WebDriver를 사용하여 자동화된 좌표 추출
 */

import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Supabase 설정
const supabaseUrl = 'https://dwkwpadrpbesphtextap.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3a3dwYWRycGJlc3BodGV4dGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDM2MTEsImV4cCI6MjA3MDExOTYxMX0.UvPyWXYK5F7NygMxiRJFP3eLlfu5A1Wfr1vSHDDRiGo';
const supabase = createClient(supabaseUrl, supabaseKey);

interface CrawlingTarget {
  id: string;
  name: string;
  route: string;
  currentLat: number;
  currentLng: number;
  searchQuery: string;
}

interface CrawlingResult {
  id: string;
  name: string;
  success: boolean;
  newLat?: number;
  newLng?: number;
  error?: string;
  url?: string;
}

class GoogleMapsCrawler {
  private driver: WebDriver | null = null;
  private results: CrawlingResult[] = [];

  async initialize() {
    console.log('🚀 Chrome WebDriver 초기화...');
    
    const chrome = require('selenium-webdriver/chrome');
    const options = new chrome.Options();
    
    // Chrome 설치 경로 자동 감지 시도
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.CHROME_BIN
    ].filter(Boolean);
    
    let chromePath = null;
    const fs = require('fs');
    
    for (const path of possiblePaths) {
      if (path && fs.existsSync(path)) {
        chromePath = path;
        console.log(`✅ Chrome 발견: ${chromePath}`);
        break;
      }
    }
    
    if (chromePath) {
      options.setChromeBinaryPath(chromePath);
    }
    
    // 더 안전한 옵션들 (헤드리스 모드 해제하여 디버깅 가능)
    // options.addArguments('--headless'); // 일단 헤드리스 해제
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--disable-extensions');
    
    // User-Agent 설정
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    try {
      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
        
      console.log('✅ WebDriver 초기화 완료');
    } catch (error) {
      console.error('❌ WebDriver 초기화 실패:', error);
      console.log('\n💡 해결 방법:');
      console.log('1. Chrome 브라우저가 설치되어 있는지 확인');
      console.log('2. ChromeDriver 버전과 Chrome 브라우저 버전이 호환되는지 확인');
      console.log('3. Windows Defender나 백신에서 차단하지 않는지 확인');
      throw error;
    }
  }

  async crawlCoordinates(target: CrawlingTarget): Promise<CrawlingResult> {
    if (!this.driver) {
      throw new Error('WebDriver가 초기화되지 않았습니다.');
    }

    const result: CrawlingResult = {
      id: target.id,
      name: target.name,
      success: false
    };

    try {
      console.log(`🔍 검색 중: ${target.searchQuery}`);
      
      // 구글지도 접속
      await this.driver.get('https://maps.google.com');
      await this.driver.sleep(2000);
      
      // 검색창 찾기 및 검색어 입력
      const searchBox = await this.driver.wait(
        until.elementLocated(By.css('input[data-value="검색"]')),
        10000
      );
      
      await searchBox.clear();
      await searchBox.sendKeys(target.searchQuery);
      await this.driver.sleep(1000);
      
      // 검색 실행
      await searchBox.sendKeys('\n');
      await this.driver.sleep(3000);
      
      // 검색 결과 대기
      await this.driver.wait(
        until.elementLocated(By.css('[data-result-index="0"]')),
        10000
      );
      
      // 첫 번째 검색 결과 클릭
      const firstResult = await this.driver.findElement(By.css('[data-result-index="0"]'));
      await firstResult.click();
      await this.driver.sleep(2000);
      
      // URL에서 좌표 추출 시도
      const currentUrl = await this.driver.getCurrentUrl();
      console.log(`📍 현재 URL: ${currentUrl}`);
      
      const coords = this.extractCoordsFromUrl(currentUrl);
      if (coords) {
        result.success = true;
        result.newLat = coords.lat;
        result.newLng = coords.lng;
        result.url = currentUrl;
        console.log(`✅ 좌표 추출 성공: ${coords.lat}, ${coords.lng}`);
      } else {
        // URL에서 추출 실패시 다른 방법 시도
        const alternativeCoords = await this.extractCoordsFromPage();
        if (alternativeCoords) {
          result.success = true;
          result.newLat = alternativeCoords.lat;
          result.newLng = alternativeCoords.lng;
          result.url = currentUrl;
          console.log(`✅ 페이지에서 좌표 추출 성공: ${alternativeCoords.lat}, ${alternativeCoords.lng}`);
        } else {
          result.error = '좌표 추출 실패';
          console.log('❌ 좌표 추출 실패');
        }
      }
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ 오류 발생: ${result.error}`);
    }
    
    return result;
  }

  private extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
    // URL 패턴: @위도,경도,줌레벨z
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+),\d+z/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      // 한국 영토 내 좌표인지 검증
      if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
        return { lat, lng };
      }
    }
    
    // 다른 URL 패턴 시도
    const match2 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (match2) {
      const lat = parseFloat(match2[1]);
      const lng = parseFloat(match2[2]);
      
      if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
        return { lat, lng };
      }
    }
    
    return null;
  }

  private async extractCoordsFromPage(): Promise<{ lat: number; lng: number } | null> {
    if (!this.driver) return null;
    
    try {
      // 우클릭으로 좌표 정보 확인 시도
      const mapElement = await this.driver.findElement(By.css('[role="main"]'));
      
      // 액션 체인으로 우클릭
      const actions = this.driver.actions();
      await actions.contextClick(mapElement).perform();
      await this.driver.sleep(1000);
      
      // 좌표 정보가 있는 요소 찾기
      const coordElements = await this.driver.findElements(By.css('[data-value]'));
      
      for (const element of coordElements) {
        const text = await element.getText();
        const match = text.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          
          if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
            return { lat, lng };
          }
        }
      }
      
    } catch (error) {
      console.warn('페이지에서 좌표 추출 중 오류:', error);
    }
    
    return null;
  }

  async crawlAllTargets(targets: CrawlingTarget[]): Promise<CrawlingResult[]> {
    console.log(`🎯 총 ${targets.length}개 휴게소 좌표 크롤링 시작`);
    
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      console.log(`\n[${i + 1}/${targets.length}] ${target.name} 처리 중...`);
      
      const result = await this.crawlCoordinates(target);
      this.results.push(result);
      
      // 요청 간격 조절 (2초 대기)
      if (i < targets.length - 1) {
        console.log('⏳ 2초 대기 중...');
        await this.driver?.sleep(2000);
      }
    }
    
    return this.results;
  }

  async updateDatabase(results: CrawlingResult[]): Promise<void> {
    console.log('\n📝 데이터베이스 업데이트 시작...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const result of results) {
      if (result.success && result.newLat && result.newLng) {
        try {
          const { error } = await supabase
            .from('rest_areas')
            .update({
              coordinates: {
                lat: result.newLat,
                lng: result.newLng
              }
            })
            .eq('id', result.id);
          
          if (error) {
            console.error(`❌ DB 업데이트 실패 (${result.name}):`, error);
            failCount++;
          } else {
            console.log(`✅ DB 업데이트 성공: ${result.name} -> (${result.newLat}, ${result.newLng})`);
            successCount++;
          }
          
        } catch (error) {
          console.error(`❌ DB 업데이트 오류 (${result.name}):`, error);
          failCount++;
        }
      } else {
        failCount++;
      }
    }
    
    console.log(`\n📊 업데이트 결과: 성공 ${successCount}개, 실패 ${failCount}개`);
  }

  async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      totalTargets: this.results.length,
      successful: this.results.filter(r => r.success).length,
      failed: this.results.filter(r => !r.success).length,
      results: this.results
    };
    
    const reportPath = './scripts/google-maps-crawling-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log(`\n📄 크롤링 리포트 저장: ${reportPath}`);
    console.log(`📊 성공률: ${((report.successful / report.totalTargets) * 100).toFixed(1)}%`);
  }

  async cleanup(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      console.log('🧹 WebDriver 정리 완료');
    }
  }
}

async function main() {
  const crawler = new GoogleMapsCrawler();
  
  try {
    // 크롤링 대상 로드
    const targetsPath = './scripts/private-highway-crawling-targets.json';
    if (!fs.existsSync(targetsPath)) {
      console.error('❌ 크롤링 대상 파일이 없습니다. 먼저 analyze-private-highway-rest-areas.ts를 실행하세요.');
      return;
    }
    
    const targetData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
    const targets: CrawlingTarget[] = targetData.targets;
    
    console.log('🚀 구글지도 크롤링 시작');
    console.log('=' .repeat(80));
    
    // WebDriver 초기화
    await crawler.initialize();
    
    // 테스트 모드: 처음 3개만 크롤링
    const testTargets = targets.slice(0, 3);
    console.log(`⚡ 테스트 모드: ${testTargets.length}개 휴게소만 처리`);
    
    // 크롤링 실행
    const results = await crawler.crawlAllTargets(testTargets);
    
    // 데이터베이스 업데이트
    await crawler.updateDatabase(results);
    
    // 리포트 생성
    await crawler.generateReport();
    
    console.log('\n✅ 크롤링 작업 완료');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ 크롤링 중 치명적 오류:', error);
  } finally {
    await crawler.cleanup();
    process.exit(0);
  }
}

// 스크립트 실행
main();