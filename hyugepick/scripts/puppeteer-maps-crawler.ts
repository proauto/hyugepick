/**
 * Puppeteer를 사용한 구글지도 크롤링 (Selenium 대체)
 * 더 안정적이고 빠른 크롤링
 */

import puppeteer from 'puppeteer';
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

class PuppeteerMapsCrawler {
  private results: CrawlingResult[] = [];

  async crawlCoordinates(target: CrawlingTarget): Promise<CrawlingResult> {
    const result: CrawlingResult = {
      id: target.id,
      name: target.name,
      success: false
    };

    let browser = null;

    try {
      console.log(`🔍 검색 중: ${target.searchQuery}`);
      
      // 브라우저 실행
      browser = await puppeteer.launch({
        headless: false, // 브라우저 창 보이게 (디버깅용)
        defaultViewport: null, // 전체화면 사용
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--start-maximized' // 창을 최대화된 상태로 시작
        ]
      });

      const page = await browser.newPage();
      
      // User-Agent 설정
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log('🌐 구글지도 접속 중...');
      await page.goto('https://maps.google.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 검색창 찾기 및 검색어 입력
      console.log(`🔎 "${target.searchQuery}" 검색 중...`);
      
      const searchSelector = '#searchboxinput';
      await page.waitForSelector(searchSelector, { timeout: 10000 });
      
      await page.click(searchSelector);
      await page.type(searchSelector, target.searchQuery);
      await page.keyboard.press('Enter');
      
      // 검색 결과 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 스크린샷 촬영 (디버깅용)
      await page.screenshot({ 
        path: `./scripts/screenshots/search-result-${Date.now()}.png`,
        fullPage: true 
      });
      console.log('📸 검색 결과 스크린샷 촬영 완료');
      
      try {
        // 지도상의 빨간 마커 찾기 및 우클릭
        console.log('🗺️ 지도에서 빨간 마커 찾는 중...');
        
        // 구글지도 마커 찾기 (단순화된 접근)
        const redMarkersInfo = await page.evaluate(() => {
          const markers = [];
          
          try {
            // 1. 구글지도 특화 셀렉터로 마커 찾기
            const selectors = [
              '[data-value*="결과"]',
              '[aria-label*="결과"]', 
              '[role="button"]',
              'img[src*="marker"]',
              'img[src*="pin"]',
              '[jsaction]',
              'div[data-value]'
            ];
            
            selectors.forEach(selector => {
              try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                  const rect = element.getBoundingClientRect();
                  const ariaLabel = element.getAttribute('aria-label') || '';
                  
                  if (rect.width > 0 && rect.height > 0 && rect.top > 50) {
                    markers.push({
                      type: 'GOOGLE_MARKER',
                      tagName: element.tagName,
                      className: element.className || '',
                      ariaLabel: ariaLabel,
                      src: element.src || '',
                      selector: selector,
                      rect: {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        width: rect.width,
                        height: rect.height
                      }
                    });
                  }
                });
              } catch (e) {
                console.log('셀렉터 오류:', selector, e);
              }
            });
            
            // 2. 텍스트 기반으로 휴게소 관련 요소 찾기
            const textElements = document.querySelectorAll('*');
            for (let i = 0; i < Math.min(textElements.length, 1000); i++) {
              try {
                const element = textElements[i];
                const text = element.textContent || '';
                const ariaLabel = element.getAttribute('aria-label') || '';
                
                if ((text.includes('휴게소') || text.includes('새마을') || ariaLabel.includes('휴게소')) && 
                    element.getBoundingClientRect) {
                  const rect = element.getBoundingClientRect();
                  if (rect.width > 10 && rect.height > 10 && rect.top > 50) {
                    markers.push({
                      type: 'TEXT_MARKER',
                      tagName: element.tagName,
                      className: element.className || '',
                      ariaLabel: ariaLabel,
                      textContent: text.substring(0, 100),
                      rect: {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        width: rect.width,
                        height: rect.height
                      }
                    });
                  }
                }
              } catch (e) {
                continue;
              }
            }
            
          } catch (error) {
            console.log('마커 검색 오류:', error);
          }
          
          return markers.slice(0, 15);
        });
        
        console.log(`🗺️ 발견된 마커들 (${redMarkersInfo.length}개):`, 
          redMarkersInfo.map(m => ({ type: m.type, ariaLabel: m.ariaLabel, rgb: m.rgb })));
        
        let markerFound = false;
        
