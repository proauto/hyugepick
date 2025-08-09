import { RestArea, RestFood, RestFacility } from '@/types/map';
import { MatchedRestArea } from './restAreaMatcher';

// 수집된 휴게소 상세 데이터
interface CollectedRestAreaData {
  restAreaCode: string;
  name: string;
  location: { lat: number; lng: number };
  distanceFromStart: number;
  estimatedTime: number;
  distanceToNext?: number;
  timeToNext?: number;
  facilities: string[];
  stores: Array<{
    storeCode: string;
    storeName: string;
    storeType: string;
    popularItems?: string[];
  }>;
  conveniences: Array<{
    facilityType: string;
    facilityName: string;
    status: string;
  }>;
  collectTime: string;
  dataQuality: 'high' | 'medium' | 'low';
}

// 데이터 수집 옵션
interface CollectionOptions {
  includeStores: boolean;      // 매장 정보 포함 여부
  includeFacilities: boolean;  // 편의시설 정보 포함 여부
  maxConcurrent: number;       // 최대 동시 요청 수
  timeout: number;             // 요청 타임아웃 (ms)
  retryCount: number;          // 재시도 횟수
}

export class RestAreaDataCollector {
  private readonly DEFAULT_OPTIONS: CollectionOptions = {
    includeStores: true,
    includeFacilities: true,
    maxConcurrent: 5,
    timeout: 10000,
    retryCount: 2
  };

  // 휴게소 상세정보 일괄 수집
  async collectDetailedData(
    matchedRestAreas: MatchedRestArea[],
    options: Partial<CollectionOptions> = {}
  ): Promise<CollectedRestAreaData[]> {
    
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    console.log('휴게소 상세정보 수집 시작:', {
      restAreaCount: matchedRestAreas.length,
      options: finalOptions
    });

    try {
      // 병렬 처리를 위해 배치로 나누기
      const batches = this.createBatches(matchedRestAreas, finalOptions.maxConcurrent);
      const allResults: CollectedRestAreaData[] = [];

      for (let i = 0; i < batches.length; i++) {
        console.log(`배치 ${i + 1}/${batches.length} 처리 중... (${batches[i].length}개 휴게소)`);
        
        const batchPromises = batches[i].map(restArea => 
          this.collectSingleRestAreaData(restArea, finalOptions)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        // 성공한 결과만 수집
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            allResults.push(result.value);
          } else {
            console.warn(`휴게소 ${batches[i][index].name} 데이터 수집 실패:`, 
              result.status === 'rejected' ? result.reason : '알 수 없는 오류');
          }
        });

        // 다음 배치 전 잠시 대기 (API 부하 방지)
        if (i < batches.length - 1) {
          await this.delay(1000);
        }
      }

      console.log(`휴게소 상세정보 수집 완료: ${allResults.length}/${matchedRestAreas.length}개 성공`);
      
