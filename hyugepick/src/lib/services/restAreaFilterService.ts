/**
 * 통합 휴게소 필터링 서비스
 * UnifiedRestAreaFilter와 RouteRestAreaService의 공통 로직을 관리
 */

import { Coordinates, RestArea } from '@/types/map';
import { highwayAPIWithDB } from '../highwayApiWithDB';
import { highwayFirstRestAreaFilter } from '../highwayFirstRestAreaFilter';
import { icBasedDirectionFilter } from '../routing/icBasedDirectionFilter';
import { routeCodePrecisionFilter } from '../routing/routeCodePrecisionFilter';
import { 
  HIGHWAY_FIRST_FILTER_OPTIONS,
  IC_BASED_FILTER_OPTIONS,
  ROUTE_CODE_FILTER_OPTIONS,
  FilterType,
  ACTIVE_FILTER_TYPE,
  getFilterConfig
} from '../config/restAreaFilterConfig';

// 필터링 결과 인터페이스
export interface FilteredRestAreaResult {
  restArea: RestArea;
  distanceFromRoute: number;      // 경로로부터 거리 (m)
  distanceFromStart: number;      // 시작점으로부터 거리 (km)
  estimatedTime: number;          // 예상 도착 시간 (분)
  confidence: number;             // 신뢰도 (0-1)
  directionReason: string[];     // 방향성 판단 근거
  routePosition: number;          // 경로상 위치 비율 (0-1)
}

// 필터링 상세 결과
export interface FilteringDetail {
  filterType: FilterType;
  totalProcessed: number;
  totalFiltered: number;
  stages: {
    name: string;
    count: number;
    description: string;
  }[];
  performance: {
    duration: number;
    averageConfidence: number;
  };
}

export class RestAreaFilterService {
  
  private static instance: RestAreaFilterService;
  
  // 싱글톤 패턴
  static getInstance(): RestAreaFilterService {
    if (!RestAreaFilterService.instance) {
      RestAreaFilterService.instance = new RestAreaFilterService();
    }
    return RestAreaFilterService.instance;
  }
  