        if (redMarkersInfo.length > 0) {
          // 실제 휴게소 결과만 필터링 (방향 정보 고려)
          const actualRestAreas = redMarkersInfo.filter(marker => {
            const ariaLabel = marker.ariaLabel || '';
            const baseName = target.name.replace('휴게소', '');
            
            // direction이 있는 경우 해당 방향과 매칭
            if (target.direction) {
              const targetDirection = target.direction.replace('방향', '');
              return ariaLabel.includes(baseName) && ariaLabel.includes(targetDirection + '방향');
            } else {
              // direction이 없는 경우 기본 이름만 매칭
              return ariaLabel.includes(baseName) || ariaLabel.includes(target.name);
            }
          });
          
          console.log(`🎯 실제 휴게소 마커 ${actualRestAreas.length}개 발견`);
          
          if (actualRestAreas.length > 0) {
            // 첫 번째 실제 휴게소를 클릭하여 해당 위치로 이동
            const targetRestArea = actualRestAreas[0];
            console.log(`🖱️ 휴게소 선택: ${targetRestArea.ariaLabel}`);
            
            try {
              // 일반 클릭으로 휴게소 정보 패널 열기
              await page.mouse.click(targetRestArea.rect.x, targetRestArea.rect.y);
              await new Promise(resolve => setTimeout(resolve, 3000)); // 페이지 로딩 대기
              
              // URL이 변경되었는지 확인
              const newUrl = await page.url();
              console.log(`📍 새로운 URL: ${newUrl}`);
              
              // 일단 URL에서 좌표 저장
              const urlCoords = this.extractCoordsFromUrl(newUrl);
              if (urlCoords) {
                result.success = true;
                result.newLat = urlCoords.lat;
                result.newLng = urlCoords.lng;
                result.url = newUrl;
                console.log(`✅ URL에서 좌표 추출 성공: ${urlCoords.lat}, ${urlCoords.lng}`);
              }
              
              // 추가로 지도 마커에서 오른쪽 클릭하여 더 정확한 좌표 확인
              console.log('🗺️ 지도 마커에서 오른쪽 클릭으로 정확한 좌표 확인');
              
              try {
                // 지도 중앙 영역에서 마커 오른쪽 클릭
                await page.mouse.click(800, 400, { button: 'right' });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // "이 위치 공유" 메뉴 찾기
                const shareSelectors = [
                  '[data-value*="공유"]',
                  '[aria-label*="공유"]',
                  'div:contains("이 위치 공유")',
                  '[role="menuitem"]'
                ];
                
                let shareMenuFound = false;
                for (const selector of shareSelectors) {
                  try {
                    const shareElement = await page.waitForSelector(selector, { timeout: 2000 });
                    if (shareElement) {
                      const text = await shareElement.evaluate(el => el.textContent);
                      if (text && text.includes('공유')) {
                        console.log(`✅ "이 위치 공유" 메뉴 발견: ${text}`);
                        await shareElement.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        shareMenuFound = true;
                        break;
                      }
                    }
                  } catch (e) {
                    continue;
                  }
                }
                
                if (shareMenuFound) {
                  // 공유 대화상자에서 URL 확인
                  const shareUrl = await page.url();
                  const shareCoords = this.extractCoordsFromUrl(shareUrl);
                  if (shareCoords && (!urlCoords || (Math.abs(shareCoords.lat - urlCoords.lat) < 0.001 && Math.abs(shareCoords.lng - urlCoords.lng) < 0.001))) {
                    // 좌표가 더 정확하거나 차이가 미미하면 업데이트
                    result.newLat = shareCoords.lat;
                    result.newLng = shareCoords.lng;
                    result.url = shareUrl;
                    console.log(`🎯 오른쪽 클릭으로 좌표 확인: ${shareCoords.lat}, ${shareCoords.lng}`);
                  }
                } else {
                  console.log('⚠️ "이 위치 공유" 메뉴를 찾지 못함');
                }
              } catch (rightClickError) {
                console.log('⚠️ 오른쪽 클릭 시도 실패:', rightClickError);
              }
              
              markerFound = true;
              
            } catch (clickError) {
              console.log(`⚠️ 휴게소 클릭 실패:`, clickError);
            }
          }
        }
        
        if (!markerFound) {
          // 기존 방식으로 폴백
          console.log('🗺️ 기존 방식으로 마커 찾기 시도');
          const fallbackSelectors = [
            `[aria-label*="${target.name}"]`,
            '[role="button"][aria-label*="결과"]'
          ];
          
          for (const selector of fallbackSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              console.log(`✅ 폴백 마커 발견: ${selector}`);
              
              await page.click(selector, { button: 'right' });
              console.log('🖱️ 폴백 마커 우클릭 완료');
              
              markerFound = true;
              break;
            } catch (selectorError) {
              continue;
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 우클릭 후 스크린샷 촬영
        await page.screenshot({ 
          path: `./scripts/screenshots/right-click-${Date.now()}.png`,
          fullPage: true 
        });
        console.log('📸 우클릭 후 스크린샷 촬영 완료');
        
        // 페이지에서 좌표 텍스트 직접 검색
        const coordsFromPage = await page.evaluate(() => {
          // 페이지의 모든 텍스트에서 좌표 패턴 찾기
          const allText = document.body.innerText;
          
          // 다양한 좌표 패턴 시도
          const patterns = [
            /(\d{2}\.\d{6}),\s*(\d{3}\.\d{6})/g, // 35.594658, 128.769719
            /(\d{2}\.\d+),\s*(\d{3}\.\d+)/g,     // 일반적인 패턴
            /위도[:\s]*(\d{2}\.\d+)[,\s]*경도[:\s]*(\d{3}\.\d+)/gi, // 한국어 패턴
            /lat[:\s]*(\d{2}\.\d+)[,\s]*lng[:\s]*(\d{3}\.\d+)/gi, // 영어 패턴
          ];
          
          for (const pattern of patterns) {
            const matches = allText.matchAll(pattern);
            for (const match of matches) {
              const lat = parseFloat(match[1]);
              const lng = parseFloat(match[2]);
              
              // 한국 영토 내 좌표인지 검증
              if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
                console.log(`좌표 발견: ${lat}, ${lng}`);
                return { lat, lng };
              }
            }
          }
          
          return null;
        });
        
        if (coordsFromPage) {
          result.success = true;
          result.newLat = coordsFromPage.lat;
          result.newLng = coordsFromPage.lng;
          result.url = page.url();
          console.log(`✅ 페이지에서 좌표 추출 성공: ${coordsFromPage.lat}, ${coordsFromPage.lng}`);
        } else {
          console.log('⚠️ 페이지에서 좌표 텍스트 찾기 실패');
        }
        
      } catch (clickError) {
        console.log('⚠️ 마커 우클릭 실패:', clickError);
      }
      
