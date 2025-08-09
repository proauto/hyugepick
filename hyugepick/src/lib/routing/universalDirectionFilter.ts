/**
 * 범용 방향성 기반 휴게소 필터링 알고리즘
 * 전국 모든 경로에 대응하는 범용적 방향 판단
 */

import { Coordinates, RestArea } from '@/types/map';

// 경로 벡터 분석 결과
export interface RouteVector {
  startPoint: Coordinates;
  endPoint: Coordinates;
  bearing: number; // 0-360도
  length: number; // km
}

// 휴게소 방향성 분석 결과
export interface RestAreaDirectionAnalysis {
  restArea: RestArea;
  isAccessible: boolean;
  confidence: number; // 0-1
  analysis: {
    routeVector: RouteVector;
    restAreaPosition: 'left' | 'right' | 'center';
    directionFromName: string | null;
    bearingDifference: number;
    reasons: string[];
  };
}

// 방향성 필터링 옵션
export interface UniversalDirectionOptions {
  confidenceThreshold: number; // 최소 신뢰도 (기본: 0.6)
  maxDistanceFromRoute: number; // 경로로부터 최대 거리 (km, 기본: 5)
  strictMode: boolean; // 엄격 모드 (기본: false)
}

export class UniversalDirectionFilter {
  
  // 메인 필터링 함수
  async filterRestAreasByDirection(
    routeCoordinates: Coordinates[],
    restAreas: RestArea[],
    options: Partial<UniversalDirectionOptions> = {}
  ): Promise<RestAreaDirectionAnalysis[]> {
    
    const finalOptions: UniversalDirectionOptions = {
      confidenceThreshold: 0.6,
      maxDistanceFromRoute: 5,
      strictMode: false,
      ...options
    };
    
    console.log('🧭 범용 방향성 필터링 시작...');
    
    try {
      // 1. 전체 경로의 주요 방향 벡터 계산
      const routeVector = this.calculateRouteVector(routeCoordinates);
      
      // 2. 각 휴게소의 접근 가능성 분석
      const analyses: RestAreaDirectionAnalysis[] = [];
      
      for (const restArea of restAreas) {
        const analysis = await this.analyzeRestAreaAccessibility(
          restArea,
          routeVector,
          routeCoordinates,
          finalOptions
        );
        
        if (analysis.confidence >= finalOptions.confidenceThreshold) {
          analyses.push(analysis);
        }
      }
      
      // 3. 신뢰도순 정렬
      analyses.sort((a, b) => b.confidence - a.confidence);
      
      const accessibleCount = analyses.filter(a => a.isAccessible).length;
      console.log(`🧭 방향성 필터링 완료: ${accessibleCount}/${analyses.length}개 접근 가능`);
      
      return finalOptions.strictMode 
        ? analyses.filter(a => a.isAccessible && a.confidence >= 0.8)
        : analyses.filter(a => a.isAccessible);
        
    } catch (error) {
      console.error('❌ 범용 방향성 필터링 오류:', error);
      throw new Error('방향성 필터링에 실패했습니다.');
    }
  }
  
  // 전체 경로의 주요 방향 벡터 계산
  private calculateRouteVector(coordinates: Coordinates[]): RouteVector {
    if (coordinates.length < 2) {
      throw new Error('경로에 최소 2개의 좌표가 필요합니다.');
    }
    
    const startPoint = coordinates[0];
    const endPoint = coordinates[coordinates.length - 1];
    
    // 전체 경로의 직선 베어링 계산
    const bearing = this.calculateBearing(startPoint, endPoint);
    const length = this.calculateDistance(startPoint, endPoint);
    
    return {
      startPoint,
      endPoint,
      bearing,
      length
    };
  }
  
  // 개별 휴게소의 접근 가능성 분석
  private async analyzeRestAreaAccessibility(
    restArea: RestArea,
    routeVector: RouteVector,
    routeCoordinates: Coordinates[],
    options: UniversalDirectionOptions
  ): Promise<RestAreaDirectionAnalysis> {
    
    // 1. 휴게소의 경로상 위치 찾기
    const nearestRoutePoint = this.findNearestPointOnRoute(
      restArea.coordinates,
      routeCoordinates
    );
    
    // 2. 경로로부터의 거리 확인
    const distanceFromRoute = this.calculateDistance(
      restArea.coordinates,
      nearestRoutePoint
    );
    
    if (distanceFromRoute > options.maxDistanceFromRoute) {
      return {
        restArea,
        isAccessible: false,
        confidence: 0.1,
        analysis: {
          routeVector,
          restAreaPosition: 'center',
          directionFromName: null,
          bearingDifference: 0,
          reasons: [`경로로부터 너무 멀음 (${distanceFromRoute.toFixed(1)}km)`]
        }
      };
    }
    
    // 3. 휴게소명에서 방향성 추출
    const directionFromName = this.extractDirectionFromName(restArea.name);
    
    // 4. 경로 벡터와의 일치성 분석
    const vectorAnalysis = this.analyzeVectorCompatibility(
      restArea,
      routeVector,
      nearestRoutePoint,
      directionFromName
    );
    
    // 5. 신뢰도 계산 및 접근 가능성 판단
    const confidence = this.calculateConfidence(vectorAnalysis, distanceFromRoute);
    const isAccessible = confidence >= options.confidenceThreshold && vectorAnalysis.isCompatible;
    
    return {
      restArea,
      isAccessible,
      confidence,
      analysis: {
        routeVector,
        restAreaPosition: vectorAnalysis.position,
        directionFromName: directionFromName?.destination || null,
        bearingDifference: vectorAnalysis.bearingDifference,
        reasons: vectorAnalysis.reasons
      }
    };
  }
  
