/**
 * IC(인터체인지) 기반 방향성 필터링
 * Reference 서비스의 알고리즘을 TypeScript로 포팅
 */

import { Coordinates, RestArea } from '@/types/map';
import { interchangeService, Interchange } from '../interchangeService';
import { supabase } from '../supabase';

// 방향 열거형 (Reference와 동일)
export enum Direction {
  UP = 'UP',        // 상행
  DOWN = 'DOWN',    // 하행
  BOTH = 'BOTH',    // 양방향
  UNKNOWN = 'UNKNOWN' // 판별 불가
}

// 휴게소 접근성 분석 결과
export interface RestAreaAccessibility {
  restArea: RestArea;
  direction: Direction;
  isAccessible: boolean;
  confidence: number;
  analysis: {
    routeName: string;
    nearbyICs: Interchange[];
    startIC?: Interchange;
    endIC?: Interchange;
    weightDifference?: number;
    reason: string;
  };
}

// 필터링 옵션
export interface ICFilterOptions {
  maxDistanceFromRoute: number; // 경로로부터 최대 거리 (m)
  includeUnknown: boolean;       // 방향 판별 불가 휴게소 포함 여부
  includeBoth: boolean;          // 양방향 휴게소 포함 여부
  strictMode: boolean;           // 엄격 모드
}

export class ICBasedDirectionFilter {
  
  private readonly DEFAULT_OPTIONS: ICFilterOptions = {
    maxDistanceFromRoute: 500,
    includeUnknown: false,
    includeBoth: true,
    strictMode: true
  };
  
  /**
   * Reference 알고리즘과 동일한 메인 필터링 함수
   * RestAreaServiceImpl.getAccessibleRestAreas() 포팅
   */
  async filterRestAreasByDirection(
    routeCoordinates: Coordinates[],
    restAreas: RestArea[],
    options: Partial<ICFilterOptions> = {}
  ): Promise<RestAreaAccessibility[]> {
    
    const filterOptions = { ...this.DEFAULT_OPTIONS, ...options };
    console.log('🎯 IC 기반 방향성 필터링 시작...');
    
    try {
      // 1. 경로 근처 휴게소만 필터링 (Reference: findNearbyRoutes)
      const nearbyRestAreas = await this.findNearbyRestAreas(
        routeCoordinates,
        restAreas,
        filterOptions.maxDistanceFromRoute
      );
      
      console.log(`📍 경로 근처 휴게소: ${nearbyRestAreas.length}개`);
      
      // 2. 휴게소들의 노선명 추출 (Reference: extractRouteNames)
      const routeNames = this.extractRouteNames(nearbyRestAreas);
      console.log(`🛣️ 관련 노선: ${Array.from(routeNames).join(', ')}`);
      
      // 3. 각 노선별 방향 계산 (Reference: getDirectionByRoute)
      const directionMap = new Map<string, Direction>();
      
      for (const routeName of routeNames) {
        const direction = await this.getDirectionByRoute(
          routeCoordinates,
          routeName
        );
        directionMap.set(routeName, direction);
        console.log(`  ${routeName}: ${direction}`);
      }
      
      // 4. 접근 가능한 휴게소 필터링 (Reference: filterAccessible)
      const accessibilityResults = this.filterAccessible(
        nearbyRestAreas,
        directionMap,
        filterOptions
      );
      
      const accessibleCount = accessibilityResults.filter(r => r.isAccessible).length;
      console.log(`✅ 접근 가능 휴게소: ${accessibleCount}/${nearbyRestAreas.length}개`);
      
      return accessibilityResults;
      
    } catch (error) {
      console.error('❌ IC 기반 필터링 실패:', error);
      throw error;
    }
  }
  
  /**
   * 경로 근처 휴게소 찾기
   */
  private async findNearbyRestAreas(
    routeCoordinates: Coordinates[],
    restAreas: RestArea[],
    maxDistance: number
  ): Promise<RestArea[]> {
    
    const nearbyRestAreas: RestArea[] = [];
    
    for (const restArea of restAreas) {
      const distance = this.getMinDistanceFromRoute(
        restArea.coordinates,
        routeCoordinates
      );
      
      if (distance <= maxDistance) {
        nearbyRestAreas.push(restArea);
      }
    }
    
    return nearbyRestAreas;
  }
  