      // URL에서 좌표 추출 (우클릭 후 URL이 변경될 수 있음)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentUrl = await page.url();
      console.log(`📍 현재 URL: ${currentUrl}`);
      
      const coords = this.extractCoordsFromUrl(currentUrl);
      if (coords) {
        result.success = true;
        result.newLat = coords.lat;
        result.newLng = coords.lng;
        result.url = currentUrl;
        console.log(`✅ 좌표 추출 성공: ${coords.lat}, ${coords.lng}`);
      } else {
        // 페이지에서 직접 좌표 정보 찾기 시도
        try {
          // 지도 우클릭으로 좌표 정보 확인
          await page.click('[role="main"]', { button: 'right' });
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 좌표가 포함된 텍스트 찾기
          const coordText = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            for (const element of elements) {
              const text = element.textContent || '';
              const match = text.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
              if (match) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
                  return { lat, lng };
                }
              }
            }
            return null;
          });
          
          if (coordText) {
            result.success = true;
            result.newLat = coordText.lat;
            result.newLng = coordText.lng;
            result.url = currentUrl;
            console.log(`✅ 페이지에서 좌표 추출 성공: ${coordText.lat}, ${coordText.lng}`);
          } else {
            result.error = '좌표 추출 실패';
            result.url = currentUrl;
            console.log('❌ 좌표 추출 실패');
          }
          
        } catch (pageError) {
          result.error = '페이지 처리 오류';
          console.log('❌ 페이지 처리 오류:', pageError);
        }
      }
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ 오류 발생: ${result.error}`);
    } finally {
      if (browser) {
        await browser.close();
      }
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

  async crawlAllTargets(targets: CrawlingTarget[]): Promise<CrawlingResult[]> {
    console.log(`🎯 총 ${targets.length}개 휴게소 좌표 크롤링 시작`);
    
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      console.log(`\n[${i + 1}/${targets.length}] ${target.name} 처리 중...`);
      
      const result = await this.crawlCoordinates(target);
      this.results.push(result);
      
      // 요청 간격 조절 (5초 대기 - 안정성 향상)
      if (i < targets.length - 1) {
        console.log('⏳ 5초 대기 중...');
        await new Promise(resolve => setTimeout(resolve, 5000));
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
          // lat, lng 컬럼으로 업데이트
          const updateData = {
            lat: result.newLat,
            lng: result.newLng
          };
          
          const { error } = await supabase
            .from('rest_areas')
            .update(updateData)
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
    
    const reportPath = './scripts/puppeteer-crawling-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log(`\n📄 크롤링 리포트 저장: ${reportPath}`);
    console.log(`📊 성공률: ${((report.successful / report.totalTargets) * 100).toFixed(1)}%`);
  }
}

async function main() {
  const crawler = new PuppeteerMapsCrawler();
  
  try {
    // 크롤링 대상 로드
    const targetsPath = './scripts/private-highway-crawling-targets.json';
    if (!fs.existsSync(targetsPath)) {
      console.error('❌ 크롤링 대상 파일이 없습니다. 먼저 analyze-private-highway-rest-areas.ts를 실행하세요.');
      return;
    }
    
    const targetData = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
    const targets: CrawlingTarget[] = targetData.targets;
    
    console.log('🚀 Puppeteer 구글지도 크롤링 시작');
    console.log('=' .repeat(80));
    
    // 전체 모드: 모든 45개 민자고속도로 휴게소 크롤링
    console.log(`🚀 전체 모드: ${targets.length}개 휴게소 크롤링 시작`);
    
    // 크롤링 실행
    const results = await crawler.crawlAllTargets(targets);
    
    // 데이터베이스 업데이트
    await crawler.updateDatabase(results);
    
    // 리포트 생성
    await crawler.generateReport();
    
    console.log('\n✅ 크롤링 작업 완료');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ 크롤링 중 치명적 오류:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
main();