  // 휴게소명에서 방향 정보 추출
  private extractDirectionFromName(restAreaName: string): { 
    destination: string; 
    isConsistent: boolean; 
    confidence: number 
  } | null {
    
    // 괄호 안의 목적지 추출
    const match = restAreaName.match(/\(([^)]+)\)/);
    if (!match) return null;
    
    const destination = match[1].trim();
    
    // 한국의 주요 도시들과 그들의 대략적 방향
    const majorCities = {
      // 수도권
      '서울': { bearing: 0, region: 'capital' },
      '인천': { bearing: 270, region: 'capital' },
      '수원': { bearing: 180, region: 'capital' },
      '성남': { bearing: 135, region: 'capital' },
      '양평': { bearing: 90, region: 'capital' },
      
      // 강원도
      '춘천': { bearing: 45, region: 'gangwon' },
      '강릉': { bearing: 90, region: 'gangwon' },
      '원주': { bearing: 90, region: 'gangwon' },
      '양양': { bearing: 90, region: 'gangwon' },
      
      // 충청도
      '대전': { bearing: 180, region: 'chungcheong' },
      '천안': { bearing: 180, region: 'chungcheong' },
      '청주': { bearing: 180, region: 'chungcheong' },
      '당진': { bearing: 225, region: 'chungcheong' },
      
      // 경상도
      '부산': { bearing: 180, region: 'gyeongsang' },
      '대구': { bearing: 180, region: 'gyeongsang' },
      '울산': { bearing: 180, region: 'gyeongsang' },
      '포항': { bearing: 135, region: 'gyeongsang' },
      '창원': { bearing: 225, region: 'gyeongsang' },
      
      // 전라도
      '광주': { bearing: 225, region: 'jeolla' },
      '전주': { bearing: 225, region: 'jeolla' },
      '목포': { bearing: 270, region: 'jeolla' },
      '순천': { bearing: 225, region: 'jeolla' },
      '여수': { bearing: 225, region: 'jeolla' },
    };
    
    const cityInfo = majorCities[destination as keyof typeof majorCities];
    
