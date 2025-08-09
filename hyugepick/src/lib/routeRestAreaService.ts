import { Coordinates, RouteInfo } from '@/types/map';
import { routeAPI } from './routeApi';
import { highwayAPIWithDB } from './highwayApiWithDB'; // DB 버전 사용
import { routeAnalyzer } from './routeAnalyzer';
import { restAreaMatcher, MatchingOptions } from './restAreaMatcher';
import { restAreaDataCollector, CollectionOptions } from './restAreaDataCollector';
import { icBasedDirectionFilter } from './routing/icBasedDirectionFilter'; // IC 기반 필터 추가
import { routeCodePrecisionFilter } from './routing/routeCodePrecisionFilter'; // 노선 코드 정밀 필터 추가
import { highwayFirstRestAreaFilter } from './highwayFirstRestAreaFilter'; // 고속도로 우선 필터 추가
import { 
  ROUTE_SERVICE_DEFAULT_OPTIONS,
  HIGHWAY_FIRST_FILTER_OPTIONS,
  IC_BASED_FILTER_OPTIONS,
  ROUTE_CODE_FILTER_OPTIONS,
  mergeFilterOptions 
} from './config/restAreaFilterConfig';

// 최종 결과 데이터 구조 (요청사항에 맞춘 형식)
export interface RouteRestAreaResult {
  route_info: {
    total_distance: number;        // 총 거리 (km)
    total_duration: number;        // 총 소요시간 (분)
    highway_sections: Array<{
      name: string;
      route_code: string;
      distance: number;
    }>;
  };
  rest_areas: Array<{
    name: string;                  // 휴게소명
    location: {                    // 위치 좌표
      lat: number;                 // 위도
      lng: number;                 // 경도
    };
    distance_from_start: string;   // 시작점으로부터 거리(km)
    estimated_time: string;        // 예상 도착시간 
    distance_to_next?: string;     // 다음 휴게소까지 거리
    time_to_next?: string;         // 다음 휴게소까지 시간
    facilities: string[];          // 편의시설 목록
    stores: Array<{               // 매장 정보
      store_name: string;          // 매장명
      store_code: string;          // 매장코드
      store_type?: string;         // 매장 유형
      popular_items?: string[];    // 인기 메뉴
    }>;
    data_quality: 'high' | 'medium' | 'low';  // 데이터 품질
    collection_time: string;       // 수집 시간
  }>;
  analysis_summary: {
    total_rest_areas: number;
    average_interval: number;      // 평균 휴게소 간격 (km)
    data_collection_time: string;
    success_rate: number;
  };
}

// 서비스 옵션
interface ServiceOptions {
  matching: Partial<MatchingOptions>;
  collection: Partial<CollectionOptions>;
  includeAnalysis: boolean;
  formatOutput: boolean;
}

export class RouteRestAreaService {
  private readonly DEFAULT_OPTIONS: ServiceOptions = ROUTE_SERVICE_DEFAULT_OPTIONS;

