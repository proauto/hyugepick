import { Coordinates, RestArea } from '@/types/map';
import { highwayAPIWithDB } from './highwayApiWithDB';
import { routeCodePrecisionFilter } from './routing/routeCodePrecisionFilter';
import { highwayFirstRestAreaFilter } from './highwayFirstRestAreaFilter';
import { 
  UNIFIED_FILTER_DEFAULT_OPTIONS,
  HIGHWAY_FIRST_FILTER_OPTIONS,
  mergeFilterOptions 
} from './config/restAreaFilterConfig';

// 통합 휴게소 필터링 결과
interface FilteredRestArea extends RestArea {
  distanceFromStart: number;    // 시작점으로부터 거리 (km)
  estimatedTime: number;        // 예상 도착 시간 (분)
  confidence: number;           // 방향성 판단 신뢰도 (0-1)
  directionReason: string[];    // 방향성 판단 근거
  routePosition: number;        // 경로상 위치 비율 (0-1)
}

// 필터링 옵션
interface FilteringOptions {
  maxDistance: number;          // 경로로부터 최대 거리 (km)
  minInterval: number;          // 휴게소간 최소 간격 (km)  
  maxResults: number;           // 최대 결과 수
  confidenceThreshold: number;  // 방향성 신뢰도 최소값
  includePrivateHighways: boolean; // 민자고속도로 포함
}

export class UnifiedRestAreaFilter {
  private readonly DEFAULT_OPTIONS: FilteringOptions = UNIFIED_FILTER_DEFAULT_OPTIONS;