  /**
   * 휴게소들의 노선명 추출
   * Reference: RestAreas.extractRouteNames()
   */
  private extractRouteNames(restAreas: RestArea[]): Set<string> {
    const routeNames = new Set<string>();
    
    restAreas.forEach(restArea => {
      if (restArea.routeName) {
        // 노선명 정규화 (예: "경부고속도로" -> "경부선")
        const normalized = this.normalizeRouteName(restArea.routeName);
        routeNames.add(normalized);
      }
    });
    
    return routeNames;
  }
  
  /**
   * 노선명 정규화
   */
  private normalizeRouteName(routeName: string): string {
    return routeName
      .replace('고속도로', '선')
      .replace('고속국도', '선')
      .replace('자동차도', '선')
      .trim();
  }
  
  /**
   * 경로와 노선에 대한 방향 판단
   * Reference: InterchangeService.getDirectionByRoute()
   */
  private async getDirectionByRoute(
    routeCoordinates: Coordinates[],
    routeName: string
  ): Promise<Direction> {
    
    console.log(`🧭 방향 판단 중: ${routeName}`);
    
    try {
      // IC 서비스를 통해 방향 판단
      const direction = await interchangeService.getDirectionByRoute(
        routeCoordinates,
        routeName
      );
      
      return direction as Direction;
      
    } catch (error) {
      console.error(`방향 판단 실패 (${routeName}):`, error);
      return Direction.UNKNOWN;
    }
  }
  
  /**
   * 접근 가능한 휴게소 필터링
   * Reference: RestAreas.filterAccessible()
   */
  private filterAccessible(
    restAreas: RestArea[],
    directionMap: Map<string, Direction>,
    options: ICFilterOptions
  ): RestAreaAccessibility[] {
    
    const results: RestAreaAccessibility[] = [];
    
    restAreas.forEach(restArea => {
      const routeName = this.normalizeRouteName(restArea.routeName || '');
      const routeDirection = directionMap.get(routeName) || Direction.UNKNOWN;
      
      // 휴게소의 방향 정보 가져오기 (DB 또는 필드에서)
      const restAreaDirection = this.getRestAreaDirection(restArea);
      
      // 접근 가능성 판단 (Reference: RestArea.isAccessible())
      const isAccessible = this.isRestAreaAccessible(
        restAreaDirection,
        routeDirection,
        options
      );
      
      // 신뢰도 계산
      const confidence = this.calculateConfidence(
        restAreaDirection,
        routeDirection,
        isAccessible
      );
      
      results.push({
        restArea,
        direction: routeDirection,
        isAccessible,
        confidence,
        analysis: {
          routeName,
          nearbyICs: [], // 추후 상세 정보 추가 가능
          reason: this.getAccessibilityReason(
            restAreaDirection,
            routeDirection,
            isAccessible
          )
        }
      });
    });
    
    return results;
  }
  
  /**
   * 휴게소 방향 정보 추출
   */
  private getRestAreaDirection(restArea: RestArea): Direction {
    // 1. DB에 저장된 route_direction 사용 (있으면)
    if (restArea.routeDirection) {
      return restArea.routeDirection as Direction;
    }
    
    // 2. direction 필드에서 추출 (양방향 키워드 우선 체크)
    const direction = (restArea.direction || '').toLowerCase();
    
    // 양방향 키워드를 먼저 체크 (보고서 권장사항)
    if (direction.includes('양방향') || direction.includes('양') || 
        direction.includes('상하행') || direction.includes('통합')) {
      return Direction.BOTH;
    } else if (direction.includes('상행') || direction.includes('북') || direction.includes('서울')) {
      return Direction.UP;
    } else if (direction.includes('하행') || direction.includes('남') || direction.includes('부산')) {
      return Direction.DOWN;
    }
    
    // 3. 휴게소명에서 추출
    const name = restArea.name.toLowerCase();
    
    // 양방향 키워드를 먼저 체크 (보고서 권장사항)
    if (name.includes('양방향') || name.includes('상하행') || name.includes('통합')) {
      return Direction.BOTH;
    }
    
    // 괄호 안 방향 정보는 참고용으로만 사용 (보고서: 괄호 패턴 무시 권장)
    // 실제로는 양방향이거나 접근 가능한 경우가 많음
    
    return Direction.UNKNOWN;
  }
  
