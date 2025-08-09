import { Coordinates, RestArea } from '@/types/map';
import { universalDirectionFilter, RestAreaDirectionAnalysis } from './routing/universalDirectionFilter';

// 매칭된 휴게소 정보 (방향성 정보 추가)
interface MatchedRestArea extends RestArea {
  distanceFromStart: number;    // 시작점으로부터 거리 (km)
  estimatedTime: number;        // 예상 도착 시간 (분)
  distanceToNext?: number;      // 다음 휴게소까지 거리 (km)
  timeToNext?: number;          // 다음 휴게소까지 시간 (분)
  routePosition: number;        // 경로상 위치 (0~1, 시작점=0, 끝점=1)
  isOnHighway: boolean;         // 고속도로 구간 여부
  matchConfidence: number;      // 매칭 신뢰도 (0~1)
  
  // 방향성 정보 (추가)
  isAccessible: boolean;        // 경로 방향으로 접근 가능 여부
  accessibleDirection: string;  // 접근 가능한 방향 (예: "부산방향", "하행")
  directionConfidence: number;  // 방향성 판단 신뢰도 (0~1)
  directionReasons: string[];   // 방향성 판단 근거
}

// 매칭 옵션
export interface MatchingOptions {
  maxDistance: number;          // 최대 검색 거리 (km)
  highwayOnly: boolean;         // 고속도로 구간만 검색
  minInterval: number;          // 휴게소간 최소 간격 (km)
  maxResults: number;           // 최대 결과 수
  
  // 방향성 필터링 옵션 (추가)
  enableDirectionFilter: boolean;     // 방향성 필터링 활성화
  useICBasedFilter?: boolean;         // IC 기반 필터 사용 여부 (새로운 옵션)
  directionStrictMode: boolean;       // 엄격 모드 (확실한 것만)
  directionConfidenceThreshold: number; // 방향성 판단 최소 신뢰도
  includeAmbiguousDirection: boolean;   // 방향이 애매한 휴게소 포함 여부
}

export class RestAreaMatcher {
  private readonly DEFAULT_OPTIONS: MatchingOptions = {
    maxDistance: 2,      // 2km 반경
    highwayOnly: true,   // 고속도로 구간만
    minInterval: 10,     // 10km 간격
    maxResults: 20,      // 최대 20개
    
    // 방향성 필터링 기본 옵션 (엄격하게 설정)
    enableDirectionFilter: true,        // 방향성 필터링 활성화
    directionStrictMode: true,          // 엄격 모드로 변경
    directionConfidenceThreshold: 0.7,  // 70% 이상 신뢰도로 강화
    includeAmbiguousDirection: false    // 애매한 경우 제외
  };

