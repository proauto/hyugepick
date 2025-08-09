import { Coordinates } from '@/types/map';

// 고속도로 구간 정보
interface HighwaySection {
  name: string;
  routeCode: string;
  startIndex: number;
  endIndex: number;
  coordinates: Coordinates[];
  distance: number;
}

// 경로 분석 결과
interface RouteAnalysisResult {
  totalDistance: number;
  totalDuration: number;
  highwaySections: HighwaySection[];
  coordinates: Coordinates[];
  isHighwayRoute: boolean;
}

// 주요 고속도로 코드 매핑
const HIGHWAY_CODES: Record<string, string> = {
  '1': '경부고속도로',
  '10': '남해고속도로', 
  '100': '서해안고속도로',
  '12': '88올림픽고속도로',
  '15': '중부고속도로',
  '25': '호남고속도로',
  '30': '중앙고속도로',
  '35': '대전남부순환고속도로',
  '45': '중부내륙고속도로',
  '50': '영동고속도로',
  '55': '중앙고속도로(춘천-양평)',
  '60': '경인고속도로',
  '65': '서울외곽순환고속도로',
  '70': '수도권제1순환고속도로'
};

export class RouteAnalyzer {
  
  // 카카오 경로 데이터 분석 및 고속도로 구간 식별
  analyzeRoute(kakaoRouteData: any): RouteAnalysisResult {
    try {
      if (!kakaoRouteData.routes || !kakaoRouteData.routes[0]) {
        throw new Error('유효하지 않은 경로 데이터입니다.');
      }

      const route = kakaoRouteData.routes[0];
      const summary = route.summary;
      const sections = route.sections;

      console.log('경로 분석 시작:', {
        distance: summary.distance,
        duration: summary.duration,
        sectionsCount: sections.length
      });

      // 전체 경로 좌표 추출
      const allCoordinates = this.extractCoordinatesFromSections(sections);
      
      // 고속도로 구간 식별
      const highwaySections = this.identifyHighwaySections(sections, allCoordinates);
      
      // 고속도로 경로 여부 판단 (전체 거리의 30% 이상이 고속도로인 경우)
      const highwayDistance = highwaySections.reduce((sum, section) => sum + section.distance, 0);
      const isHighwayRoute = highwayDistance / summary.distance > 0.3;

      console.log('경로 분석 완료:', {
        totalCoordinates: allCoordinates.length,
        highwaySectionsCount: highwaySections.length,
        highwayDistance: Math.round(highwayDistance / 1000),
        isHighwayRoute
      });

      return {
        totalDistance: summary.distance,
        totalDuration: summary.duration,
        coordinates: allCoordinates,
        highwaySections,
        isHighwayRoute
      };

    } catch (error) {
      console.error('경로 분석 오류:', error);
      throw new Error('경로 데이터 분석에 실패했습니다.');
    }
  }

  // 섹션에서 좌표 추출
  private extractCoordinatesFromSections(sections: any[]): Coordinates[] {
    const coordinates: Coordinates[] = [];
    
    sections.forEach((section, sectionIndex) => {
      if (section.roads && Array.isArray(section.roads)) {
        section.roads.forEach((road: any, roadIndex: number) => {
          if (road.vertexes && Array.isArray(road.vertexes)) {
            // vertexes 배열에서 좌표 쌍 추출 (경도, 위도 순서)
            for (let i = 0; i < road.vertexes.length; i += 2) {
              const lng = road.vertexes[i];
              const lat = road.vertexes[i + 1];
              
              if (typeof lat === 'number' && typeof lng === 'number' && 
                  lat !== 0 && lng !== 0) {
                coordinates.push({ lat, lng });
              }
            }
          }
        });
      }
    });

    console.log(`총 ${coordinates.length}개 좌표 추출 완료`);
    return coordinates;
  }