  /**
   * 휴게소 접근 가능성 판단
   * Reference: RestArea.isAccessible()
   */
  private isRestAreaAccessible(
    restAreaDirection: Direction,
    routeDirection: Direction,
    options: ICFilterOptions
  ): boolean {
    
    // Reference 알고리즘과 동일한 로직
    if (routeDirection === Direction.UNKNOWN && options.includeUnknown) {
      return true; // 방향을 모르면 포함
    }
    
    if (restAreaDirection === Direction.BOTH && options.includeBoth) {
      return true; // 양방향 휴게소는 항상 접근 가능
    }
    
    if (restAreaDirection === routeDirection) {
      return true; // 방향이 일치하면 접근 가능
    }
    
    // 엄격 모드가 아니고 방향을 모르는 경우
    if (!options.strictMode && restAreaDirection === Direction.UNKNOWN) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 신뢰도 계산
   */
  private calculateConfidence(
    restAreaDirection: Direction,
    routeDirection: Direction,
    isAccessible: boolean
  ): number {
    
    if (!isAccessible) return 0.1;
    
    // 방향이 정확히 일치
    if (restAreaDirection === routeDirection && 
        routeDirection !== Direction.UNKNOWN) {
      return 1.0;
    }
    
    // 양방향 휴게소
    if (restAreaDirection === Direction.BOTH) {
      return 0.9;
    }
    
    // 방향을 모르는 경우
    if (restAreaDirection === Direction.UNKNOWN || 
        routeDirection === Direction.UNKNOWN) {
      return 0.5;
    }
    
    return 0.3;
  }
  
  /**
   * 접근성 판단 이유 생성
   */
  private getAccessibilityReason(
    restAreaDirection: Direction,
    routeDirection: Direction,
    isAccessible: boolean
  ): string {
    
    if (isAccessible) {
      if (restAreaDirection === Direction.BOTH) {
        return '양방향 휴게소 (접근 가능)';
      }
      if (restAreaDirection === routeDirection) {
        return `방향 일치: ${routeDirection} (접근 가능)`;
      }
      if (routeDirection === Direction.UNKNOWN) {
        return '방향 판별 불가 (포함)';
      }
      return '접근 가능';
    } else {
      if (restAreaDirection !== routeDirection) {
        return `방향 불일치: 휴게소(${restAreaDirection}) ≠ 경로(${routeDirection})`;
      }
      return '접근 불가';
    }
  }
  
  /**
   * 유틸리티: 경로로부터 최소 거리 계산
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
   * 유틸리티: 두 지점 간 거리 계산 (미터)
   */
  private calculateDistance(
    point1: Coordinates,
    point2: Coordinates
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * DB에서 직접 휴게소 필터링 (PostGIS 활용)
   */
  async filterRestAreasFromDB(
    routeLinestring: string, // WKT 형식의 LineString
    options: Partial<ICFilterOptions> = {}
  ): Promise<RestArea[]> {
    
    const filterOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // PostGIS 함수를 활용한 필터링
      const { data, error } = await supabase
        .rpc('filter_rest_areas_by_direction', {
          route_linestring: routeLinestring,
          max_distance_meters: filterOptions.maxDistanceFromRoute
        });
      
      if (error) {
        console.error('DB 필터링 실패:', error);
        throw error;
      }
      
      // 접근 가능한 휴게소만 반환
      return (data || [])
        .filter((row: any) => row.is_accessible)
        .map((row: any) => ({
          id: row.rest_area_id,
          name: row.name,
          routeName: row.route_name,
          direction: row.direction,
          routeDirection: row.route_direction,
          coordinates: {
            lat: row.lat,
            lng: row.lng
          }
          // 필요한 다른 필드들...
        }));
      
    } catch (error) {
      console.error('DB 필터링 오류:', error);
      throw error;
    }
  }
  
  /**
   * 필터링 결과 요약
   */
  getSummary(results: RestAreaAccessibility[]): {
    total: number;
    accessible: number;
    inaccessible: number;
    byDirection: Record<Direction, number>;
    averageConfidence: number;
  } {
    const summary = {
      total: results.length,
      accessible: 0,
      inaccessible: 0,
      byDirection: {
        [Direction.UP]: 0,
        [Direction.DOWN]: 0,
        [Direction.BOTH]: 0,
        [Direction.UNKNOWN]: 0
      },
      averageConfidence: 0
    };
    
    let totalConfidence = 0;
    
    results.forEach(result => {
      if (result.isAccessible) {
        summary.accessible++;
      } else {
        summary.inaccessible++;
      }
      
      summary.byDirection[result.direction]++;
      totalConfidence += result.confidence;
    });
    
    summary.averageConfidence = results.length > 0 
      ? totalConfidence / results.length 
      : 0;
    
    return summary;
  }
}

// 싱글톤 인스턴스
export const icBasedDirectionFilter = new ICBasedDirectionFilter();