  // 메인 필터링 함수 - 새로운 고속도로 우선 필터링 사용
  async filterRestAreasForRoute(
    routeCoordinates: Coordinates[],
    origin: Coordinates,
    destination: Coordinates,
    options: Partial<FilteringOptions> = {},
    actualRouteHighways?: string[] // 카카오 API의 실제 경로 고속도로 목록
  ): Promise<FilteredRestArea[]> {
    
    const finalOptions = mergeFilterOptions(this.DEFAULT_OPTIONS, options);
    
    console.log('🔍 통합 휴게소 필터링 시작 (고속도로 우선 방식):', {
      경로포인트: routeCoordinates.length,
      옵션: finalOptions
    });

    try {
      // 새로운 고속도로 우선 필터링 사용 (공통 설정 적용)
      console.log('🚀 고속도로 우선 필터링 적용...');
      
      const allRestAreas = await this.getAllRestAreas();
      console.log(`📊 전체 휴게소: ${allRestAreas.length}개`);
      
      // 특정 휴게소들 디버깅
      const debugRestAreas = ['용인', '덕평', '여주', '청도새마을', '청도'];
      const foundDebugAreas = [];
      
      for (const debugName of debugRestAreas) {
        const found = allRestAreas.filter(ra => 
          ra.name.toLowerCase().includes(debugName.toLowerCase())
        );
        if (found.length > 0) {
          foundDebugAreas.push(...found);
          console.log(`🔍 디버깅 대상 발견: ${found.map(f => f.name).join(', ')} (도로: ${found.map(f => f.routeName || '미상').join(', ')})`);
        }
      }
      
      if (foundDebugAreas.length === 0) {
        console.log('⚠️ 디버깅 대상 휴게소가 DB에서 발견되지 않음');
      }
      
      const highwayFilterResult = await highwayFirstRestAreaFilter.filterRestAreas(
        routeCoordinates,
        allRestAreas,
        {
          ...HIGHWAY_FIRST_FILTER_OPTIONS,
          maxDistanceFromRoute: finalOptions.maxDistance * 1000, // km → m 변환
          minInterval: finalOptions.minInterval,
          maxResults: finalOptions.maxResults,
          actualRouteHighways // 실제 경로 고속도로 정보 전달
        }
      );

      const filteredRestAreas = highwayFilterResult.restAreas;
      
      // 디버깅 대상 휴게소가 필터링에서 살아남았는지 확인
      const survivedDebugAreas = [];
      const filteredOutDebugAreas = [];
      
      for (const debugName of debugRestAreas) {
        const original = allRestAreas.filter(ra => 
          ra.name.toLowerCase().includes(debugName.toLowerCase())
        );
        const survived = filteredRestAreas.filter(ra => 
          ra.name.toLowerCase().includes(debugName.toLowerCase())
        );
        
        if (survived.length > 0) {
          survivedDebugAreas.push(...survived.map(s => s.name));
        } else if (original.length > 0) {
          filteredOutDebugAreas.push(...original.map(o => `${o.name}(${o.routeName || o.route_name || '미상'})`));
        }
      }
      
      if (filteredOutDebugAreas.length > 0) {
        console.log('❌ 필터링된 디버깅 대상:', filteredOutDebugAreas.join(', '));
      }
      
      console.log('✅ 고속도로 우선 필터링 완료:', {
        최종결과: `${filteredRestAreas.length}개`,
        매칭품질: highwayFilterResult.summary.matchingQuality,
        감지고속도로: highwayFilterResult.summary.detectedHighways.map(h => h.name).join(', '),
        살아남은디버깅대상: survivedDebugAreas.length > 0 ? survivedDebugAreas.join(', ') : '❌ 모두 필터링됨'
      });
      
      // 필터링된 휴게소들을 도로별로 분류하여 출력
      const byRoute = {};
      filteredRestAreas.forEach(ra => {
        const routeName = ra.routeName || ra.route_name || '미분류';
        if (!byRoute[routeName]) byRoute[routeName] = [];
        byRoute[routeName].push(ra.name);
      });
      
      console.log('📊 도로별 필터링 결과:');
      Object.entries(byRoute).forEach(([routeName, restAreas]) => {
        console.log(`  ${routeName}: ${restAreas.length}개 - ${restAreas.join(', ')}`);
      });

      // 기존 포맷으로 변환
      const convertedResults: FilteredRestArea[] = filteredRestAreas.map((area, index) => {
        const coordinates = this.getCoordinates(area);
        const distanceFromStart = this.calculateDistanceFromStart(coordinates, routeCoordinates[0]);
        const estimatedTime = this.calculateEstimatedTime(distanceFromStart, 80); // 80km/h 평균속도
        
        return {
          ...area,
          distanceFromStart: distanceFromStart / 1000, // m → km 변환
          estimatedTime,
          confidence: 0.8, // 고속도로 기반 필터링의 높은 신뢰도
          directionReason: ['고속도로 매칭 기반'],
          routePosition: index / Math.max(filteredRestAreas.length - 1, 1)
        };
      });

      return convertedResults;

    } catch (error) {
      console.error('❌ 통합 필터링 오류:', error);
      throw new Error('휴게소 필터링에 실패했습니다.');
    }
  }

