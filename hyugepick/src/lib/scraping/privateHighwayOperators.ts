/**
 * 민자고속도로 운영사별 데이터 수집 시스템
 * 각 운영사의 웹사이트에서 실시간 휴게소 정보를 수집
 */

import { RestArea } from '@/types/map';

// 민자고속도로 운영사 정보
export interface PrivateHighwayOperator {
  id: string;
  name: string;
  highways: string[];
  website: string;
  restAreaListUrl?: string;
  apiEndpoint?: string;
  scrapingConfig: {
    enabled: boolean;
    method: 'api' | 'scraping' | 'manual';
    selectors?: {
      restAreaList?: string;
      name?: string;
      location?: string;
      facilities?: string;
      status?: string;
    };
    headers?: Record<string, string>;
  };
  contact: {
    phone: string;
    email?: string;
  };
  lastUpdated?: string;
}

// 민자고속도로 운영사 목록
export const PRIVATE_HIGHWAY_OPERATORS: PrivateHighwayOperator[] = [
  {
    id: 'cneway',
    name: '천안논산고속도로㈜',
    highways: ['천안논산고속도로', '천안논산선'],
    website: 'https://www.cneway.co.kr',
    restAreaListUrl: 'https://www.cneway.co.kr/road/convenience/rest_area.asp',
    scrapingConfig: {
      enabled: true,
      method: 'scraping',
      selectors: {
        restAreaList: '.rest_area_list tr',
        name: '.rest_name',
        location: '.rest_location',
        facilities: '.rest_facilities',
        status: '.rest_status'
      }
    },
    contact: {
      phone: '1588-2504',
      email: 'info@cneway.co.kr'
    }
  },
  {
    id: 'seoulyang',
    name: '서울양양고속도로㈜',
    highways: ['서울양양고속도로', '서울양양선'],
    website: 'https://seoulyang.co.kr',
    restAreaListUrl: 'https://seoulyang.co.kr/traffic/service_area.php',
    scrapingConfig: {
      enabled: true,
      method: 'scraping',
      selectors: {
        restAreaList: '.service_area_wrap .area_info',
        name: '.area_name',
        location: '.area_location',
        facilities: '.facility_list'
      }
    },
    contact: {
      phone: '1588-5576'
    }
  },
  {
    id: 'daegubusan',
    name: '대구부산고속도로㈜',
    highways: ['대구부산고속도로', '대구부산선'],
    website: 'https://www.dbjg.co.kr',
    restAreaListUrl: 'https://www.dbjg.co.kr/service/rest.php',
    scrapingConfig: {
      enabled: true,
      method: 'scraping',
      selectors: {
        restAreaList: '.rest_list .rest_item',
        name: '.rest_name',
        location: '.rest_km',
        facilities: '.facilities'
      }
    },
    contact: {
      phone: '053-589-7777'
    }
  },
  {
    id: 'incheon_bridge',
    name: '인천대교㈜',
    highways: ['인천대교', '인천대교연결도로'],
    website: 'https://www.incheonbridge.com',
    scrapingConfig: {
      enabled: false, // 휴게소 정보가 웹사이트에 명시되지 않음
      method: 'manual'
    },
    contact: {
      phone: '032-745-3900'
    }
  },
  {
    id: 'second_gyeongin',
    name: '제2경인고속도로㈜',
    highways: ['제2경인고속도로', '제2경인선'],
    website: 'https://www.2ndgyeongin.co.kr',
    scrapingConfig: {
      enabled: true,
      method: 'scraping'
    },
    contact: {
      phone: '032-560-3000'
    }
  },
  {
    id: 'gwangju_wonju',
    name: '광주원주고속도로㈜',
    highways: ['광주원주고속도로', '광주원주선'],
    website: 'https://www.gw-highway.co.kr',
    scrapingConfig: {
      enabled: true,
      method: 'scraping'
    },
    contact: {
      phone: '033-760-3000'
    }
  },
  {
    id: 'west_coast',
    name: '서해안고속도로㈜',
    highways: ['서해안고속도로', '서해안선'],
    website: 'https://www.westcoast.co.kr',
    scrapingConfig: {
      enabled: true,
      method: 'scraping'
    },
    contact: {
      phone: '041-664-3000'
    }
  }
];

