/**
 * 고속도로 우선 휴게소 필터링 시스템
 * 거리 기반이 아닌 고속도로 매칭을 우선으로 하는 새로운 필터링 접근법
 */

import { routeHighwayMatcher } from './routing/routeHighwayMatcher';
import { icBasedDirectionFilter } from './routing/icBasedDirectionFilter';
import { RestArea } from '@/types/map';

interface RestAreaFilterOptions {
  maxDistanceFromRoute?: number;        // 경로로부터 최대 거리 (미터)
  maxDistanceFromIC?: number;           // IC로부터 최대 거리 (미터) 
  minHighwayCoverage?: number;          // 최소 고속도로 커버리지 (0-1)
  highwayConfidenceThreshold?: number;  // 고속도로 신뢰도 임계값
  enableDirectionFilter?: boolean;      // 방향 필터링 활성화
  minInterval?: number;                 // 최소 휴게소 간격 (km)
  maxResults?: number;                  // 최대 결과 수
  actualRouteHighways?: string[];       // 실제 경로의 고속도로 목록 (카카오 API)
}

interface FilteredRestArea {
  id?: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  routeName?: string;  // optional로 변경
  routeCode?: string;
  direction?: string;
  route_direction?: string;
  // 추가 호환성 필드
  lat?: number;
  lng?: number;
  route_name?: string;
  route_code?: string | null;
  facilities?: string[];
  operating_hours?: string;
  location?: string;
  [key: string]: any;
}

interface FilterResult {
  restAreas: FilteredRestArea[];
  summary: {
    total: number;
    filtered: number;
    included: number;
    filterStages: {
      initial: number;
      afterHighwayMatch: number;
      afterDistanceFilter: number;
      afterDirectionFilter: number;
      afterIntervalFilter: number;
      final: number;
    };
    detectedHighways: Array<{
      name: string;
      confidence: number;
      coverage: number;
    }>;
    matchingQuality: 'high' | 'medium' | 'low';
  };
}

export class HighwayFirstRestAreaFilter {
  
  private readonly DEFAULT_OPTIONS: RestAreaFilterOptions = {
    maxDistanceFromRoute: 1000,           // 1km (최종 결정)
    maxDistanceFromIC: 2000,              // 2km (IC 기반)
    minHighwayCoverage: 0.2,              // 20% 커버리지
    highwayConfidenceThreshold: 0.5,      // 50% 신뢰도
    enableDirectionFilter: true,
    minInterval: 8,                       // 8km 간격
    maxResults: 20
  };