      // 경로 순서대로 정렬
      return allResults.sort((a, b) => a.distanceFromStart - b.distanceFromStart);

    } catch (error) {
      console.error('휴게소 상세정보 수집 오류:', error);
      throw new Error('휴게소 상세정보 수집에 실패했습니다.');
    }
  }

  // 단일 휴게소 데이터 수집
  private async collectSingleRestAreaData(
    restArea: MatchedRestArea,
    options: CollectionOptions
  ): Promise<CollectedRestAreaData | null> {
    
    try {
      console.log(`휴게소 ${restArea.name} 데이터 수집 시작...`);

      const startTime = Date.now();
      
      // 병렬로 매장 정보와 편의시설 정보 수집
      const [storesResult, facilitiesResult] = await Promise.allSettled([
        options.includeStores ? this.collectStoreData(restArea.id, options) : Promise.resolve([]),
        options.includeFacilities ? this.collectFacilityData(restArea.id, options) : Promise.resolve([])
      ]);

      const stores = storesResult.status === 'fulfilled' ? storesResult.value : [];
      const conveniences = facilitiesResult.status === 'fulfilled' ? facilitiesResult.value : [];

      const endTime = Date.now();
      const collectTime = new Date().toISOString();
      
      // 데이터 품질 평가
      const dataQuality = this.evaluateDataQuality(stores, conveniences, endTime - startTime);

      console.log(`휴게소 ${restArea.name} 데이터 수집 완료 (${endTime - startTime}ms, 품질: ${dataQuality})`);

      return {
        restAreaCode: restArea.id,
        name: restArea.name,
        location: {
          lat: restArea.coordinates.lat,
          lng: restArea.coordinates.lng
        },
        distanceFromStart: restArea.distanceFromStart,
        estimatedTime: restArea.estimatedTime,
        distanceToNext: restArea.distanceToNext,
        timeToNext: restArea.timeToNext,
        facilities: restArea.facilities || [],
        stores,
        conveniences,
        collectTime,
        dataQuality
      };

    } catch (error) {
      console.error(`휴게소 ${restArea.name} 데이터 수집 오류:`, error);
      return null;
    }
  }

  // 매장 데이터 수집
  private async collectStoreData(
    restAreaCode: string,
    options: CollectionOptions
  ): Promise<Array<{
    storeCode: string;
    storeName: string;
    storeType: string;
    popularItems?: string[];
  }>> {
    
    try {
      const response = await this.makeApiRequest(
        `/api/highway/rest-areas/${restAreaCode}/foods`,
        options.timeout
      );

      if (!response || !response.list || !Array.isArray(response.list)) {
        return [];
      }

      // 매장 데이터 그룹핑 및 정제
      const storeMap = new Map<string, any>();
      
      response.list.forEach((item: any) => {
        const storeCode = item.shopCode || item.storeCode || 'unknown';
        const storeName = item.shopName || item.storeName || item.foodName || '매장명 미상';
        const storeType = item.shopType || item.foodKind || item.category || '기타';

        if (!storeMap.has(storeCode)) {
          storeMap.set(storeCode, {
            storeCode,
            storeName,
            storeType,
            popularItems: []
          });
        }

        // 인기 메뉴 추가
        if (item.foodName && !storeMap.get(storeCode).popularItems.includes(item.foodName)) {
          storeMap.get(storeCode).popularItems.push(item.foodName);
        }
      });

      return Array.from(storeMap.values());

    } catch (error) {
      console.warn(`휴게소 ${restAreaCode} 매장 데이터 수집 실패:`, error);
      return [];
    }
  }

  // 편의시설 데이터 수집
  private async collectFacilityData(
    restAreaCode: string,
    options: CollectionOptions
  ): Promise<Array<{
    facilityType: string;
    facilityName: string;
    status: string;
  }>> {
    
    try {
      const response = await this.makeApiRequest(
        `/api/highway/rest-areas/${restAreaCode}/facilities`,
        options.timeout
      );

      if (!response || !response.list || !Array.isArray(response.list)) {
        return [];
      }

      return response.list.map((item: any) => ({
        facilityType: item.facilityType || item.convenienceType || '기타',
        facilityName: item.facilityName || item.convenienceName || '시설명 미상',
        status: item.operationStatus || item.status || '운영중'
      }));

    } catch (error) {
      console.warn(`휴게소 ${restAreaCode} 편의시설 데이터 수집 실패:`, error);
      return [];
    }
  }

  // API 요청 (재시도 포함)
  private async makeApiRequest(
    endpoint: string,
    timeout: number,
    retryCount: number = 2
  ): Promise<any> {
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        console.warn(`API 요청 실패 (시도 ${attempt + 1}/${retryCount + 1}):`, error);
        
        if (attempt === retryCount) {
          throw error;
        }

        // 재시도 전 대기
        await this.delay(1000 * (attempt + 1));
      }
    }
  }

  // 배치 생성
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  // 데이터 품질 평가
  private evaluateDataQuality(
    stores: any[],
    conveniences: any[],
    collectTime: number
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // 매장 데이터 품질 평가
    if (stores.length > 0) {
      score += 3;
      if (stores.some(s => s.popularItems && s.popularItems.length > 0)) {
        score += 2;
      }
    }

    // 편의시설 데이터 품질 평가  
    if (conveniences.length > 0) {
      score += 3;
      if (conveniences.length > 3) {
        score += 1;
      }
    }

    // 수집 시간 평가 (빠를수록 좋음)
    if (collectTime < 3000) {
      score += 1;
    }

    // 점수에 따른 품질 등급
    if (score >= 8) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  // 지연 함수
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 데이터 통계 생성
  generateCollectionStats(collectedData: CollectedRestAreaData[]): {
    totalCount: number;
    successRate: number;
    qualityDistribution: Record<string, number>;
    averageStoresPerRestArea: number;
    averageFacilitiesPerRestArea: number;
    totalDataPoints: number;
  } {
    const totalStores = collectedData.reduce((sum, item) => sum + item.stores.length, 0);
    const totalFacilities = collectedData.reduce((sum, item) => sum + item.conveniences.length, 0);
    
    const qualityDistribution = collectedData.reduce((acc, item) => {
      acc[item.dataQuality] = (acc[item.dataQuality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCount: collectedData.length,
      successRate: collectedData.length > 0 ? 1 : 0, // 성공한 것만 반환되므로 1
      qualityDistribution,
      averageStoresPerRestArea: collectedData.length > 0 ? 
        Math.round((totalStores / collectedData.length) * 10) / 10 : 0,
      averageFacilitiesPerRestArea: collectedData.length > 0 ? 
        Math.round((totalFacilities / collectedData.length) * 10) / 10 : 0,
      totalDataPoints: totalStores + totalFacilities
    };
  }
}

export const restAreaDataCollector = new RestAreaDataCollector();

// 수집된 데이터 타입 export
export type { CollectedRestAreaData, CollectionOptions };