// 운영사별 스크래핑 결과
export interface OperatorScrapingResult {
  operatorId: string;
  operatorName: string;
  success: boolean;
  restAreas: RestArea[];
  scrapedAt: Date;
  executionTime: number;
  itemsFound: number;
  error?: string;
  warnings: string[];
}

export class PrivateHighwayDataCollector {
  
  // 모든 운영사에서 데이터 수집
  async collectFromAllOperators(): Promise<OperatorScrapingResult[]> {
    console.log('🚗 민자고속도로 운영사별 데이터 수집 시작');
    
    const results: OperatorScrapingResult[] = [];
    
    for (const operator of PRIVATE_HIGHWAY_OPERATORS) {
      if (!operator.scrapingConfig.enabled) {
        console.log(`⏭️  ${operator.name} - 스크래핑 비활성화`);
        continue;
      }
      
      try {
        console.log(`🔍 ${operator.name} 데이터 수집 중...`);
        const result = await this.collectFromOperator(operator);
        results.push(result);
        
        // 운영사간 요청 간격 (DOS 방지)
        await this.delay(2000);
        
      } catch (error) {
        console.error(`❌ ${operator.name} 수집 실패:`, error);
        results.push({
          operatorId: operator.id,
          operatorName: operator.name,
          success: false,
          restAreas: [],
          scrapedAt: new Date(),
          executionTime: 0,
          itemsFound: 0,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          warnings: []
        });
      }
    }
    
    console.log(`✅ 민자고속도로 데이터 수집 완료: ${results.length}개 운영사`);
    return results;
  }
  