  /**
   * 메인 필터링 함수 - 고속도로 우선 접근법
   */
  async filterRestAreas(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    allRestAreas: FilteredRestArea[],
    options: Partial<RestAreaFilterOptions> = {}
  ): Promise<FilterResult> {
    
    const filterOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    
    console.log('🚀 고속도로 우선 휴게소 필터링 시작:', {
      routePoints: routeCoordinates.length,
      initialRestAreas: allRestAreas.length,
      options: filterOptions
    });

    // 디버깅 대상 휴게소 추적
    const debugTargets = ['용인', '덕평', '여주', '청도새마을', '청도'];
    const trackDebugTargets = (stage: string, areas: any[]) => {
      const found = [];
      for (const target of debugTargets) {
        const matches = areas.filter(ra => 
          (ra.name || '').toLowerCase().includes(target.toLowerCase())
        );
        if (matches.length > 0) {
          found.push(...matches.map(m => `${m.name}(${m.routeName || m.route_name || '미상'})`));
        }
      }
      console.log(`🎯 ${stage} - 디버깅 대상: ${found.length > 0 ? found.join(', ') : '❌ 없음'}`);
      return found;
    };

    // 필터링 단계별 결과 추적
    const filterStages = {
      initial: allRestAreas.length,
      afterHighwayMatch: 0,
      afterDistanceFilter: 0,
      afterDirectionFilter: 0,
      afterIntervalFilter: 0,
      final: 0
    };
    
    // 초기 디버깅 대상 확인
    trackDebugTargets('초기상태', allRestAreas);

    let currentRestAreas = allRestAreas;

    // ====== 1단계: 경로-고속도로 매칭 (핵심) ======
    console.log('🛣️ 1단계: 경로가 지나가는 고속도로 식별...');
    
    const highwayMatchResult = await routeHighwayMatcher.matchRouteToHighways(
      routeCoordinates,
      {
        maxDistanceFromIC: filterOptions.maxDistanceFromIC,
        minCoverage: filterOptions.minHighwayCoverage,
        confidenceThreshold: filterOptions.highwayConfidenceThreshold
      }
    );

    console.log(`✅ 감지된 고속도로: ${highwayMatchResult.detectedHighways.length}개`);
    highwayMatchResult.detectedHighways.forEach(highway => {
      console.log(`  - ${highway.routeName}: 신뢰도 ${(highway.confidence * 100).toFixed(1)}%, 커버리지 ${highway.coveragePercentage.toFixed(1)}%`);
    });

    // ====== 2단계: 고속도로 기반 휴게소 필터링 (1차 핵심 필터) ======
    console.log('🎯 2단계: 감지된 고속도로 + 실제 경로 기반 휴게소 필터링...');
    
    if (highwayMatchResult.detectedHighways.length > 0 || (filterOptions.actualRouteHighways && filterOptions.actualRouteHighways.length > 0)) {
      currentRestAreas = await routeHighwayMatcher.filterRestAreasByDetectedHighways(
        currentRestAreas,
        highwayMatchResult.detectedHighways,
        filterOptions.actualRouteHighways // 실제 경로 데이터 전달
      );
    } else {
      console.warn('⚠️ 감지된 고속도로가 없어 거리 기반 필터링으로 대체');
      currentRestAreas = this.fallbackDistanceFilter(routeCoordinates, currentRestAreas, filterOptions.maxDistanceFromRoute!);
    }
    
    filterStages.afterHighwayMatch = currentRestAreas.length;
    console.log(`  결과: ${allRestAreas.length}개 → ${currentRestAreas.length}개`);
    trackDebugTargets('고속도로매칭후', currentRestAreas);

    // ====== 3단계: 거리 기반 2차 필터링 (정리용) ======
    console.log('📏 3단계: 거리 기반 2차 필터링...');
    
    currentRestAreas = this.applyDistanceFilter(
      routeCoordinates,
      currentRestAreas,
      filterOptions.maxDistanceFromRoute!
    );
    
    filterStages.afterDistanceFilter = currentRestAreas.length;
    console.log(`  결과: ${filterStages.afterHighwayMatch}개 → ${currentRestAreas.length}개`);
    trackDebugTargets('거리필터후', currentRestAreas);

    // ====== 4단계: 방향성 필터링 (선택적) ======
    if (filterOptions.enableDirectionFilter && currentRestAreas.length > 0) {
      console.log('🧭 4단계: 방향성 기반 필터링...');
      
      // FilteredRestArea를 RestArea로 변환
      const restAreasForDirection: RestArea[] = currentRestAreas.map(ra => ({
        id: ra.id || `${ra.routeCode}_${ra.name}`,
        name: ra.name,
        coordinates: ra.coordinates,
        routeCode: ra.routeCode || '',
        direction: ra.direction || '',
        facilities: ra.facilities || [],
        operatingHours: ra.operating_hours || '24시간',
        address: ra.location || ''
      }));
      
      const directionResults = await icBasedDirectionFilter.filterRestAreasByDirection(
        routeCoordinates,
        restAreasForDirection,
        {
          maxDistanceFromRoute: filterOptions.maxDistanceFromRoute!,
          includeUnknown: true,
          includeBoth: true,
          strictMode: false
        }
      );

      // RestArea를 다시 FilteredRestArea로 변환
      currentRestAreas = directionResults
        .filter(result => result.isAccessible)
        .map(result => {
          const ra = result.restArea;
          const filteredRa = currentRestAreas.find(cra => cra.name === ra.name);
          return filteredRa || {
            id: ra.id,
            name: ra.name,
            coordinates: ra.coordinates,
            routeName: ra.routeCode || '',
            routeCode: ra.routeCode,
            direction: ra.direction,
            facilities: ra.facilities,
            operating_hours: ra.operatingHours,
            location: ra.address
          };
        });
      
      filterStages.afterDirectionFilter = currentRestAreas.length;
      console.log(`  결과: ${filterStages.afterDistanceFilter}개 → ${currentRestAreas.length}개`);
      trackDebugTargets('방향필터후', currentRestAreas);
    } else {
      filterStages.afterDirectionFilter = filterStages.afterDistanceFilter;
    }

    // ====== 5단계: 간격 기반 최적화 ======
    console.log('⚖️ 5단계: 휴게소 간격 최적화...');
    
    currentRestAreas = this.applyIntervalFilter(
      routeCoordinates,
      currentRestAreas,
      filterOptions.minInterval!,
      filterOptions.maxResults!
    );
    
    filterStages.afterIntervalFilter = currentRestAreas.length;
    filterStages.final = currentRestAreas.length;
    console.log(`  결과: ${filterStages.afterDirectionFilter}개 → ${currentRestAreas.length}개`);
    trackDebugTargets('간격필터후(최종)', currentRestAreas);

    // ====== 결과 요약 생성 ======
    const summary = {
      total: allRestAreas.length,
      filtered: allRestAreas.length - currentRestAreas.length,
      included: currentRestAreas.length,
      filterStages,
      detectedHighways: highwayMatchResult.detectedHighways.map(highway => ({
        name: highway.routeName,
        confidence: highway.confidence,
        coverage: highway.coveragePercentage
      })),
      matchingQuality: highwayMatchResult.matchingQuality
    };

    const endTime = Date.now();
    console.log(`✅ 고속도로 우선 필터링 완료 (${endTime - startTime}ms):`);
    console.log(`  최종 결과: ${summary.included}개 휴게소`);
    console.log(`  매칭 품질: ${summary.matchingQuality}`);
    console.log(`  주요 고속도로: ${summary.detectedHighways.map(h => h.name).join(', ')}`);

    return {
      restAreas: currentRestAreas,
      summary
    };
  }