  // 고속도로 구간 식별
  private identifyHighwaySections(sections: any[], coordinates: Coordinates[]): HighwaySection[] {
    const highwaySections: HighwaySection[] = [];
    let currentIndex = 0;

    sections.forEach((section, sectionIndex) => {
      if (!section.roads) return;

      section.roads.forEach((road: any) => {
        // 고속도로 판별 기준
        if (this.isHighwayRoad(road)) {
          const roadCoordinates = this.extractRoadCoordinates(road);
          const sectionCoordinates = coordinates.slice(currentIndex, currentIndex + roadCoordinates.length);
          
          if (sectionCoordinates.length > 0) {
            const distance = this.calculateSectionDistance(sectionCoordinates);
            const routeCode = this.extractRouteCode(road);
            
            highwaySections.push({
              name: HIGHWAY_CODES[routeCode] || `고속도로 ${routeCode}`,
              routeCode,
              startIndex: currentIndex,
              endIndex: currentIndex + sectionCoordinates.length - 1,
              coordinates: sectionCoordinates,
              distance
            });

            console.log(`고속도로 구간 발견: ${HIGHWAY_CODES[routeCode] || routeCode} (${Math.round(distance/1000)}km)`);
          }
        }
        
        // 해당 도로의 좌표 수만큼 인덱스 증가
        const roadCoordCount = road.vertexes ? Math.floor(road.vertexes.length / 2) : 0;
        currentIndex += roadCoordCount;
      });
    });

    return highwaySections;
  }

  // 고속도로 도로인지 판별
  private isHighwayRoad(road: any): boolean {
    // 1. 도로명에 '고속도로' 포함 여부
    if (road.name && typeof road.name === 'string') {
      if (road.name.includes('고속도로') || road.name.includes('고속국도')) {
        return true;
      }
    }

    // 2. 도로 코드 기준 (국가지원지방도 코드가 1, 10, 100 등으로 시작)
    if (road.road_code) {
      const codeStr = String(road.road_code);
      return Object.keys(HIGHWAY_CODES).includes(codeStr);
    }

    // 3. 속도 제한 기준 (고속도로는 보통 80km/h 이상)
    if (road.speed_limit && road.speed_limit >= 80) {
      return true;
    }

    // 4. 도로 타입 기준
    if (road.road_type === 'highway' || road.road_type === 'trunk') {
      return true;
    }

    return false;
  }

  // 도로 코드 추출
  private extractRouteCode(road: any): string {
    if (road.road_code) {
      return String(road.road_code);
    }
    
    // 도로명에서 번호 추출 시도
    if (road.name && typeof road.name === 'string') {
      const match = road.name.match(/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    return 'unknown';
  }

  // 개별 도로에서 좌표 추출
  private extractRoadCoordinates(road: any): Coordinates[] {
    const coordinates: Coordinates[] = [];
    
    if (road.vertexes && Array.isArray(road.vertexes)) {
      for (let i = 0; i < road.vertexes.length; i += 2) {
        const lng = road.vertexes[i];
        const lat = road.vertexes[i + 1];
        
        if (typeof lat === 'number' && typeof lng === 'number') {
          coordinates.push({ lat, lng });
        }
      }
    }
    
    return coordinates;
  }

  // 구간 거리 계산
  private calculateSectionDistance(coordinates: Coordinates[]): number {
    let totalDistance = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += this.calculateHaversineDistance(
        coordinates[i], 
        coordinates[i + 1]
      );
    }
    
    return totalDistance * 1000; // km를 m로 변환
  }

  // Haversine 거리 계산 (km)
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

  // 고속도로 구간별 좌표 범위 가져오기
  getHighwayCoordinates(analysisResult: RouteAnalysisResult): Coordinates[] {
    const highwayCoords: Coordinates[] = [];
    
    analysisResult.highwaySections.forEach(section => {
      highwayCoords.push(...section.coordinates);
    });
    
    return highwayCoords;
  }

  // 특정 고속도로 구간의 좌표만 추출
  getSpecificHighwayCoordinates(
    analysisResult: RouteAnalysisResult, 
    routeCode: string
  ): Coordinates[] {
    const section = analysisResult.highwaySections.find(s => s.routeCode === routeCode);
    return section ? section.coordinates : [];
  }
}

export const routeAnalyzer = new RouteAnalyzer();