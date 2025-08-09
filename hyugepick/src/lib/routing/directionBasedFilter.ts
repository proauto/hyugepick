/**
 * 방향성 기반 휴게소 필터링 알고리즘
 * 경로 방향에 따라 접근 가능한 휴게소만 필터링
 */

import { Coordinates, RestArea } from '@/types/map';

// 경로 세그먼트 (도로 구간)
export interface RouteSegment {
  id: string;
  startPoint: Coordinates;
  endPoint: Coordinates;
  highway: string;
  direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  bearing: number; // 0-360도
  length: number; // km
}

// 휴게소 방향 정보
export interface RestAreaDirection {
  restArea: RestArea;
  accessibleDirection: string;
  routeSegment: RouteSegment;
  confidence: number; // 0-1, 방향성 판단 신뢰도
  reasons: string[];
}

// 방향성 필터링 옵션
export interface DirectionFilterOptions {
  strictMode: boolean; // 엄격 모드 (확실한 것만)
  includeAmbiguous: boolean; // 애매한 경우 포함 여부
  confidenceThreshold: number; // 최소 신뢰도
}

export class DirectionBasedRestAreaFilter {
  
  // 메인 필터링 함수
  async filterRestAreasByDirection(
    routeCoordinates: Coordinates[],
    restAreas: RestArea[],
    options: DirectionFilterOptions = {
      strictMode: false,
      includeAmbiguous: true,
      confidenceThreshold: 0.6
    }
  ): Promise<RestAreaDirection[]> {
    
    console.log('🧭 방향성 필터링 시작...');
    
    try {
      // 1단계: 경로를 세그먼트로 나누기
      const routeSegments = this.divideRouteIntoSegments(routeCoordinates);
      
      // 2단계: 각 휴게소의 방향성 분석
      const restAreaDirections: RestAreaDirection[] = [];
      
      for (const restArea of restAreas) {
        const directionAnalysis = await this.analyzeRestAreaDirection(
          restArea,
          routeSegments,
          routeCoordinates
        );
        
        if (directionAnalysis && directionAnalysis.confidence >= options.confidenceThreshold) {
          restAreaDirections.push(directionAnalysis);
        }
      }
      
      // 3단계: 필터링 적용
      let filteredRestAreas = restAreaDirections;
      
      if (options.strictMode) {
        filteredRestAreas = filteredRestAreas.filter(ra => ra.confidence >= 0.8);
      }
      
      if (!options.includeAmbiguous) {
        filteredRestAreas = filteredRestAreas.filter(ra => ra.confidence >= 0.8);
      }
      
      // 4단계: 신뢰도순 정렬
      filteredRestAreas.sort((a, b) => b.confidence - a.confidence);
      
      console.log(`🧭 방향성 필터링 완료: ${filteredRestAreas.length}/${restAreas.length}개 접근 가능`);
      
      return filteredRestAreas;
      
    } catch (error) {
      console.error('❌ 방향성 필터링 오류:', error);
      throw new Error('방향성 필터링에 실패했습니다.');
    }
  }
  
  // 경로를 세그먼트로 나누기
  private divideRouteIntoSegments(coordinates: Coordinates[]): RouteSegment[] {
    const segments: RouteSegment[] = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];
      
      const bearing = this.calculateBearing(start, end);
      const direction = this.bearingToDirection(bearing);
      const distance = this.calculateDistance(start, end);
      
      // 너무 짧은 세그먼트는 스킵 (100m 미만)
      if (distance < 0.1) continue;
      