  // 경로와 인접한 휴게소들 찾기
  async matchRestAreasToRoute(
    routeCoordinates: Coordinates[],
    allRestAreas: RestArea[],
    options: Partial<MatchingOptions> = {}
  ): Promise<MatchedRestArea[]> {
    
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    console.log(`🔍 휴게소 매칭 시작: ${allRestAreas.length}개 → 경로 ${routeCoordinates.length}개 포인트`);

    try {
      // 1단계: 경로 근처 휴게소 후보 찾기
      const candidates = this.findNearbyRestAreas(
        routeCoordinates, 
        allRestAreas, 
        finalOptions.maxDistance
      );

      console.log(`📍 경로 근처 ${candidates.length}개 후보 발견`);

      // 2단계: 범용 방향성 필터링
      let directionFilteredAreas: RestAreaDirectionAnalysis[] = [];
      if (finalOptions.enableDirectionFilter) {
        directionFilteredAreas = await universalDirectionFilter.filterRestAreasByDirection(
          routeCoordinates,
          candidates,
          {
            confidenceThreshold: finalOptions.directionConfidenceThreshold,
            maxDistanceFromRoute: finalOptions.maxDistance,
            strictMode: finalOptions.directionStrictMode
          }
        );
      }

      // 3단계: 각 휴게소의 경로상 위치 및 거리 계산
      const restAreasToProcess = finalOptions.enableDirectionFilter 
        ? directionFilteredAreas.map(da => da.restArea) 
        : candidates;

      const matchedAreas: MatchedRestArea[] = restAreasToProcess.map(restArea => {
        const matchResult = this.calculateRoutePosition(restArea, routeCoordinates);
        
        // 방향성 정보 추가 (범용 필터 사용)
        const directionInfo = finalOptions.enableDirectionFilter 
          ? directionFilteredAreas.find(da => da.restArea.id === restArea.id)
          : null;

        return {
          ...restArea,
          ...matchResult,
          isOnHighway: this.determineHighwayStatus(restArea),
          matchConfidence: this.calculateMatchConfidence(matchResult, routeCoordinates),
          
          // 방향성 정보 추가
          isAccessible: directionInfo ? directionInfo.isAccessible : true,
          accessibleDirection: directionInfo?.analysis.directionFromName || restArea.direction || '방향 불명',
          directionConfidence: directionInfo?.confidence || 0.5,
          directionReasons: directionInfo?.analysis.reasons || []
        };
      });

      // 4단계: 고속도로 구간 필터링 (옵션에 따라)
      let filteredAreas = finalOptions.highwayOnly 
        ? matchedAreas.filter(area => area.isOnHighway)
        : matchedAreas;

      // 5단계: 접근 불가 휴게소 제거 (방향성 필터링 활성화시)
      if (finalOptions.enableDirectionFilter) {
        filteredAreas = filteredAreas.filter(area => area.isAccessible);
      }

      // 6단계: 경로 순서로 정렬 (방향성 신뢰도도 고려)
      filteredAreas.sort((a, b) => {
        const positionDiff = a.routePosition - b.routePosition;
        if (Math.abs(positionDiff) < 0.01) {
          // 위치가 비슷하면 방향성 신뢰도로 정렬
          return b.directionConfidence - a.directionConfidence;
        }
        return positionDiff;
      });

      // 7단계: 최소 간격 적용하여 중복 제거
      const spacedAreas = this.applyMinimumInterval(filteredAreas, finalOptions.minInterval);

      // 8단계: 다음 휴게소까지의 거리/시간 계산
      const finalAreas = this.calculateNextDistances(spacedAreas);

      // 9단계: 결과 수 제한
      const limitedAreas = finalAreas.slice(0, finalOptions.maxResults);

      console.log(`✅ 매칭 완료: ${limitedAreas.length}개 휴게소 선정`);

      return limitedAreas;

    } catch (error) {
      console.error('휴게소 매칭 오류:', error);
      throw new Error('휴게소 매칭에 실패했습니다.');
    }
  }

  // 경로 근처 휴게소 찾기
  private findNearbyRestAreas(
    routeCoordinates: Coordinates[],
    restAreas: RestArea[],
    maxDistance: number
  ): RestArea[] {
    return restAreas.filter(restArea => {
      // 경로상 모든 좌표와의 최소 거리 계산
      const minDistance = Math.min(
        ...routeCoordinates.map(coord => 
          this.calculateHaversineDistance(restArea.coordinates, coord)
        )
      );

      return minDistance <= maxDistance;
    });
  }