  // 특정 운영사에서 데이터 수집
  async collectFromOperator(operator: PrivateHighwayOperator): Promise<OperatorScrapingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      switch (operator.scrapingConfig.method) {
        case 'api':
          return await this.collectViaAPI(operator, startTime, warnings);
        
        case 'scraping':
          return await this.collectViaScraping(operator, startTime, warnings);
        
        case 'manual':
          return await this.collectManualData(operator, startTime, warnings);
        
        default:
          throw new Error(`지원하지 않는 수집 방법: ${operator.scrapingConfig.method}`);
      }
      
    } catch (error) {
      return {
        operatorId: operator.id,
        operatorName: operator.name,
        success: false,
        restAreas: [],
        scrapedAt: new Date(),
        executionTime: Date.now() - startTime,
        itemsFound: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        warnings
      };
    }
  }
  
  // API를 통한 데이터 수집
  private async collectViaAPI(
    operator: PrivateHighwayOperator, 
    startTime: number, 
    warnings: string[]
  ): Promise<OperatorScrapingResult> {
    
    if (!operator.apiEndpoint) {
      throw new Error('API 엔드포인트가 설정되지 않았습니다');
    }
    
    const response = await fetch(operator.apiEndpoint, {
      headers: operator.scrapingConfig.headers || {}
    });
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    const data = await response.json();
    const restAreas = await this.parseAPIResponse(data, operator);
    
    return {
      operatorId: operator.id,
      operatorName: operator.name,
      success: true,
      restAreas,
      scrapedAt: new Date(),
      executionTime: Date.now() - startTime,
      itemsFound: restAreas.length,
      warnings
    };
  }
  
  // 웹 스크래핑을 통한 데이터 수집
  private async collectViaScraping(
    operator: PrivateHighwayOperator, 
    startTime: number, 
    warnings: string[]
  ): Promise<OperatorScrapingResult> {
    
    if (!operator.restAreaListUrl) {
      throw new Error('휴게소 목록 URL이 설정되지 않았습니다');
    }
    
    // 실제 구현에서는 Puppeteer나 Playwright 사용 권장
    // 현재는 간단한 fetch로 구현
    try {
      const response = await fetch(operator.restAreaListUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`웹페이지 로드 실패: ${response.status}`);
      }
      
      const html = await response.text();
      const restAreas = await this.parseHTML(html, operator);
      
      if (restAreas.length === 0) {
        warnings.push('스크래핑 결과가 없습니다. 웹사이트 구조가 변경되었을 수 있습니다.');
      }
      
      return {
        operatorId: operator.id,
        operatorName: operator.name,
        success: true,
        restAreas,
        scrapedAt: new Date(),
        executionTime: Date.now() - startTime,
        itemsFound: restAreas.length,
        warnings
      };
      
    } catch (error) {
      // 스크래핑 실패 시 알려진 데이터로 폴백
      warnings.push(`스크래핑 실패, 알려진 데이터로 폴백: ${error}`);
      const fallbackData = await this.getFallbackData(operator);
      
      return {
        operatorId: operator.id,
        operatorName: operator.name,
        success: false,
        restAreas: fallbackData,
        scrapedAt: new Date(),
        executionTime: Date.now() - startTime,
        itemsFound: fallbackData.length,
        error: error instanceof Error ? error.message : '스크래핑 실패',
        warnings
      };
    }
  }
  
  // 수동 데이터 수집 (하드코딩된 데이터)
  private async collectManualData(
    operator: PrivateHighwayOperator, 
    startTime: number, 
    warnings: string[]
  ): Promise<OperatorScrapingResult> {
    
    const manualData = await this.getManualData(operator);
    
    return {
      operatorId: operator.id,
      operatorName: operator.name,
      success: true,
      restAreas: manualData,
      scrapedAt: new Date(),
      executionTime: Date.now() - startTime,
      itemsFound: manualData.length,
      warnings
    };
  }
  
  // API 응답 파싱
  private async parseAPIResponse(data: any, operator: PrivateHighwayOperator): Promise<RestArea[]> {
    // 운영사별 API 응답 형식에 맞춰 파싱
    // 실제 구현에서는 각 운영사별로 맞춤 구현 필요
    return [];
  }
  
  // HTML 파싱
  private async parseHTML(html: string, operator: PrivateHighwayOperator): Promise<RestArea[]> {
    const restAreas: RestArea[] = [];
    
    // 실제 구현에서는 cheerio나 jsdom 사용 권장
    // 현재는 정규표현식으로 간단히 구현
    
    if (operator.id === 'cneway') {
      // 천안논산고속도로 파싱 로직
      const matches = html.match(/정안알밤휴게소|새마을휴게소/g);
      if (matches) {
        // 파싱 로직 구현
      }
    }
    
    return restAreas;
  }
  
  // 폴백 데이터 (스크래핑 실패 시)
  private async getFallbackData(operator: PrivateHighwayOperator): Promise<RestArea[]> {
    // 각 운영사별 알려진 휴게소 데이터 반환
    const knownData: { [key: string]: RestArea[] } = {
      'cneway': [
        {
          id: 'cneway_1',
          name: '정안알밤휴게소',
          coordinates: { lat: 36.4500, lng: 127.1500 },
          routeCode: '0300',
          routeName: '천안논산고속도로',
          direction: '논산방향',
          address: '천안논산고속도로 상의 휴게소',
          phoneNumber: '',
          facilities: ['화장실', '주차장', '편의점', '주유소'],
          operatingHours: '24시간',
          serviceType: '휴게소'
        }
      ],
      'daegubusan': [
        {
          id: 'daegubusan_1',
          name: '청도새마을휴게소',
          coordinates: { lat: 35.6500, lng: 128.7300 },
          routeCode: '0550',
          routeName: '대구부산고속도로',
          direction: '부산방향',
          address: '대구부산고속도로 상의 휴게소',
          phoneNumber: '',
          facilities: ['화장실', '주차장', '편의점', '주유소'],
          operatingHours: '24시간',
          serviceType: '휴게소'
        }
      ]
    };
    
    return knownData[operator.id] || [];
  }
  
  // 수동 데이터 (하드코딩)
  private async getManualData(operator: PrivateHighwayOperator): Promise<RestArea[]> {
    return await this.getFallbackData(operator);
  }
  
  // 지연 함수
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const privateHighwayCollector = new PrivateHighwayDataCollector();