      segments.push({
        id: `segment_${i}`,
        startPoint: start,
        endPoint: end,
        highway: this.guessHighwayFromCoordinates(start, end),
        direction,
        bearing,
        length: distance
      });
    }
    
    return segments;
  }
  
  // 휴게소 방향성 분석
  private async analyzeRestAreaDirection(
    restArea: RestArea,
    routeSegments: RouteSegment[],
    routeCoordinates: Coordinates[]
  ): Promise<RestAreaDirection | null> {
    
    // 휴게소에 가장 가까운 경로 세그먼트 찾기
    const nearestSegment = this.findNearestSegment(restArea.coordinates, routeSegments);
    
    if (!nearestSegment) {
      return null;
    }
    
    const reasons: string[] = [];
    let confidence = 0.5;
    
    // 1차: 휴게소 direction 필드로 판단 (한국식 패턴)
    const directionFromField = this.analyzeDirectionField(restArea.direction, nearestSegment);
    if (directionFromField.isOpposite) {
      // 방향 필드에서 반대방향으로 확인되면 신뢰도를 매우 낮춤
      confidence = 0.05;
      reasons.push(`방향 필드 반대방향: ${restArea.direction}`);
    } else if (directionFromField.match) {
      confidence += 0.3;
      reasons.push(`방향 필드 매칭: ${restArea.direction} → ${nearestSegment.direction}`);
    }
    
    // 2차: 휴게소명으로 방향 추정 (한국식 패턴)
    const directionFromName = this.analyzeDirectionFromName(restArea.name, nearestSegment);
    if (directionFromName.isOpposite) {
      // 반대 방향으로 확실하게 판단되면 신뢰도를 크게 낮춤
      confidence = 0.1;
      reasons.push(`반대방향 확인: ${directionFromName.extractedDirection} 방향`);
    } else if (directionFromName.match) {
      confidence += 0.4; // 한국식 명명 규칙이 매우 정확하므로 높은 가중치
      reasons.push(`명칭 기반 추정: ${directionFromName.extractedDirection} 방향`);
    }
    
    // 3차: 고속도로 정보로 방향 판단
    const directionFromHighway = this.analyzeHighwayDirection(restArea.routeName, nearestSegment);
    if (directionFromHighway.match) {
      confidence += 0.2;
      reasons.push(`고속도로 방향 분석: ${restArea.routeName}`);
    }
    
    // 4차: 지리적 위치로 방향 추정
    const directionFromLocation = this.analyzeLocationDirection(restArea.coordinates, nearestSegment);
    if (directionFromLocation.match) {
      confidence += 0.1;
      reasons.push(`지리적 위치 기반: ${directionFromLocation.reason}`);
    }
    
    // 5차: 주변 휴게소 패턴 분석
    const directionFromPattern = await this.analyzePatternDirection(restArea, routeSegments);
    if (directionFromPattern.match) {
      confidence += 0.1;
      reasons.push(`패턴 분석: ${directionFromPattern.reason}`);
    }
    
    // 신뢰도 조정
    confidence = Math.min(confidence, 1.0);
    
    return {
      restArea,
      accessibleDirection: this.determineAccessibleDirection(restArea, nearestSegment),
      routeSegment: nearestSegment,
      confidence,
      reasons
    };
  }
  
  // 방향 필드 분석 (한국식 패턴 개선)
  private analyzeDirectionField(
    restAreaDirection: string | undefined, 
    segment: RouteSegment
  ): { match: boolean; confidence: number; isOpposite: boolean } {
    
    if (!restAreaDirection) {
      return { match: false, confidence: 0, isOpposite: false };
    }
    
    const direction = restAreaDirection.toLowerCase();
    const segmentDir = segment.direction;
    
    // 서울→부산 경로에서 반대방향 키워드 검출
    const oppositeKeywords = ['서울방향', '서울', '인천방향', '인천', '상행'];
    const correctKeywords = ['부산방향', '부산', '대구방향', '대구', '하행'];
    
    // 반대 방향 검사
    if (oppositeKeywords.some(keyword => direction.includes(keyword))) {
      return { match: false, confidence: 0.1, isOpposite: true };
    }
    
    // 올바른 방향 검사
    if (correctKeywords.some(keyword => direction.includes(keyword))) {
      return { match: true, confidence: 0.9, isOpposite: false };
    }
    
    // 직접 매칭 (서울방향, 부산방향 등)
    const cityDirections = this.extractCityDirections(direction);
    if (cityDirections.length > 0) {
      const matchesRoute = this.checkCityDirectionMatch(cityDirections, segment);
      if (matchesRoute) {
        return { match: true, confidence: 0.9, isOpposite: false };
      }
    }
    
    // 방위 매칭 (남쪽, 북쪽 등)
    const compassMatch = this.checkCompassDirection(direction, segmentDir);
    if (compassMatch) {
      return { match: true, confidence: 0.7, isOpposite: false };
    }
    
    return { match: false, confidence: 0, isOpposite: false };
  }
  
  // 휴게소명에서 방향 추정 (한국식 패턴)
  private analyzeDirectionFromName(
    restAreaName: string, 
    segment: RouteSegment
  ): { match: boolean; extractedDirection: string; isOpposite: boolean } {
    
    const name = restAreaName.toLowerCase();
    
    // 한국 고속도로 휴게소 명명 규칙:
    // - "휴게소명(목적지방향)" 형태
    // - 서울→부산 이동시: "(부산)" 포함 = 같은 방향, "(서울)" 포함 = 반대 방향
    
    // 1차: 괄호 안 방향 지시어 추출
    const directionMatch = name.match(/\(([^)]+)\)/);
    if (directionMatch) {
      const directionIndicator = directionMatch[1];
      
      // 주요 도시별 방향성 매핑
      const cityDirectionMap = {
        // 남향 (서울→부산 방향)
        '부산': { direction: 'south', isCorrect: true },
        '대구': { direction: 'south', isCorrect: true },
        '울산': { direction: 'south', isCorrect: true },
        '마산': { direction: 'south', isCorrect: true },
        '창원': { direction: 'south', isCorrect: true },
        '진주': { direction: 'south', isCorrect: true },
        
        // 북향 (부산→서울 방향) - 서울→부산 경로에서는 반대방향
        '서울': { direction: 'north', isCorrect: false },
        '인천': { direction: 'north', isCorrect: false },
        '대전': { direction: 'north', isCorrect: false },
        '천안': { direction: 'north', isCorrect: false },
        '수원': { direction: 'north', isCorrect: false },
        
        // 동향
        '강릉': { direction: 'east', isCorrect: true },
        '동해': { direction: 'east', isCorrect: true },
        '속초': { direction: 'east', isCorrect: true },
        '원주': { direction: 'east', isCorrect: true },
        
        // 서향
        '목포': { direction: 'west', isCorrect: true },
        '광주': { direction: 'west', isCorrect: true },
        '여수': { direction: 'west', isCorrect: true }
      };
      
      for (const [city, info] of Object.entries(cityDirectionMap)) {
        if (directionIndicator.includes(city)) {
          // 경로 방향과 도시 방향이 일치하는지 확인
          const routeDirection = segment.direction;
          const cityDirection = info.direction;
          
          const isCompatible = this.checkDirectionCompatibility(cityDirection as any, routeDirection);
          
          return { 
            match: isCompatible && info.isCorrect, 
            extractedDirection: city,
            isOpposite: !info.isCorrect // 서울→부산 경로에서 (서울) 표시는 반대방향
          };
        }
      }
    }
    
    // 2차: 휴게소명 자체에서 방향성 추출 (괄호 없는 경우)
    const nameOnlyDirections = {
      // 지역명이 휴게소명에 포함된 경우
      '부산': { direction: 'south', isCorrect: true },
      '서울': { direction: 'north', isCorrect: false },
      '대구': { direction: 'south', isCorrect: true },
      '대전': { direction: 'south', isCorrect: true }, // 서울→부산 경로상 중간 지점
      '광주': { direction: 'west', isCorrect: true }
    };
    
    for (const [city, info] of Object.entries(nameOnlyDirections)) {
      if (name.includes(city)) {
        const isCompatible = this.checkDirectionCompatibility(info.direction as any, segment.direction);
        return { 
          match: isCompatible && info.isCorrect, 
          extractedDirection: city,
          isOpposite: !info.isCorrect
        };
      }
    }
    
    return { match: false, extractedDirection: '', isOpposite: false };
  }
  
  // 고속도로 방향 분석
  private analyzeHighwayDirection(
    routeName: string | undefined, 
    segment: RouteSegment
  ): { match: boolean; reason: string } {
    
    if (!routeName) {
      return { match: false, reason: '노선명 없음' };
    }
    
    const highway = routeName.toLowerCase();
    
    // 주요 고속도로별 방향성 패턴
    const highwayPatterns = {
      '경부고속도로': {
        north: ['서울', '대전', '천안'],
        south: ['부산', '대구', '경주']
      },
      '영동고속도로': {
        west: ['서울', '인천'],
        east: ['강릉', '원주']
      },
      '중앙고속도로': {
        north: ['춘천', '원주'],
        south: ['부산', '진주']
      }
    };
    
    for (const [hwName, directions] of Object.entries(highwayPatterns)) {
      if (highway.includes(hwName.replace('고속도로', ''))) {
        // 세그먼트 방향과 고속도로 패턴 매칭
        const segmentDir = segment.direction;
        
        if (directions.north && ['north', 'northeast', 'northwest'].includes(segmentDir)) {
          return { match: true, reason: `${hwName} 북향 패턴` };
        }
        if (directions.south && ['south', 'southeast', 'southwest'].includes(segmentDir)) {
          return { match: true, reason: `${hwName} 남향 패턴` };
        }
        if (directions.east && ['east', 'northeast', 'southeast'].includes(segmentDir)) {
          return { match: true, reason: `${hwName} 동향 패턴` };
        }
        if (directions.west && ['west', 'northwest', 'southwest'].includes(segmentDir)) {
          return { match: true, reason: `${hwName} 서향 패턴` };
        }
      }
    }
    
    return { match: false, reason: '고속도로 패턴 불일치' };
  }
  
  // 지리적 위치 기반 방향 분석
  private analyzeLocationDirection(
    restAreaCoords: Coordinates, 
    segment: RouteSegment
  ): { match: boolean; reason: string } {
    
    // 휴게소가 경로 세그먼트의 어느 쪽에 위치하는지 분석
    const segmentMidpoint = {
      lat: (segment.startPoint.lat + segment.endPoint.lat) / 2,
      lng: (segment.startPoint.lng + segment.endPoint.lng) / 2
    };
    
    // 세그먼트 방향과 휴게소 위치의 상대적 관계
    const relativeBearing = this.calculateBearing(segmentMidpoint, restAreaCoords);
    const segmentBearing = segment.bearing;
    
    // 각도 차이 계산
    let angleDiff = Math.abs(relativeBearing - segmentBearing);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    
    // 각도 차이가 작으면 같은 방향, 크면 반대 방향
    if (angleDiff < 45) {
      return { match: true, reason: `세그먼트와 동일 방향 (${angleDiff.toFixed(1)}° 차이)` };
    } else if (angleDiff > 135) {
      return { match: false, reason: `세그먼트와 반대 방향 (${angleDiff.toFixed(1)}° 차이)` };
    } else {
      return { match: true, reason: `측면 위치 (${angleDiff.toFixed(1)}° 차이)` };
    }
  }
  
  // 주변 패턴 분석 (다른 휴게소들과의 관계)
  private async analyzePatternDirection(
    restArea: RestArea, 
    segments: RouteSegment[]
  ): Promise<{ match: boolean; reason: string }> {
    
    // 실제 구현에서는 주변 휴게소들의 패턴을 분석
    // 현재는 시뮬레이션
    await this.delay(50);
    
    return { match: true, reason: '패턴 분석 시뮬레이션' };
  }
  
  // 접근 가능 방향 결정
  private determineAccessibleDirection(
    restArea: RestArea,
    segment: RouteSegment
  ): string {
    
    // 휴게소의 방향 필드가 있으면 사용
    if (restArea.direction) {
      return restArea.direction;
    }
    
    // 세그먼트 방향 기반으로 추정
    const directionMap: { [key: string]: string } = {
      'north': '북행',
      'south': '남행', 
      'east': '동행',
      'west': '서행',
      'northeast': '북동행',
      'northwest': '북서행',
      'southeast': '남동행',
      'southwest': '남서행'
    };
    
    return directionMap[segment.direction] || segment.direction;
  }
  
  // 유틸리티 함수들
  private findNearestSegment(point: Coordinates, segments: RouteSegment[]): RouteSegment | null {
    let minDistance = Infinity;
    let nearestSegment: RouteSegment | null = null;
    
    for (const segment of segments) {
      const distToStart = this.calculateDistance(point, segment.startPoint);
      const distToEnd = this.calculateDistance(point, segment.endPoint);
      const minDist = Math.min(distToStart, distToEnd);
      
      if (minDist < minDistance) {
        minDistance = minDist;
        nearestSegment = segment;
      }
    }
    
    return nearestSegment;
  }
  
  private calculateBearing(start: Coordinates, end: Coordinates): number {
    const dLng = (end.lng - start.lng) * Math.PI / 180;
    const lat1 = start.lat * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }
  
  private bearingToDirection(bearing: number): 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest' {
    const directions = [
      'north', 'northeast', 'east', 'southeast',
      'south', 'southwest', 'west', 'northwest'
    ];
    
    const index = Math.round(bearing / 45) % 8;
    return directions[index] as any;
  }
  
  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  private guessHighwayFromCoordinates(start: Coordinates, end: Coordinates): string {
    // 좌표를 기반으로 고속도로 추정 (시뮬레이션)
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;
    
    // 간단한 지역 기반 추정
    if (midLng < 127) return '서해안고속도로';
    if (midLng > 129) return '동해고속도로';
    if (midLat > 37.5) return '경춘고속도로';
    if (midLat < 35) return '남해고속도로';
    
    return '경부고속도로';
  }
  
  private extractCityDirections(direction: string): string[] {
    const cities = ['서울', '부산', '대구', '대전', '인천', '광주', '울산', '춘천', '강릉'];
    return cities.filter(city => direction.includes(city));
  }
  
  private checkCityDirectionMatch(cities: string[], segment: RouteSegment): boolean {
    // 도시명과 세그먼트 방향의 일치성 검사 (시뮬레이션)
    return cities.length > 0;
  }
  
  private checkCompassDirection(direction: string, segmentDirection: string): boolean {
    const compassMap: { [key: string]: string[] } = {
      'north': ['북', '북쪽', '북향', '상행'],
      'south': ['남', '남쪽', '남향', '하행'],
      'east': ['동', '동쪽', '동향'],
      'west': ['서', '서쪽', '서향']
    };
    
    for (const [compass, keywords] of Object.entries(compassMap)) {
      if (keywords.some(keyword => direction.includes(keyword))) {
        return segmentDirection.includes(compass);
      }
    }
    
    return false;
  }
  
  private checkDirectionCompatibility(direction1: string, direction2: string): boolean {
    const compatible = {
      'north': ['north', 'northeast', 'northwest'],
      'south': ['south', 'southeast', 'southwest'],
      'east': ['east', 'northeast', 'southeast'],
      'west': ['west', 'northwest', 'southwest']
    };
    
    return compatible[direction1 as keyof typeof compatible]?.includes(direction2) || false;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 공개 유틸리티 메서드들
  public getFilteringSummary(results: RestAreaDirection[]): {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    byDirection: { [direction: string]: number };
  } {
    const summary = {
      total: results.length,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      byDirection: {} as { [direction: string]: number }
    };
    
    results.forEach(result => {
      // 신뢰도별 분류
      if (result.confidence >= 0.8) summary.highConfidence++;
      else if (result.confidence >= 0.6) summary.mediumConfidence++;
      else summary.lowConfidence++;
      
      // 방향별 분류
      const dir = result.accessibleDirection;
      summary.byDirection[dir] = (summary.byDirection[dir] || 0) + 1;
    });
    
    return summary;
  }
}

export const directionBasedFilter = new DirectionBasedRestAreaFilter();