  // 휴게소의 경로상 위치 및 거리 계산
  private calculateRoutePosition(
    restArea: RestArea, 
    routeCoordinates: Coordinates[]
  ): {
    distanceFromStart: number;
    estimatedTime: number;
    routePosition: number;
  } {
    let minDistance = Infinity;
    let closestIndex = 0;
    let cumulativeDistance = 0;

    // 경로상 가장 가까운 점 찾기
    routeCoordinates.forEach((coord, index) => {
      const distance = this.calculateHaversineDistance(restArea.coordinates, coord);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // 시작점부터 가장 가까운 점까지의 거리 계산
    for (let i = 0; i < closestIndex; i++) {
      if (i < routeCoordinates.length - 1) {
        cumulativeDistance += this.calculateHaversineDistance(
          routeCoordinates[i],
          routeCoordinates[i + 1]
        );
      }
    }

    // 경로상 위치 비율 계산 (0~1)
    const totalRouteDistance = this.calculateTotalRouteDistance(routeCoordinates);
    const routePosition = totalRouteDistance > 0 ? cumulativeDistance / totalRouteDistance : 0;

    // 예상 소요시간 계산 (평균 80km/h 기준)
    const estimatedTime = Math.round((cumulativeDistance / 80) * 60);

    return {
      distanceFromStart: Math.round(cumulativeDistance * 10) / 10,
      estimatedTime,
      routePosition: Math.round(routePosition * 1000) / 1000
    };
  }

  // 전체 경로 거리 계산
  private calculateTotalRouteDistance(coordinates: Coordinates[]): number {
    let totalDistance = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += this.calculateHaversineDistance(coordinates[i], coordinates[i + 1]);
    }
    
    return totalDistance;
  }

  // 고속도로 상태 판별 (범용적 알고리즘)
  private determineHighwayStatus(restArea: RestArea): boolean {
    // 1단계: 명시적 휴게소 표시
    if (restArea.name && restArea.name.includes('휴게소')) {
      return true;
    }

    // 2단계: 서비스 타입 확인
    if (restArea.serviceType === '휴게소') {
      return true;
    }

    // 3단계: 고속도로 운영주체 확인 (새로 추가된 필드)
    const extendedRestArea = restArea as any;
    if (extendedRestArea.highway_operator) {
      const operator = extendedRestArea.highway_operator.toLowerCase();
      if (operator.includes('한국도로공사') || operator.includes('민자')) {
        return true;
      }
    }

    // 4단계: 데이터 출처 확인 (새로 추가된 필드)
    if (extendedRestArea.data_sources) {
      const sources = Array.isArray(extendedRestArea.data_sources) 
        ? extendedRestArea.data_sources 
        : [];
      
      if (sources.includes('highway_api') || sources.includes('manual_data') || sources.includes('kakao_api')) {
        return true;
      }
    }

    // 5단계: 노선명 기반 판별 (확장된 목록)
    if (restArea.routeName) {
      const routeName = restArea.routeName.toLowerCase();
      const highwayKeywords = [
        '고속도로', '고속국도', 'expressway',
        '경부고속도로', '중앙고속도로', '영동고속도로', 
        '대구부산고속도로', '천안논산고속도로', '서울양양고속도로',
        '인천대교', '제2경인고속도로'
      ];
      
      if (highwayKeywords.some(keyword => routeName.includes(keyword))) {
        return true;
      }
    }

    // 6단계: 노선코드 기반 판별 (한국도로공사 + 민자고속도로)
    if (restArea.routeCode) {
      const routeNum = parseInt(restArea.routeCode);
      
      // 한국도로공사 고속도로 코드
      const kecCodes = [1, 10, 12, 15, 25, 30, 35, 45, 50, 55, 60, 65, 70, 100, 200, 300, 400, 500, 550];
      
      // 민자고속도로 코드 (추정)
      const privateCodes = [120, 130, 160, 170, 180, 190, 900, 950, 9999];
      
      if (kecCodes.includes(routeNum) || privateCodes.includes(routeNum)) {
        return true;
      }
    }

    // 7단계: 주소 기반 판별
    if (restArea.address) {
      const address = restArea.address.toLowerCase();
      if (address.includes('고속도로') || address.includes('휴게소')) {
        return true;
      }
    }

    // 8단계: 시설 기반 판별 (고속도로 휴게소 특유의 시설)
    if (restArea.facilities && Array.isArray(restArea.facilities)) {
      const highwayFacilities = ['주유소', '충전소', '정비소', '숙박시설', '쇼핑몰'];
      const facilityScore = restArea.facilities.filter(facility => 
        highwayFacilities.some(hf => facility.includes(hf))
      ).length;
      
      if (facilityScore >= 2) { // 2개 이상의 고속도로 특유 시설이 있으면
        return true;
      }
    }

    // 9단계: 신뢰도 기반 판별 (새로 추가된 필드)
    if (extendedRestArea.confidence_score && extendedRestArea.confidence_score >= 0.7) {
      return true;
    }

    return false;
  }

  // 매칭 신뢰도 계산
  private calculateMatchConfidence(
    matchResult: { distanceFromStart: number; routePosition: number },
    routeCoordinates: Coordinates[]
  ): number {
    // 기본 신뢰도 0.5에서 시작
    let confidence = 0.5;

    // 경로상 위치가 중간 부분일 때 신뢰도 증가
    if (matchResult.routePosition > 0.1 && matchResult.routePosition < 0.9) {
      confidence += 0.2;
    }

    // 경로 밀도가 높은 구간일수록 신뢰도 증가
    if (routeCoordinates.length > 100) {
      confidence += 0.1;
    }

    // 거리가 적절할 때 신뢰도 증가 (50~300km 구간)
    if (matchResult.distanceFromStart > 50 && matchResult.distanceFromStart < 300) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  // 최소 간격 적용하여 중복 제거
  private applyMinimumInterval(
    restAreas: MatchedRestArea[],
    minInterval: number
  ): MatchedRestArea[] {
    if (restAreas.length === 0) return [];

    const result: MatchedRestArea[] = [restAreas[0]];
    
    for (let i = 1; i < restAreas.length; i++) {
      const lastAdded = result[result.length - 1];
      const current = restAreas[i];
      
      const distance = current.distanceFromStart - lastAdded.distanceFromStart;
      
      if (distance >= minInterval) {
        result.push(current);
      } else {
        // 신뢰도가 더 높은 휴게소를 선택
        if (current.matchConfidence > lastAdded.matchConfidence) {
          result[result.length - 1] = current;
        }
      }
    }

    return result;
  }

  // 다음 휴게소까지의 거리/시간 계산
  private calculateNextDistances(restAreas: MatchedRestArea[]): MatchedRestArea[] {
    return restAreas.map((restArea, index) => {
      if (index < restAreas.length - 1) {
        const nextRestArea = restAreas[index + 1];
        const distanceToNext = nextRestArea.distanceFromStart - restArea.distanceFromStart;
        const timeToNext = nextRestArea.estimatedTime - restArea.estimatedTime;

        return {
          ...restArea,
          distanceToNext: Math.round(distanceToNext * 10) / 10,
          timeToNext: Math.max(timeToNext, 1) // 최소 1분
        };
      }
      
      return restArea;
    });
  }

  // Haversine 거리 계산 (km)
  private calculateHaversineDistance(point1: Coordinates, point2: Coordinates): number {
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

  // 경로상 특정 구간의 휴게소만 추출
  filterByRouteSection(
    matchedAreas: MatchedRestArea[],
    startPosition: number,
    endPosition: number
  ): MatchedRestArea[] {
    return matchedAreas.filter(area => 
      area.routePosition >= startPosition && area.routePosition <= endPosition
    );
  }

  // 휴게소간 평균 간격 계산
  calculateAverageInterval(matchedAreas: MatchedRestArea[]): number {
    if (matchedAreas.length < 2) return 0;

    const intervals = matchedAreas.slice(1).map((area, index) => 
      area.distanceFromStart - matchedAreas[index].distanceFromStart
    );

    const total = intervals.reduce((sum, interval) => sum + interval, 0);
    return Math.round((total / intervals.length) * 10) / 10;
  }
}

export const restAreaMatcher = new RestAreaMatcher();

// 매칭된 휴게소 타입 export
export type { MatchedRestArea, MatchingOptions };