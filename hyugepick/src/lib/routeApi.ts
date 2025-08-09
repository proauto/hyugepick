import { Coordinates, RouteInfo, RestArea, RestAreaDetail } from '@/types/map';
import { highwayAPI } from './highwayApi';

// Kakao Mobility API를 이용한 경로 계산 및 휴게소 정보 통합
export class RouteAPI {
  private restKey: string;

  constructor() {
    this.restKey = process.env.NEXT_PUBLIC_KAKAO_REST_KEY || '';
  }

  // 최적 경로 계산 (자동차)
  async calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteInfo> {
    if (!this.restKey) {
      throw new Error('Kakao REST API Key가 설정되지 않았습니다.');
    }

    try {
      // 카카오 모빌리티 API 직접 호출
      const params = new URLSearchParams({
        origin: `${origin.lng},${origin.lat}`,
        destination: `${destination.lng},${destination.lat}`,
        priority: 'TIME',
        car_fuel: 'GASOLINE',
        car_hipass: 'true',
        alternatives: 'false',
        road_details: 'true'
      });

      const apiUrl = `https://apis-navi.kakaomobility.com/v1/directions?${params.toString()}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `KakaoAK ${this.restKey}`,
          'Content-Type': 'application/json',
          'KA': 'sdk/1.0.0 os/web lang/ko-KR device/pc origin/localhost'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ 카카오 API 실패 (${response.status}), 직선 경로로 폴백`);
        return this.generateStraightLineRoute(origin, destination);
      }

      const data = await response.json();
      console.log('✅ 카카오 API 경로 계산 성공');
      return this.parseRouteResponse(data);
      
    } catch (error) {
      console.warn(`⚠️ 카카오 API 오류, 직선 경로로 폴백:`, error instanceof Error ? error.message : error);
      return this.generateStraightLineRoute(origin, destination);
    }
  }

  // 직선 경로 생성 (폴백)
  private generateStraightLineRoute(origin: Coordinates, destination: Coordinates): RouteInfo {
    const routePath = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = origin.lat + (destination.lat - origin.lat) * ratio;
      const lng = origin.lng + (destination.lng - origin.lng) * ratio;
      routePath.push({ lat, lng });
    }
    
    const distance = this.calculateHaversineDistance(origin, destination) * 1000; // m
    const duration = Math.round(distance / 1000 * 60); // 분
    
    console.log(`🔄 직선 경로 생성: ${(distance/1000).toFixed(1)}km, ${routePath.length}개 지점`);
    
    return {
      distance: Math.round(distance),
      duration: duration * 60, // 초로 변환
      fare: 0,
      path: routePath,
      restAreas: []
    };
  }

  // 응답 데이터 파싱
  private parseRouteResponse(data: any): RouteInfo {
    try {
      const route = data.routes[0];
      const summary = route.summary;
      const sections = route.sections;

      // 경로 좌표 추출
      const path: Coordinates[] = [];
      sections.forEach((section: any) => {
        section.roads.forEach((road: any) => {
          road.vertexes.forEach((vertex: number, index: number) => {
            if (index % 2 === 0) {
              const lng = vertex;
              const lat = road.vertexes[index + 1];
              if (lat && lng) {
                path.push({ lat, lng });
              }
            }
          });
        });
      });

      return {
        distance: summary.distance,
        duration: summary.duration,
        fare: summary.fare.taxi || 0,
        path,
        restAreas: [] // calculateRouteWithRestAreas에서 채워짐
      };
    } catch (error) {
      throw new Error('경로 데이터 파싱 실패');
    }
  }

  // 경로 계산과 휴게소 정보를 함께 조회
  async calculateRouteWithRestAreas(
    origin: Coordinates, 
    destination: Coordinates,
    bufferKm: number = 3
  ): Promise<RouteInfo> {
    try {
      // 1단계: 카카오 최적경로 계산
      const routeInfo = await this.calculateRoute(origin, destination);
      
      console.log(`경로 계산 완료: ${routeInfo.distance}m, ${routeInfo.duration}초`);
      console.log(`경로 좌표 ${routeInfo.path.length}개 포인트 확보`);

      // 2단계: 경로 위 휴게소 정보 조회 (병렬 처리)
      const restAreasWithDetails = await highwayAPI.getRestAreasWithDetailsOnRoute(
        routeInfo.path,
        bufferKm
      );

      // 3단계: 통합된 결과 반환
      const enrichedRouteInfo: RouteInfo = {
        ...routeInfo,
        restAreas: restAreasWithDetails
      };

      console.log(`경로 위 휴게소 ${enrichedRouteInfo.restAreas.length}개 발견`);
      
      return enrichedRouteInfo;
    } catch (error) {
      console.error('경로 및 휴게소 정보 조회 실패:', error);
      throw new Error('경로 및 휴게소 정보 조회에 실패했습니다.');
    }
  }

  // 특정 휴게소의 상세 정보 조회
  async getRestAreaDetailInfo(restAreaCode: string): Promise<RestAreaDetail | null> {
    return await highwayAPI.getRestAreaDetail(restAreaCode);
  }

  // 경로상 휴게소 거리/시간 정보 업데이트
  updateRestAreaDistances(routeInfo: RouteInfo): RouteInfo {
    const updatedRestAreas = routeInfo.restAreas.map((restArea, index) => {
      // 출발지로부터의 대략적인 거리 계산 (경로 좌표 기반)
      const routeDistance = this.calculateRouteDistanceToPoint(
        routeInfo.path[0], 
        restArea.coordinates, 
        routeInfo.path
      );
      
      return {
        ...restArea,
        routeDistance: routeDistance.distance,
        routeDuration: routeDistance.duration,
        routeIndex: index
      };
    });

    return {
      ...routeInfo,
      restAreas: updatedRestAreas
    };
  }

  // 경로상 특정 지점까지의 거리 계산
  private calculateRouteDistanceToPoint(
    origin: Coordinates,
    target: Coordinates,
    routePath: Coordinates[]
  ): { distance: number; duration: number } {
    let minDistance = Infinity;
    let closestIndex = 0;
    let cumulativeDistance = 0;

    // 경로에서 목표 지점과 가장 가까운 좌표 찾기
    routePath.forEach((point, index) => {
      const distance = this.calculateHaversineDistance(target, point);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // 출발지부터 해당 지점까지의 누적 거리 계산
    for (let i = 0; i < closestIndex; i++) {
      if (i < routePath.length - 1) {
        cumulativeDistance += this.calculateHaversineDistance(
          routePath[i], 
          routePath[i + 1]
        );
      }
    }

    // 평균 고속도로 속도 (80km/h) 기준 소요시간 계산
    const duration = Math.round((cumulativeDistance / 80) * 60);

    return {
      distance: Math.round(cumulativeDistance * 10) / 10,
      duration
    };
  }

  // Haversine 공식을 이용한 두 좌표 간 직선 거리 계산 (km)
  private calculateHaversineDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // 지구 반지름 (km)
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
}

export const routeAPI = new RouteAPI();