    return {
      destination,
      isConsistent: !!cityInfo,
      confidence: cityInfo ? 0.8 : 0.3 // 알려진 도시면 높은 신뢰도
    };
  }
  
  // 경로 벡터와의 호환성 분석
  private analyzeVectorCompatibility(
    restArea: RestArea,
    routeVector: RouteVector,
    nearestRoutePoint: Coordinates,
    directionInfo: ReturnType<typeof this.extractDirectionFromName>
  ): {
    isCompatible: boolean;
    position: 'left' | 'right' | 'center';
    bearingDifference: number;
    reasons: string[];
  } {
    
    const reasons: string[] = [];
    
    // 1. 휴게소 위치의 경로 베어링 계산
    const restAreaBearing = this.calculateBearing(nearestRoutePoint, restArea.coordinates);
    
    // 2. 경로 벡터와의 각도 차이
    let bearingDifference = Math.abs(restAreaBearing - routeVector.bearing);
    if (bearingDifference > 180) {
      bearingDifference = 360 - bearingDifference;
    }
    
    // 3. 휴게소가 경로의 왼쪽/오른쪽에 위치하는지 판단
    let angleDiff = restAreaBearing - routeVector.bearing;
    if (angleDiff < 0) angleDiff += 360;
    if (angleDiff > 360) angleDiff -= 360;
    
    const position: 'left' | 'right' | 'center' = 
      bearingDifference < 15 ? 'center' :
      (angleDiff > 180 ? 'left' : 'right');
    
    reasons.push(`경로 ${position === 'center' ? '중앙' : position === 'left' ? '왼쪽' : '오른쪽'} 위치`);
    
    // 4. 방향명과 벡터의 일치성 검사
    let isCompatible = true;
    let confidence = 0.5;
    
    if (directionInfo && directionInfo.isConsistent) {
      // 목적지명이 경로 방향과 일치하는지 확인
      const destinationCompatibility = this.checkDestinationCompatibility(
        directionInfo.destination,
        routeVector,
        nearestRoutePoint
      );
      
      if (destinationCompatibility.isCompatible) {
        confidence += 0.3;
        reasons.push(`목적지명 일치: ${directionInfo.destination}`);
      } else {
        isCompatible = false;
        confidence = 0.2;
        reasons.push(`목적지명 불일치: ${directionInfo.destination} (반대방향)`);
      }
    }
    
    // 5. 베어링 차이에 따른 호환성
    if (bearingDifference > 90) {
      isCompatible = false;
      reasons.push(`경로와 수직 방향 (${bearingDifference.toFixed(1)}° 차이)`);
    } else if (bearingDifference < 30) {
      confidence += 0.2;
      reasons.push(`경로와 동일 방향 (${bearingDifference.toFixed(1)}° 차이)`);
    }
    
    return {
      isCompatible,
      position,
      bearingDifference,
      reasons
    };
  }
  
  // 목적지명과 경로 방향의 호환성 확인
  private checkDestinationCompatibility(
    destination: string,
    routeVector: RouteVector,
    currentPoint: Coordinates
  ): { isCompatible: boolean; reason: string } {
    
    // 경로의 전반적인 방향을 기반으로 목적지 판단
    const routeBearing = routeVector.bearing;
    const startLat = routeVector.startPoint.lat;
    const endLat = routeVector.endPoint.lat;
    const startLng = routeVector.startPoint.lng;
    const endLng = routeVector.endPoint.lng;
    
    // 주요 목적지별 방향성 정의
    const destinationCompatibilityMap: { [key: string]: (route: RouteVector) => boolean } = {
      // 북쪽 방향 목적지들 (서울→부산 경로에서는 반대방향)
      '서울': (route) => route.endPoint.lat > route.startPoint.lat, // 북향이면 서울방향
      '인천': (route) => route.endPoint.lat > route.startPoint.lat, // 북향이면 인천방향
      '수원': (route) => route.endPoint.lat > route.startPoint.lat,
      '성남': (route) => route.endPoint.lat > route.startPoint.lat,
      '천안': (route) => route.endPoint.lat > route.startPoint.lat,
      '대전': (route) => route.endPoint.lat > route.startPoint.lat,
      
      // 남쪽 방향 목적지들 (서울→부산 경로에서는 같은방향)
      '부산': (route) => route.endPoint.lat < route.startPoint.lat, // 남향이면 부산방향
      '대구': (route) => route.endPoint.lat < route.startPoint.lat,
      '울산': (route) => route.endPoint.lat < route.startPoint.lat,
      '창원': (route) => route.endPoint.lat < route.startPoint.lat,
      '양산': (route) => route.endPoint.lat < route.startPoint.lat,
      '경주': (route) => route.endPoint.lat < route.startPoint.lat,
      
      // 동쪽 방향 목적지들
      '강릉': (route) => route.endPoint.lng > route.startPoint.lng,
      '원주': (route) => route.endPoint.lng > route.startPoint.lng,
      '양양': (route) => route.endPoint.lng > route.startPoint.lng,
      '속초': (route) => route.endPoint.lng > route.startPoint.lng,
      
      // 서쪽 방향 목적지들
      '목포': (route) => route.endPoint.lng < route.startPoint.lng,
      '광주': (route) => route.endPoint.lng < route.startPoint.lng,
      '여수': (route) => route.endPoint.lng < route.startPoint.lng,
      '당진': (route) => route.endPoint.lng < route.startPoint.lng,
    };
    
    const compatibilityCheck = destinationCompatibilityMap[destination];
    
    if (!compatibilityCheck) {
      // 알려지지 않은 목적지는 중립으로 처리
      return {
        isCompatible: true,
        reason: `알려지지 않은 목적지: ${destination}`
      };
    }
    
    const isCompatible = compatibilityCheck(routeVector);
    
    return {
      isCompatible,
      reason: `목적지 방향 ${isCompatible ? '일치' : '불일치'}: ${destination} (${isCompatible ? '같은방향' : '반대방향'})`
    };
  }
  
  // 신뢰도 계산
  private calculateConfidence(
    vectorAnalysis: ReturnType<typeof this.analyzeVectorCompatibility>,
    distanceFromRoute: number
  ): number {
    let confidence = 0.5; // 기본값
    
    // 호환성이 있으면 기본 점수
    if (vectorAnalysis.isCompatible) {
      confidence += 0.3;
    } else {
      confidence = 0.2;
    }
    
    // 경로로부터의 거리에 따른 보정
    if (distanceFromRoute < 1) {
      confidence += 0.2;
    } else if (distanceFromRoute < 3) {
      confidence += 0.1;
    }
    
    // 베어링 차이에 따른 보정
    if (vectorAnalysis.bearingDifference < 15) {
      confidence += 0.2;
    } else if (vectorAnalysis.bearingDifference < 45) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  // 유틸리티 함수들
  private findNearestPointOnRoute(
    point: Coordinates,
    routeCoordinates: Coordinates[]
  ): Coordinates {
    let minDistance = Infinity;
    let nearestPoint = routeCoordinates[0];
    
    for (const routePoint of routeCoordinates) {
      const distance = this.calculateDistance(point, routePoint);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = routePoint;
      }
    }
    
    return nearestPoint;
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
  
  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const universalDirectionFilter = new UniversalDirectionFilter();