  // 메인 서비스 함수: 경로 + 휴게소 상세정보 통합 조회
  async getRouteWithRestAreas(
    origin: Coordinates,
    destination: Coordinates,
    options: Partial<ServiceOptions> = {}
  ): Promise<RouteRestAreaResult> {
    
    const serviceOptions = this.mergeOptions(options);
    const startTime = Date.now();

    console.log('경로 휴게소 통합 서비스 시작:', { origin, destination, options: serviceOptions });

    try {
      // 1단계: 카카오 최적경로 계산
      console.log('1단계: 카카오 최적경로 계산 중...');
      const routeInfo = await routeAPI.calculateRoute(origin, destination);
      
      // 2단계: 경로 데이터 분석 (고속도로 구간 식별)
      console.log('2단계: 경로 분석 및 고속도로 구간 식별 중...');
      const routeAnalysis = routeAnalyzer.analyzeRoute({
        routes: [{
          summary: {
            distance: routeInfo.distance,
            duration: routeInfo.duration
          },
          sections: [{ 
            roads: [{ 
              vertexes: this.coordinatesToVertexes(routeInfo.path) 
            }] 
          }]
        }]
      });

      // 고속도로 경로가 아닌 경우 경고
      if (!routeAnalysis.isHighwayRoute) {
        console.warn('고속도로 비율이 낮은 경로입니다. 휴게소 정보가 제한될 수 있습니다.');
      }

      // 3단계: 전체 휴게소 기준정보 조회 (DB 우선)
      console.log('3단계: 휴게소 기준정보 조회 중 (DB 우선)...');
      const allRestAreas = await highwayAPIWithDB.getRestAreas();
      
      // 4단계: 경로와 휴게소 매칭
      console.log('4단계: 경로-휴게소 매칭 알고리즘 실행 중...');
      
      let matchedRestAreas;
      
      // 새로운 고속도로 우선 필터링 방식 (추천)
      if ((serviceOptions.matching as any).useHighwayFirstFilter) {
        console.log('  🚀 고속도로 우선 필터링 적용 중...');
        
        const highwayFilterResult = await highwayFirstRestAreaFilter.filterRestAreas(
          routeAnalysis.coordinates,
          allRestAreas as any,
          {
            ...HIGHWAY_FIRST_FILTER_OPTIONS,
            maxDistanceFromRoute: (serviceOptions.matching.maxDistance || 3) * 1000, // km → m
            minInterval: serviceOptions.matching.minInterval,
            maxResults: serviceOptions.matching.maxResults
          }
        );
        
        matchedRestAreas = highwayFilterResult.restAreas;
        
        // 상세 로그 출력
        console.log('  ✅ 고속도로 우선 필터링 완료:', {
          최종결과: `${highwayFilterResult.summary.included}개`,
          매칭품질: highwayFilterResult.summary.matchingQuality,
          감지고속도로: highwayFilterResult.summary.detectedHighways.map(h => h.name).join(', '),
          단계별결과: highwayFilterResult.summary.filterStages
        });
        
      } else if ((serviceOptions.matching as any).usePrecisionRouteFilter) {
        // 기존 노선 코드 정밀 필터링 (거리 및 노선 기반)
        console.log('  🎯 노선 코드 정밀 필터링 적용 중...');
        
        const precisionResults = await routeCodePrecisionFilter.filterRestAreasByRouteCode(
          routeAnalysis.coordinates,
          allRestAreas as any,
          ROUTE_CODE_FILTER_OPTIONS
        );
        
        // 정밀 필터링을 통과한 휴게소만 추출
        const precisionFilteredAreas = routeCodePrecisionFilter.getIncludedRestAreas(precisionResults);
        const precisionSummary = routeCodePrecisionFilter.getSummary(precisionResults);
        
        console.log(`  ✅ 정밀 필터링 완료: ${precisionSummary.included}/${precisionSummary.total}개 포함`);
        console.log(`    - 평균 거리: ${precisionSummary.averageDistance.toFixed(2)}km`);
        console.log(`    - 노선 매칭률: ${((precisionSummary.routeCodeMatches / precisionSummary.total) * 100).toFixed(1)}%`);
        
        // 2차: IC 기반 방향 필터링 (정밀 필터링된 결과에 추가 적용)
        if ((serviceOptions.matching as any).enableDirectionFilter && (serviceOptions.matching as any).useICBasedFilter) {
          console.log('  🧭 IC 기반 방향 필터링 적용 중...');
          
          const accessibilityResults = await icBasedDirectionFilter.filterRestAreasByDirection(
            routeAnalysis.coordinates,
            precisionFilteredAreas as any,
            IC_BASED_FILTER_OPTIONS
          );
          
          // 최종 결과: 접근 가능한 휴게소만 추출
          matchedRestAreas = accessibilityResults
            .filter(result => result.isAccessible)
            .map(result => result.restArea);
          
          // 필터링 요약 출력
          const icSummary = icBasedDirectionFilter.getSummary(accessibilityResults);
          console.log(`  ✅ IC 방향 필터링 완료: ${icSummary.accessible}/${icSummary.total}개 접근 가능`);
          console.log(`    - 평균 신뢰도: ${(icSummary.averageConfidence * 100).toFixed(1)}%`);
          
        } else {
          // 정밀 필터링만 적용
          matchedRestAreas = precisionFilteredAreas;
        }
        
      } else if ((serviceOptions.matching as any).enableDirectionFilter && (serviceOptions.matching as any).useICBasedFilter) {
        // 기존 IC 기반 필터링만 적용
        console.log('  🎯 IC 기반 방향 필터링 적용 중...');
        
        const accessibilityResults = await icBasedDirectionFilter.filterRestAreasByDirection(
          routeAnalysis.coordinates,
          allRestAreas as any,
          IC_BASED_FILTER_OPTIONS
        );
        
        matchedRestAreas = accessibilityResults
          .filter(result => result.isAccessible)
          .map(result => result.restArea);
        
        const summary = icBasedDirectionFilter.getSummary(accessibilityResults);
        console.log(`  ✅ IC 기반 필터링 완료: ${summary.accessible}/${summary.total}개 접근 가능`);
        
      } else {
        // 기존 방식 (거리 기반 또는 기존 방향 필터)
        matchedRestAreas = await restAreaMatcher.matchRestAreasToRoute(
          routeAnalysis.coordinates,
          allRestAreas,
          serviceOptions.matching
        );
      }

      // 5단계: 휴게소 상세정보 수집
      console.log('5단계: 휴게소 상세정보 수집 중...');
      const detailedData = await restAreaDataCollector.collectDetailedData(
        matchedRestAreas as any,
        serviceOptions.collection
      );

      // 6단계: 결과 데이터 포맷팅
      console.log('6단계: 결과 데이터 포맷팅 중...');
      const result = this.formatResult(
        routeInfo,
        routeAnalysis,
        detailedData,
        serviceOptions,
        startTime
      );

      const endTime = Date.now();
      console.log(`경로 휴게소 통합 서비스 완료 (${endTime - startTime}ms):`, {
        totalRestAreas: result.rest_areas.length,
        averageInterval: result.analysis_summary.average_interval
      });

      return result;

    } catch (error) {
      console.error('경로 휴게소 통합 서비스 오류:', error);
      throw new Error(`서비스 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  // 옵션 병합 (공통 헬퍼 함수 사용)
  private mergeOptions(options: Partial<ServiceOptions>): ServiceOptions {
    return mergeFilterOptions(this.DEFAULT_OPTIONS, options);
  }

  // 좌표를 카카오 vertexes 형식으로 변환
  private coordinatesToVertexes(coordinates: Coordinates[]): number[] {
    const vertexes: number[] = [];
    coordinates.forEach(coord => {
      vertexes.push(coord.lng, coord.lat);
    });
    return vertexes;
  }

  // 결과 데이터 포맷팅
  private formatResult(
    routeInfo: RouteInfo,
    routeAnalysis: any,
    detailedData: any[],
    options: ServiceOptions,
    startTime: number
  ): RouteRestAreaResult {
    
    // 경로 정보 포맷팅
    const route_info = {
      total_distance: Math.round(routeInfo.distance / 100) / 10, // km 단위, 소수점 1자리
      total_duration: Math.round(routeInfo.duration / 60),       // 분 단위
      highway_sections: routeAnalysis.highwaySections.map((section: any) => ({
        name: section.name,
        route_code: section.routeCode,
        distance: Math.round(section.distance / 100) / 10      // km 단위
      }))
    };

    // 휴게소 정보 포맷팅
    const rest_areas = detailedData.map((area, index) => {
      const nextArea = detailedData[index + 1];
      
      return {
        name: area.name,
        location: {
          lat: Math.round(area.location.lat * 1000000) / 1000000,  // 소수점 6자리
          lng: Math.round(area.location.lng * 1000000) / 1000000
        },
        distance_from_start: `${area.distanceFromStart}km`,
        estimated_time: this.formatEstimatedTime(area.estimatedTime),
        distance_to_next: area.distanceToNext ? `${area.distanceToNext}km` : undefined,
        time_to_next: area.timeToNext ? `${area.timeToNext}분` : undefined,
        facilities: this.formatFacilities(area.conveniences, area.facilities),
        stores: area.stores.map((store: any) => ({
          store_name: store.storeName,
          store_code: store.storeCode,
          store_type: store.storeType,
          popular_items: store.popularItems?.slice(0, 3) // 상위 3개만
        })),
        data_quality: area.dataQuality,
        collection_time: area.collectTime
      };
    });

    // 분석 요약 정보
    const analysis_summary = {
      total_rest_areas: rest_areas.length,
      average_interval: this.calculateAverageInterval(detailedData),
      data_collection_time: new Date().toISOString(),
      success_rate: Math.round((detailedData.length / Math.max(detailedData.length, 1)) * 100) / 100
    };

    return {
      route_info,
      rest_areas,
      analysis_summary
    };
  }

  // 예상 도착시간 포맷팅
  private formatEstimatedTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  }

  // 편의시설 정보 통합 및 포맷팅
  private formatFacilities(conveniences: any[], basicFacilities: string[] = []): string[] {
    const facilitySet = new Set<string>();
    
    // 기본 편의시설 추가
    basicFacilities.forEach(facility => facilitySet.add(facility));
    
    // 상세 편의시설 정보 추가
    conveniences.forEach(item => {
      if (item.facilityName && item.facilityName !== '시설명 미상') {
        facilitySet.add(item.facilityName);
      } else if (item.facilityType && item.facilityType !== '기타') {
        facilitySet.add(item.facilityType);
      }
    });

    return Array.from(facilitySet).sort();
  }

  // 평균 휴게소 간격 계산
  private calculateAverageInterval(detailedData: any[]): number {
    if (detailedData.length < 2) return 0;

    const intervals = detailedData.slice(1).map((area, index) => 
      area.distanceFromStart - detailedData[index].distanceFromStart
    );

    const total = intervals.reduce((sum, interval) => sum + interval, 0);
    return Math.round((total / intervals.length) * 10) / 10;
  }

  // 특정 구간의 휴게소만 조회
  async getRestAreasBySection(
    origin: Coordinates,
    destination: Coordinates,
    startKm: number,
    endKm: number,
    options: Partial<ServiceOptions> = {}
  ): Promise<RouteRestAreaResult> {
    
    const fullResult = await this.getRouteWithRestAreas(origin, destination, options);
    
    // 지정된 구간의 휴게소만 필터링
    const filteredRestAreas = fullResult.rest_areas.filter(area => {
      const distance = parseFloat(area.distance_from_start.replace('km', ''));
      return distance >= startKm && distance <= endKm;
    });

    return {
      ...fullResult,
      rest_areas: filteredRestAreas,
      analysis_summary: {
        ...fullResult.analysis_summary,
        total_rest_areas: filteredRestAreas.length
      }
    };
  }

  // 최적화된 휴게소 추천 (연료, 식사 시점 고려)
  async getOptimizedRestAreaRecommendations(
    origin: Coordinates,
    destination: Coordinates,
    preferences: {
      fuelStopInterval?: number;    // 연료 보급 간격 (km)
      mealStopInterval?: number;    // 식사 간격 (시간)
      preferredFacilities?: string[]; // 선호 편의시설
    } = {}
  ): Promise<RouteRestAreaResult & {
    recommendations: Array<{
      restAreaName: string;
      reason: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
  }> {
    
    const result = await this.getRouteWithRestAreas(origin, destination, {
      matching: { minInterval: 20 } // 추천을 위해 간격을 넓게
    });

    // 추천 로직
    const recommendations = result.rest_areas.map((area, index) => {
      const reasons: string[] = [];
      let priority: 'high' | 'medium' | 'low' = 'low';

      const distanceFromStart = parseFloat(area.distance_from_start.replace('km', ''));
      
      // 연료 보급 추천
      if (preferences.fuelStopInterval && 
          distanceFromStart % preferences.fuelStopInterval < 20) {
        reasons.push('연료 보급 권장 지점');
        priority = 'high';
      }

      // 식사 시간 추천
      if (preferences.mealStopInterval) {
        const estimatedHours = this.parseTimeToHours(area.estimated_time);
        if (estimatedHours % preferences.mealStopInterval < 0.5) {
          reasons.push('식사 시간 권장');
          priority = 'medium';
        }
      }

      // 선호 편의시설 매칭
      if (preferences.preferredFacilities) {
        const matchedFacilities = area.facilities.filter(f => 
          preferences.preferredFacilities!.some(pf => f.includes(pf))
        );
        if (matchedFacilities.length > 0) {
          reasons.push(`원하는 편의시설 이용 가능: ${matchedFacilities.join(', ')}`);
          if (priority === 'low') priority = 'medium';
        }
      }

      // 데이터 품질이 높고 매장이 많은 경우
      if (area.data_quality === 'high' && area.stores.length > 3) {
        reasons.push('다양한 매장 및 서비스 이용 가능');
        if (priority === 'low') priority = 'medium';
      }

      return {
        restAreaName: area.name,
        reason: reasons.length > 0 ? reasons : ['경로상 이용 가능한 휴게소'],
        priority
      };
    });

    return {
      ...result,
      recommendations
    };
  }

  // 시간 문자열을 시간(소수)으로 변환
  private parseTimeToHours(timeStr: string): number {
    const match = timeStr.match(/(\d+)시간\s*(\d+)분|(\d+)분/);
    if (!match) return 0;
    
    if (match[1] && match[2]) {
      // "1시간 30분" 형식
      return parseInt(match[1]) + parseInt(match[2]) / 60;
    } else if (match[3]) {
      // "90분" 형식
      return parseInt(match[3]) / 60;
    }
    
    return 0;
  }
}

export const routeRestAreaService = new RouteRestAreaService();