  /**
   * 통합 필터링 메서드 - 모든 필터링 로직의 진입점
   * UnifiedRestAreaFilter와 RouteRestAreaService에서 공통으로 사용
   */
  async filterRestAreas(
    routeCoordinates: Coordinates[],
    filterType: FilterType = ACTIVE_FILTER_TYPE,
    customOptions?: Record<string, any>
  ): Promise<{
    results: FilteredRestAreaResult[];
    detail: FilteringDetail;
  }> {
    
    const startTime = Date.now();
    
    console.log('🔍 통합 필터링 서비스 시작:', {
      filterType,
      routePoints: routeCoordinates.length,
      customOptions
    });
    
    try {
      // 1. 모든 휴게소 데이터 조회 (DB 우선)
      const allRestAreas = await this.getAllRestAreas();
      
      // 2. 선택된 필터 타입에 따라 필터링 수행
      let filteredResults: FilteredRestAreaResult[];
      let filterDetail: FilteringDetail;
      
      switch (filterType) {
        case FilterType.HIGHWAY_FIRST:
          const highwayResult = await this.applyHighwayFirstFilter(
            routeCoordinates,
            allRestAreas,
            customOptions
          );
          filteredResults = highwayResult.results;
          filterDetail = highwayResult.detail;
          break;
          
        case FilterType.IC_BASED:
          const icResult = await this.applyICBasedFilter(
            routeCoordinates,
            allRestAreas,
            customOptions
          );
          filteredResults = icResult.results;
          filterDetail = icResult.detail;
          break;
          
        case FilterType.ROUTE_CODE:
          const routeCodeResult = await this.applyRouteCodeFilter(
            routeCoordinates,
            allRestAreas,
            customOptions
          );
          filteredResults = routeCodeResult.results;
          filterDetail = routeCodeResult.detail;
          break;
          
        case FilterType.DISTANCE_ONLY:
          const distanceResult = await this.applyDistanceOnlyFilter(
            routeCoordinates,
            allRestAreas,
            customOptions
          );
          filteredResults = distanceResult.results;
          filterDetail = distanceResult.detail;
          break;
          
        default:
          // 기본값: 고속도로 우선 필터
          const defaultResult = await this.applyHighwayFirstFilter(
            routeCoordinates,
            allRestAreas,
            customOptions
          );
          filteredResults = defaultResult.results;
          filterDetail = defaultResult.detail;
      }
      
      // 3. 성능 정보 업데이트
      filterDetail.performance.duration = Date.now() - startTime;
      
      console.log('✅ 통합 필터링 완료:', {
        filterType,
        resultsCount: filteredResults.length,
        duration: `${filterDetail.performance.duration}ms`
      });
      
      return {
        results: filteredResults,
        detail: filterDetail
      };
      
    } catch (error) {
      console.error('❌ 통합 필터링 오류:', error);
      throw new Error(`휴게소 필터링 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
  
  /**
   * 고속도로 우선 필터 적용
   */
  private async applyHighwayFirstFilter(
    routeCoordinates: Coordinates[],
    allRestAreas: RestArea[],
    customOptions?: Record<string, any>
  ): Promise<{
    results: FilteredRestAreaResult[];
    detail: FilteringDetail;
  }> {
    
    console.log('🚀 고속도로 우선 필터 적용 중...');
    
    const options = {
      ...HIGHWAY_FIRST_FILTER_OPTIONS,
      ...customOptions
    };
    
    const filterResult = await highwayFirstRestAreaFilter.filterRestAreas(
      routeCoordinates,
      allRestAreas as any,
      options
    );
    
    // 결과 변환
    const results: FilteredRestAreaResult[] = filterResult.restAreas.map((area, index) => ({
      restArea: area as RestArea,
      distanceFromRoute: 0, // 추후 계산
      distanceFromStart: index * 20, // 임시값, 실제 계산 필요
      estimatedTime: index * 15, // 임시값, 실제 계산 필요
      confidence: 0.8,
      directionReason: ['고속도로 매칭'],
      routePosition: index / Math.max(filterResult.restAreas.length - 1, 1)
    }));
    
    const detail: FilteringDetail = {
      filterType: FilterType.HIGHWAY_FIRST,
      totalProcessed: allRestAreas.length,
      totalFiltered: filterResult.restAreas.length,
      stages: [
        {
          name: '초기',
          count: filterResult.summary.filterStages.initial,
          description: '전체 휴게소'
        },
        {
          name: '고속도로 매칭',
          count: filterResult.summary.filterStages.afterHighwayMatch,
          description: '고속도로 매칭 후'
        },
        {
          name: '거리 필터',
          count: filterResult.summary.filterStages.afterDistanceFilter,
          description: '거리 필터 적용 후'
        },
        {
          name: '방향 필터',
          count: filterResult.summary.filterStages.afterDirectionFilter,
          description: '방향 필터 적용 후'
        },
        {
          name: '간격 필터',
          count: filterResult.summary.filterStages.afterIntervalFilter,
          description: '간격 필터 적용 후'
        },
        {
          name: '최종',
          count: filterResult.summary.filterStages.final,
          description: '최종 결과'
        }
      ],
      performance: {
        duration: 0, // 나중에 업데이트
        averageConfidence: 0.8
      }
    };
    
    return { results, detail };
  }
  
  /**
   * IC 기반 방향 필터 적용
   */
  private async applyICBasedFilter(
    routeCoordinates: Coordinates[],
    allRestAreas: RestArea[],
    customOptions?: Record<string, any>
  ): Promise<{
    results: FilteredRestAreaResult[];
    detail: FilteringDetail;
  }> {
    
    console.log('🧭 IC 기반 방향 필터 적용 중...');
    
    const options = {
      ...IC_BASED_FILTER_OPTIONS,
      ...customOptions
    };
    
    const accessibilityResults = await icBasedDirectionFilter.filterRestAreasByDirection(
      routeCoordinates,
      allRestAreas,
      options
    );
    
    // 접근 가능한 휴게소만 필터링
    const accessibleRestAreas = accessibilityResults
      .filter(result => result.isAccessible)
      .map((result, index) => ({
        restArea: result.restArea,
        distanceFromRoute: 0,
        distanceFromStart: index * 20,
        estimatedTime: index * 15,
        confidence: result.confidence,
        directionReason: [result.analysis.reason],
        routePosition: index / Math.max(accessibilityResults.length - 1, 1)
      }));
    
    const summary = icBasedDirectionFilter.getSummary(accessibilityResults);
    
    const detail: FilteringDetail = {
      filterType: FilterType.IC_BASED,
      totalProcessed: allRestAreas.length,
      totalFiltered: accessibleRestAreas.length,
      stages: [
        {
          name: '전체',
          count: summary.total,
          description: '전체 휴게소'
        },
        {
          name: '접근 가능',
          count: summary.accessible,
          description: 'IC 기반 접근 가능'
        },
        {
          name: '접근 불가',
          count: summary.inaccessible,
          description: 'IC 기반 접근 불가'
        }
      ],
      performance: {
        duration: 0,
        averageConfidence: summary.averageConfidence
      }
    };
    
    return { results: accessibleRestAreas, detail };
  }
  
  /**
   * 노선 코드 정밀 필터 적용
   */
  private async applyRouteCodeFilter(
    routeCoordinates: Coordinates[],
    allRestAreas: RestArea[],
    customOptions?: Record<string, any>
  ): Promise<{
    results: FilteredRestAreaResult[];
    detail: FilteringDetail;
  }> {
    
    console.log('🎯 노선 코드 정밀 필터 적용 중...');
    
    const options = {
      ...ROUTE_CODE_FILTER_OPTIONS,
      ...customOptions
    };
    
    const precisionResults = await routeCodePrecisionFilter.filterRestAreasByRouteCode(
      routeCoordinates,
      allRestAreas as any,
      options
    );
    
    const filteredRestAreas = routeCodePrecisionFilter.getIncludedRestAreas(precisionResults);
    const summary = routeCodePrecisionFilter.getSummary(precisionResults);
    
    const results: FilteredRestAreaResult[] = filteredRestAreas.map((area, index) => ({
      restArea: area,
      distanceFromRoute: summary.averageDistance * 1000,
      distanceFromStart: index * 20,
      estimatedTime: index * 15,
      confidence: 0.7,
      directionReason: ['노선 코드 매칭'],
      routePosition: index / Math.max(filteredRestAreas.length - 1, 1)
    }));
    
    const detail: FilteringDetail = {
      filterType: FilterType.ROUTE_CODE,
      totalProcessed: allRestAreas.length,
      totalFiltered: filteredRestAreas.length,
      stages: [
        {
          name: '전체',
          count: summary.total,
          description: '전체 휴게소'
        },
        {
          name: '포함',
          count: summary.included,
          description: '노선 코드 매칭'
        },
        {
          name: '제외',
          count: summary.filtered,
          description: '노선 코드 불일치'
        }
      ],
      performance: {
        duration: 0,
        averageConfidence: 0.7
      }
    };
    
    return { results, detail };
  }
  
  /**
   * 거리만 기반 필터 적용 (단순)
   */
  private async applyDistanceOnlyFilter(
    routeCoordinates: Coordinates[],
    allRestAreas: RestArea[],
    customOptions?: Record<string, any>
  ): Promise<{
    results: FilteredRestAreaResult[];
    detail: FilteringDetail;
  }> {
    
    console.log('📏 거리 기반 필터 적용 중...');
    
    const maxDistance = customOptions?.maxDistance || 5; // km
    
    const filteredRestAreas = allRestAreas.filter(restArea => {
      const distance = this.getMinDistanceFromRoute(
        restArea.coordinates,
        routeCoordinates
      );
      return distance <= maxDistance;
    });
    
    const results: FilteredRestAreaResult[] = filteredRestAreas.map((area, index) => ({
      restArea: area,
      distanceFromRoute: 0,
      distanceFromStart: index * 20,
      estimatedTime: index * 15,
      confidence: 0.5,
      directionReason: ['거리 기반'],
      routePosition: index / Math.max(filteredRestAreas.length - 1, 1)
    }));
    
    const detail: FilteringDetail = {
      filterType: FilterType.DISTANCE_ONLY,
      totalProcessed: allRestAreas.length,
      totalFiltered: filteredRestAreas.length,
      stages: [
        {
          name: '전체',
          count: allRestAreas.length,
          description: '전체 휴게소'
        },
        {
          name: `${maxDistance}km 이내`,
          count: filteredRestAreas.length,
          description: '거리 필터 적용'
        }
      ],
      performance: {
        duration: 0,
        averageConfidence: 0.5
      }
    };
    
    return { results, detail };
  }
  
  /**
   * DB에서 모든 휴게소 조회
   */
  private async getAllRestAreas(): Promise<RestArea[]> {
    try {
      const restAreas = await highwayAPIWithDB.getRestAreas();
      
      if (restAreas && restAreas.length > 0) {
        console.log(`🗄️ DB에서 ${restAreas.length}개 휴게소 조회 성공`);
        return restAreas;
      }
      
      throw new Error('DB에 휴게소 데이터가 없습니다.');
      
    } catch (error) {
      console.error('❌ DB 조회 실패:', error);
      throw error;
    }
  }
  
  /**
   * 경로로부터 최소 거리 계산 (km)
   */
  private getMinDistanceFromRoute(
    point: Coordinates,
    routeCoordinates: Coordinates[]
  ): number {
    
    let minDistance = Infinity;
    
    for (const routePoint of routeCoordinates) {
      const distance = this.calculateDistance(point, routePoint);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  }
  
  /**
   * 두 지점 간 거리 계산 (km)
   */
  private calculateDistance(
    point1: Coordinates,
    point2: Coordinates
  ): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// 싱글톤 인스턴스 export
export const restAreaFilterService = RestAreaFilterService.getInstance();