  /**
   * 거리 기반 필터링 (2차 정리용)
   */
  private applyDistanceFilter(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    restAreas: FilteredRestArea[],
    maxDistance: number
  ): FilteredRestArea[] {
    
    console.log(`📏 거리 필터링: 최대 ${maxDistance}m`);
    
    const results = restAreas.filter(restArea => {
      const coordinates = this.getCoordinates(restArea);
      if (!coordinates.lat || !coordinates.lng) return false;

      const distance = this.calculateMinDistanceToRoute(coordinates, routeCoordinates);
      
      // 디버깅: 대상 휴게소들의 거리 출력
      if (restArea.name.includes('기흥') || restArea.name.includes('여주') || 
          restArea.name.includes('양산') || restArea.name.includes('청도새마을') || 
          restArea.name.includes('청도')) {
        console.log(`  🔍 ${restArea.name} (${restArea.routeName || restArea.route_name || '미상'}): ${distance.toFixed(1)}m (${distance <= maxDistance ? '✅ 통과' : '❌ 차단'})`);
      }
      
      return distance <= maxDistance;
    });
    
    console.log(`  📊 결과: ${restAreas.length}개 → ${results.length}개`);
    return results;
  }

  /**
   * 방향성 필터링 폴백
   */
  private fallbackDistanceFilter(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    restAreas: FilteredRestArea[],
    maxDistance: number
  ): FilteredRestArea[] {
    
    console.log('🔄 고속도로 매칭 실패 - 거리 기반 폴백 필터링 적용');
    
    return this.applyDistanceFilter(routeCoordinates, restAreas, maxDistance);
  }

  /**
   * 간격 기반 필터링
   */
  private applyIntervalFilter(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    restAreas: FilteredRestArea[],
    minInterval: number,
    maxResults: number
  ): FilteredRestArea[] {
    
    if (restAreas.length === 0) return restAreas;

    // 경로상 거리 계산 및 정렬
    const restAreasWithDistance = restAreas.map(restArea => {
      const coordinates = this.getCoordinates(restArea);
      const distanceFromStart = this.calculateDistanceFromRouteStart(
        coordinates,
        routeCoordinates
      );

      return {
        ...restArea,
        distanceFromStart
      };
    }).sort((a, b) => a.distanceFromStart - b.distanceFromStart);

    // 간격 기반 선택
    const selectedRestAreas: FilteredRestArea[] = [];
    let lastDistance = -Infinity;

    for (const restArea of restAreasWithDistance) {
      if (restArea.distanceFromStart - lastDistance >= minInterval * 1000) {
        selectedRestAreas.push(restArea);
        lastDistance = restArea.distanceFromStart;
        
        if (selectedRestAreas.length >= maxResults) break;
      }
    }

    return selectedRestAreas;
  }

  /**
   * 좌표 추출 헬퍼
   */
  private getCoordinates(restArea: FilteredRestArea): { lat: number; lng: number } {
    if (restArea.coordinates && restArea.coordinates.lat && restArea.coordinates.lng) {
      return { lat: restArea.coordinates.lat, lng: restArea.coordinates.lng };
    }
    if (restArea.lat && restArea.lng) {
      return { lat: restArea.lat, lng: restArea.lng };
    }
    return { lat: 0, lng: 0 };
  }

  /**
   * 경로 시작점으로부터 거리 계산
   */
  private calculateDistanceFromRouteStart(
    point: { lat: number; lng: number },
    routeCoordinates: Array<{ lat: number; lng: number }>
  ): number {
    
    if (routeCoordinates.length === 0) return 0;
    
    const start = routeCoordinates[0];
    return this.calculateDistance(start, point);
  }

  /**
   * 경로와의 최단거리 계산
   */
  private calculateMinDistanceToRoute(
    point: { lat: number; lng: number },
    routeCoordinates: Array<{ lat: number; lng: number }>
  ): number {
    
    let minDistance = Infinity;
    
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];
      
      const distance = this.distanceFromPointToLineSegment(
        point,
        segmentStart,
        segmentEnd
      );
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  }

  /**
   * 점과 선분 사이의 최단거리
   */
  private distanceFromPointToLineSegment(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number }
  ): number {
    
    const A = point.lng - lineStart.lng;
    const B = point.lat - lineStart.lat;
    const C = lineEnd.lng - lineStart.lng;
    const D = lineEnd.lat - lineStart.lat;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return this.calculateDistance(point, lineStart);
    }

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = lineStart.lng;
      yy = lineStart.lat;
    } else if (param > 1) {
      xx = lineEnd.lng;
      yy = lineEnd.lat;
    } else {
      xx = lineStart.lng + param * C;
      yy = lineStart.lat + param * D;
    }

    return this.calculateDistance(point, { lat: yy, lng: xx });
  }

  /**
   * 두 점 간의 거리 계산 (미터)
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
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

export const highwayFirstRestAreaFilter = new HighwayFirstRestAreaFilter();