  // 1단계: DB에서 모든 휴게소 조회 (민자고속도로 포함)
  private async getAllRestAreas(): Promise<RestArea[]> {
    try {
      // DB 우선 조회
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

  // 2단계: 거리 기반 필터링
  private filterByDistance(
    restAreas: RestArea[],
    routeCoordinates: Coordinates[],
    maxDistance: number
  ): RestArea[] {
    return restAreas.filter(restArea => {
      const minDistance = Math.min(
        ...routeCoordinates.map(coord => 
          this.calculateDistance(restArea.coordinates, coord)
        )
      );
      return minDistance <= maxDistance;
    });
  }

  // 3단계: 방향성 분석 및 필터링 (핵심 개선)
  private analyzeAndFilterByDirection(
    restAreas: RestArea[],
    routeCoordinates: Coordinates[],
    origin: Coordinates,
    destination: Coordinates,
    confidenceThreshold: number
  ): FilteredRestArea[] {
    
    // 경로 방향 벡터 계산
    const routeDirection = this.calculateRouteDirection(origin, destination);
    const isNorthbound = destination.lat > origin.lat;
    const isEastbound = destination.lng > origin.lng;
    
    console.log(`🧭 경로 방향 분석: ${isNorthbound ? '북향' : '남향'}, ${isEastbound ? '동향' : '서향'}`);

    return restAreas.map(restArea => {
      const analysis = this.analyzeRestAreaDirection(
        restArea,
        routeDirection,
        isNorthbound,
        isEastbound
      );

      return {
        ...restArea,
        confidence: analysis.confidence,
        directionReason: analysis.reasons,
        distanceFromStart: 0, // 4단계에서 계산
        estimatedTime: 0,     // 4단계에서 계산
        routePosition: 0      // 4단계에서 계산
      };
    }).filter(area => area.confidence >= confidenceThreshold);
  }

  // 휴게소 방향성 분석 (수정된 로직 - 더 포용적)
  private analyzeRestAreaDirection(
    restArea: RestArea,
    routeDirection: { lat: number; lng: number },
    isNorthbound: boolean,
    isEastbound: boolean
  ): { confidence: number; reasons: string[] } {
    
    const name = restArea.name || '';
    const direction = restArea.direction || '';
    const reasons: string[] = [];
    let confidence = 0.6; // 기본 신뢰도를 높임

    console.log(`🔍 방향성 분석: ${name} (기본신뢰도: 0.6)`);

    // 1. 휴게소명 기반 분석 (가장 중요) - 더 관대하게 조정
    if (name.includes('(')) {
      const match = name.match(/\(([^)]+)\)/);
      if (match) {
        const directionHint = match[1];
        
        // 명확한 반대방향만 제외 (페널티 줄임)
        if (isNorthbound) {
          if (directionHint.includes('서울') || directionHint.includes('인천')) {
            confidence += 0.2;
            reasons.push(`북향 경로 일치: ${directionHint}`);
          } else if (directionHint.includes('부산') || directionHint.includes('대구')) {
            confidence -= 0.2; // 페널티 감소
            reasons.push(`남향 표시이지만 포함: ${directionHint}`);
          } else {
            confidence += 0.1; // 애매한 경우 약간 보너스
            reasons.push(`방향 정보 애매: ${directionHint}`);
          }
        } else {
          if (directionHint.includes('부산') || directionHint.includes('대구')) {
            confidence += 0.2;
            reasons.push(`남향 경로 일치: ${directionHint}`);
          } else if (directionHint.includes('서울') || directionHint.includes('인천')) {
            confidence -= 0.2; // 페널티 감소
            reasons.push(`북향 표시이지만 포함: ${directionHint}`);
          } else {
            confidence += 0.1; // 애매한 경우 약간 보너스
            reasons.push(`방향 정보 애매: ${directionHint}`);
          }
        }
      }
    } else {
      // 괄호가 없는 경우 보너스 (일반 휴게소)
      confidence += 0.15;
      reasons.push('일반 휴게소 (방향 제약 없음)');
    }

    // 2. 상행/하행 표시 분석 (약화)
    if (direction.includes('상행') || name.includes('상행')) {
      if (isNorthbound) {
        confidence += 0.1;
        reasons.push('상행 표시');
      } else {
        confidence -= 0.1; // 페널티 감소
        reasons.push('상행 표시');
      }
    } else if (direction.includes('하행') || name.includes('하행')) {
      if (!isNorthbound) {
        confidence += 0.1;
        reasons.push('하행 표시');
      } else {
        confidence -= 0.1; // 페널티 감소
        reasons.push('하행 표시');
      }
    }

    // 3. 노선 정보 기반 추가 분석 (강화)
    if (restArea.routeCode) {
      const routeCode = restArea.routeCode;
      if (routeCode === '0010') { // 경부고속도로
        confidence += 0.15; // 보너스 증가
        reasons.push('경부고속도로 휴게소');
      } else if (['9999', '900', '950'].includes(routeCode)) { // 민자고속도로
        confidence += 0.1; // 보너스 증가
        reasons.push('민자고속도로 휴게소');
      } else if (routeCode) {
        confidence += 0.05; // 다른 고속도로도 보너스
        reasons.push(`${routeCode} 고속도로`);
      }
    }

    // 4. 경로상 위치 기반 보너스 (새로 추가)
    if (restArea.name && !restArea.name.includes('IC') && !restArea.name.includes('JC')) {
      confidence += 0.1;
      reasons.push('휴게소 (IC/JC 아님)');
    }

    console.log(`🔍 ${name}: 최종 신뢰도 ${confidence.toFixed(2)} (${reasons.join(', ')})`);

    // 신뢰도 범위 조정 (0~1)
    confidence = Math.max(0.2, Math.min(1, confidence)); // 최소값을 0.2로 설정
    
    return { confidence, reasons };
  }

  // 4단계: 경로상 위치 및 거리 계산
  private calculateRoutePositions(
    restAreas: FilteredRestArea[],
    routeCoordinates: Coordinates[]
  ): FilteredRestArea[] {
    
    const totalRouteDistance = this.calculateTotalRouteDistance(routeCoordinates);
    
    return restAreas.map(restArea => {
      let minDistance = Infinity;
      let closestIndex = 0;
      let cumulativeDistance = 0;

      // 경로상 가장 가까운 점 찾기
      routeCoordinates.forEach((coord, index) => {
        const distance = this.calculateDistance(restArea.coordinates, coord);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      // 시작점부터 가장 가까운 점까지의 거리 계산
      for (let i = 0; i < closestIndex; i++) {
        if (i < routeCoordinates.length - 1) {
          cumulativeDistance += this.calculateDistance(
            routeCoordinates[i],
            routeCoordinates[i + 1]
          );
        }
      }

      const routePosition = totalRouteDistance > 0 ? cumulativeDistance / totalRouteDistance : 0;
      const estimatedTime = Math.round((cumulativeDistance / 80) * 60); // 평균 80km/h

      return {
        ...restArea,
        distanceFromStart: Math.round(cumulativeDistance * 10) / 10,
        estimatedTime,
        routePosition: Math.round(routePosition * 1000) / 1000
      };
    });
  }

  // 6단계: 최소 간격 적용
  private applyMinimumInterval(
    restAreas: FilteredRestArea[],
    minInterval: number
  ): FilteredRestArea[] {
    if (restAreas.length === 0) return [];

    const result: FilteredRestArea[] = [restAreas[0]];
    
    for (let i = 1; i < restAreas.length; i++) {
      const lastAdded = result[result.length - 1];
      const current = restAreas[i];
      
      const distance = current.distanceFromStart - lastAdded.distanceFromStart;
      
      if (distance >= minInterval) {
        result.push(current);
      } else {
        // 신뢰도가 더 높은 휴게소를 선택
        if (current.confidence > lastAdded.confidence) {
          result[result.length - 1] = current;
        }
      }
    }

    return result;
  }

  // 유틸리티 함수들
  private calculateRouteDirection(origin: Coordinates, destination: Coordinates) {
    return {
      lat: destination.lat - origin.lat,
      lng: destination.lng - origin.lng
    };
  }

  private calculateTotalRouteDistance(coordinates: Coordinates[]): number {
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += this.calculateDistance(coordinates[i], coordinates[i + 1]);
    }
    return totalDistance;
  }

  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371;
    const dLat = this.degToRad(point2.lat - point1.lat);
    const dLng = this.degToRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(point1.lat)) * Math.cos(this.degToRad(point2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // 좌표 추출 헬퍼 함수
  private getCoordinates(restArea: any): { lat: number; lng: number } {
    if (restArea.coordinates && restArea.coordinates.lat && restArea.coordinates.lng) {
      return { lat: restArea.coordinates.lat, lng: restArea.coordinates.lng };
    }
    if (restArea.lat && restArea.lng) {
      return { lat: restArea.lat, lng: restArea.lng };
    }
    return { lat: 0, lng: 0 };
  }

  // 시작점으로부터 거리 계산 (미터)
  private calculateDistanceFromStart(
    point: { lat: number; lng: number },
    start: { lat: number; lng: number }
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (point.lat - start.lat) * Math.PI / 180;
    const dLng = (point.lng - start.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(start.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 예상 시간 계산 (분)
  private calculateEstimatedTime(distanceM: number, speedKmh: number): number {
    const distanceKm = distanceM / 1000;
    return Math.round((distanceKm / speedKmh) * 60);
  }
}

// 싱글톤 인스턴스
export const unifiedRestAreaFilter = new UnifiedRestAreaFilter();

// 타입 export
export type { FilteredRestArea, FilteringOptions };