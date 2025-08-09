import { RestArea, RestFood, Coordinates, RestAreaDetail, RestFacility } from '@/types/map';

// 한국도로공사 휴게소 API 연동
export class HighwayAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_HIGHWAY_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_HIGHWAY_API_URL || 'https://data.ex.co.kr/openapi';
  }

  // 1. 휴게소 기준정보 현황 조회 (위치 및 기본 정보)
  async getRestAreas(): Promise<RestArea[]> {
    if (!this.apiKey) {
      console.warn('Highway API 키가 설정되지 않았습니다.');
      return [];
    }

    try {
      const response = await fetch('/api/highway/rest-areas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsedData = this.parseRestAreasResponse(data);
      
      if (parsedData && parsedData.length > 0) {
        console.log(`휴게소 기준정보 ${parsedData.length}개 조회 성공`);
        return parsedData;
      }
      
      console.log('휴게소 기준정보 조회 결과가 없습니다.');
      return [];
    } catch (error) {
      console.error('휴게소 기준정보 API 오류:', error);
      return [];
    }
  }

  // 2. 휴게소별 매장 월별 판매 상위 5 조회 (매장 정보)
  async getRestAreaFoods(restAreaCode: string): Promise<RestFood[]> {
    if (!this.apiKey || !restAreaCode) {
      return [];
    }

    try {
      const response = await fetch(`/api/highway/rest-areas/foods?restAreaCode=${restAreaCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsedFoods = this.parseFoodsResponse(data);
      console.log(`휴게소 ${restAreaCode} 매장정보 ${parsedFoods.length}개 조회`);
      return parsedFoods;
    } catch (error) {
      console.error(`휴게소 ${restAreaCode} 매장정보 API 오류:`, error);
      return [];
    }
  }

  // 3. 휴게소 편의시설 정보 조회
  async getRestAreaFacilities(restAreaCode: string): Promise<RestFacility[]> {
    if (!this.apiKey || !restAreaCode) {
      return [];
    }

    try {
      const response = await fetch(`/api/highway/rest-areas/facilities?restAreaCode=${restAreaCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsedFacilities = this.parseFacilitiesResponse(data);
      console.log(`휴게소 ${restAreaCode} 편의시설 ${parsedFacilities.length}개 조회`);
      return parsedFacilities;
    } catch (error) {
      console.error(`휴게소 ${restAreaCode} 편의시설 API 오류:`, error);
      return [];
    }
  }

  // 4. 휴게소 상세 정보 통합 조회 (매장 + 편의시설)
  async getRestAreaDetail(restAreaCode: string): Promise<RestAreaDetail | null> {
    try {
      const [foods, facilities] = await Promise.all([
        this.getRestAreaFoods(restAreaCode),
        this.getRestAreaFacilities(restAreaCode)
      ]);

      return {
        restAreaCode,
        foods,
        facilities,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`휴게소 ${restAreaCode} 상세정보 조회 실패:`, error);
      return null;
    }
  }

  // 5. 카카오 경로 위 휴게소 필터링 및 거리/시간 계산  
  async filterRestAreasByRoute(
    restAreas: RestArea[], 
    routePath: Coordinates[], 
    bufferKm: number = 15
  ): Promise<RestArea[]> {
    console.log('🔥 경로 필터링 시작:');
    console.log(`   - 총 휴게소 수: ${restAreas.length}`);
    console.log(`   - 경로 포인트 수: ${routePath.length}`);
    console.log(`   - 버퍼 거리: ${bufferKm}km`);
    console.log(`   - 경로 시작점: ${JSON.stringify(routePath[0])}`);
    console.log(`   - 경로 끝점: ${JSON.stringify(routePath[routePath.length - 1])}`);

    const nearbyRestAreas = restAreas.filter((restArea, index) => {
      const isNear = this.isNearRoute(restArea.coordinates, routePath, bufferKm);
      console.log(`   - ${restArea.name} (${restArea.coordinates.lat}, ${restArea.coordinates.lng}): ${isNear ? '매칭됨' : '매칭안됨'}`);
      return isNear;
    });

    console.log(`🔥 경로 근처 휴게소 수: ${nearbyRestAreas.length}개`);

    // 각 휴게소의 경로상 거리와 소요시간 계산
    const restAreasWithDistance = nearbyRestAreas.map(restArea => {
      const { distance, duration, routeIndex } = this.calculateRouteDistance(
        restArea.coordinates, 
        routePath
      );
      
      console.log(`   - ${restArea.name}: 거리 ${distance}km, 소요시간 ${duration}분, 인덱스 ${routeIndex}`);
      
      return {
        ...restArea,
        routeDistance: distance,
        routeDuration: duration,
        routeIndex
      };
    });

    // 경로 순서대로 정렬
    const sortedRestAreas = restAreasWithDistance.sort((a, b) => (a.routeIndex || 0) - (b.routeIndex || 0));
    console.log(`🔥 최종 휴게소 순서: ${sortedRestAreas.map(r => r.name).join(', ')}`);
    
    return sortedRestAreas;
  }

  // 6. 카카오 경로 roads 정보 기반 휴게소 조회 (정확한 도로 매칭)
  async getRestAreasOnHighwaySegments(
    highwaySegments: any[],
    routePath: Coordinates[]
  ): Promise<RestArea[]> {
    try {
      console.log('🔥 도로 기반 휴게소 검색 시작');
      console.log(`🔥 고속도로 구간: ${highwaySegments.length}개`);
      highwaySegments.forEach(segment => {
        console.log(`   - ${segment.name}: ${segment.distance}m`);
      });
      
      // 1단계: 모든 휴게소 데이터 조회
      const allRestAreas = await this.getRestAreas();
      console.log(`🔥 전체 휴게소 수: ${allRestAreas.length}개`);
      
      // 2단계: 경로의 고속도로 구간과 매칭되는 휴게소만 필터링
      const matchingRestAreas = this.filterRestAreasByHighwaySegments(allRestAreas, highwaySegments);
      
      // 3단계: 방향성 고려하여 올바른 방향 휴게소만 선택
      const directionFilteredRestAreas = this.filterRestAreasByDirection(matchingRestAreas, routePath);
      
      // 4단계: 실제 운전 순서대로 정렬
      const sortedRestAreas = this.sortRestAreasByDrivingOrder(directionFilteredRestAreas, routePath);
      
      console.log(`🔥 최종 선택된 휴게소 ${sortedRestAreas.length}개:`);
      sortedRestAreas.forEach((restArea, index) => {
        console.log(`   ${index + 1}. ${restArea.name} (${restArea.routeCode}) - ${restArea.direction}`);
      });
      
      return sortedRestAreas;
      
    } catch (error) {
      console.error('🔥 도로 기반 휴게소 검색 실패:', error);
      return [];
    }
  }
  
  // 고속도로 구간 정보 기반 휴게소 필터링 (정확한 도로명 매칭)
  private filterRestAreasByHighwaySegments(
    restAreas: RestArea[], 
    highwaySegments: any[]
  ): RestArea[] {
    if (!highwaySegments || highwaySegments.length === 0) return [];
    
    console.log(`🔥 고속도로 구간 기반 필터링 시작: 구간 ${highwaySegments.length}개, 휴게소 ${restAreas.length}개`);
    
    // 경로에 포함된 고속도로 노선 코드들 추출
    const routeCodes = new Set<string>();
    highwaySegments.forEach(segment => {
      const routeCode = this.mapHighwayNameToRouteCode(segment.name);
      if (routeCode) {
        routeCodes.add(routeCode);
        console.log(`🔥 ${segment.name} -> 노선코드 ${routeCode}`);
      }
    });
    
    console.log(`🔥 경로 내 노선 코드들: ${Array.from(routeCodes).join(', ')}`);
    
    // 디버깅: 실제 휴게소들의 노선 코드들 확인
    const actualRouteCodes = new Set<string>();
    restAreas.forEach(ra => {
      if (ra.routeCode) actualRouteCodes.add(ra.routeCode);
    });
    console.log(`🔥 실제 휴게소 데이터의 노선 코드들: ${Array.from(actualRouteCodes).sort().join(', ')}`);
    
    // 특정 노선코드들의 휴게소 수 확인
    Array.from(routeCodes).forEach(code => {
      const count = restAreas.filter(ra => ra.routeCode === code).length;
      console.log(`🔥 노선코드 ${code}의 휴게소 수: ${count}개`);
    });
    
    const filteredRestAreas = restAreas.filter(restArea => {
      const isInRoute = routeCodes.has(restArea.routeCode);
      if (isInRoute) {
        console.log(`🔥 매칭: ${restArea.name} (${restArea.routeCode}) - ${restArea.address}`);
      }
      return isInRoute;
    });
    
    console.log(`🔥 도로명 매칭 후: ${filteredRestAreas.length}개 휴게소 선택`);
    return filteredRestAreas;
  }
  
  // 방향성 고려하여 올바른 방향 휴게소만 필터링
  private filterRestAreasByDirection(
    restAreas: RestArea[], 
    routePath: Coordinates[]
  ): RestArea[] {
    if (!routePath || routePath.length < 2) return restAreas;
    
    console.log(`🔥 방향성 필터링 시작: ${restAreas.length}개 휴게소`);
    
    const startPoint = routePath[0];
    const endPoint = routePath[routePath.length - 1];
    
    // 경로 방향 분석 (위도/경도 차이로 남북/동서 판단)
    const latDiff = endPoint.lat - startPoint.lat;
    const lngDiff = endPoint.lng - startPoint.lng;
    
    let expectedDirection = '';
    
    if (Math.abs(latDiff) > Math.abs(lngDiff)) {
      // 남북 방향이 주된 이동
      if (latDiff < -0.5) {
        expectedDirection = '부산방향'; // 남행 (위도 감소)
      } else if (latDiff > 0.5) {
        expectedDirection = '서울방향'; // 북행 (위도 증가)
      }
    } else {
      // 동서 방향이 주된 이동
      if (lngDiff > 0.5) {
        expectedDirection = '동행'; // 동쪽으로
      } else if (lngDiff < -0.5) {
        expectedDirection = '서행'; // 서쪽으로
      }
    }
    
    console.log(`🔥 예상 방향: ${expectedDirection} (위도차이: ${latDiff.toFixed(3)}, 경도차이: ${lngDiff.toFixed(3)})`);
    
    // 방향이 명확하지 않으면 모든 휴게소 반환
    if (!expectedDirection) {
      console.log('🔥 방향 불명확 - 모든 방향 휴게소 포함');
      return restAreas;
    }
    
    const directionFilteredRestAreas = restAreas.filter(restArea => {
      // 예상 방향과 일치하거나, 방향 정보가 없는 휴게소는 포함
      const isCorrectDirection = !restArea.direction || 
                                restArea.direction === expectedDirection ||
                                restArea.direction.includes(expectedDirection.replace('방향', ''));
      
      if (isCorrectDirection) {
        console.log(`🔥 방향 매칭: ${restArea.name} (${restArea.direction}) ✓`);
      } else {
        console.log(`🔥 방향 불일치: ${restArea.name} (${restArea.direction}) ✗`);
      }
      
      return isCorrectDirection;
    });
    
    console.log(`🔥 방향 필터링 후: ${directionFilteredRestAreas.length}개 휴게소`);
    return directionFilteredRestAreas;
  }
  
  // 실제 운전 순서대로 휴게소 정렬
  private sortRestAreasByDrivingOrder(
    restAreas: RestArea[], 
    routePath: Coordinates[]
  ): RestArea[] {
    if (!routePath || routePath.length < 2) return restAreas;
    
    console.log(`🔥 운전 순서 정렬 시작: ${restAreas.length}개 휴게소`);
    
    // 각 휴게소의 경로 상 위치 인덱스 계산
    const restAreasWithOrder = restAreas.map(restArea => {
      let minDistance = Infinity;
      let closestIndex = 0;
      
      // 경로상 가장 가까운 지점의 인덱스 찾기
      routePath.forEach((routePoint, index) => {
        const distance = this.calculateDistance(restArea.coordinates, routePoint);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      
      return {
        ...restArea,
        routeIndex: closestIndex,
        distanceFromRoute: minDistance
      };
    });
    
    // 경로 인덱스 순서로 정렬
    const sortedRestAreas = restAreasWithOrder
      .sort((a, b) => a.routeIndex - b.routeIndex)
      .map(({ routeIndex, distanceFromRoute, ...restArea }) => restArea);
    
    console.log(`🔥 정렬 완료: ${sortedRestAreas.map(ra => ra.name).join(' -> ')}`);
    
    return sortedRestAreas;
  }

  // 고속도로명을 노선 코드로 매핑 (카카오 도로명 기준)
  private mapHighwayNameToRouteCode(highwayName: string): string | null {
    const mappings: { [key: string]: string } = {
      // 경부고속도로 (가장 많이 사용) - API 코드 0010
      '경부고속도로': '0010',
      '경부선': '0010',
      '경부': '0010',
      
      // 영동고속도로 - API에 없음, 임시로 중부고속도로로 매핑
      '영동고속도로': '0300',
      '영동선': '0300',
      '영동': '0300',
      
      // 중부내륙고속도로 - API에 없음, 중부고속도로로 매핑
      '중부내륙고속도로': '0300',
      '중부내륙선': '0300',
      
      // 호남고속도로 - API 코드 0251
      '호남고속도로': '0251', 
      '호남선': '0251',
      '호남': '0251',
      
      // 남해고속도로 - API 코드 0100
      '남해고속도로': '0100',
      '남해선': '0100', 
      '남해': '0100',
      
      // 서해안고속도로 - API 코드 0150
      '서해안고속도로': '0150',
      '서해안선': '0150',
      '서해안': '0150',
      
      // 중부고속도로 - API 코드 0300
      '중부고속도로': '0300',
      '중부선': '0300',
      
      // 중앙고속도로 - 실제 노선코드 0550 (칠곡-부산 구간 중요 경로)
      '중앙고속도로': '0550',
      '중앙선': '0550', 
      '중앙고속도로(대구-부산)': '0550',
      '중앙고속도로(대동-삼락)': '0550',
      '중앙고속도로(대동삼락)': '0550',
      '중앙고속도로(대구부산)': '0550',
      '중앙': '0550',
      
      // 기타 고속도로들
      '무안광주고속도로': '0121',
      '광주대구고속도로': '0122',
      '새만금포항고속도로': '0207',
      '완주장수고속도로': '0205',
      '밀양울산고속도로': '0140'
    };
    
    console.log(`🔥 고속도로 매핑 시도: "${highwayName}"`);
    
    // 정확한 매칭 먼저 시도
    if (mappings[highwayName]) {
      console.log(`🔥 정확한 매칭: ${highwayName} -> ${mappings[highwayName]}`);
      return mappings[highwayName];
    }
    
    // 부분 매칭 시도 (긴 이름부터)
    const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (highwayName.includes(key) || key.includes(highwayName.replace('고속도로', '').replace('선', ''))) {
        console.log(`🔥 부분 매칭: ${highwayName} -> ${key} -> ${mappings[key]}`);
        return mappings[key];
      }
    }
    
    console.log(`🔥 매칭 실패: ${highwayName}`);
    return null;
  }


  // 7. 경로상 휴게소 조회 (노선 기반 정확한 매칭) - 백업용
  async getRestAreasOnRoute(
    routePath: Coordinates[], 
    bufferKm: number = 5
  ): Promise<RestArea[]> {
    try {
      console.log('🔥 경로상 휴게소 조회 시작');
      console.log('🔥 경로 시작점:', routePath[0]);
      console.log('🔥 경로 끝점:', routePath[routePath.length - 1]);
      
      // 1단계: 모든 휴게소 기준정보 조회
      const allRestAreas = await this.getRestAreas();
      console.log(`🔥 전체 휴게소 수: ${allRestAreas.length}개`);
      
      // 2단계: 경로 분석하여 어떤 고속도로인지 판단
      const routeType = this.analyzeRoute(routePath[0], routePath[routePath.length - 1]);
      console.log(`🔥 경로 분석 결과:`, routeType);
      
      // 3단계: 해당 노선의 휴게소만 필터링
      const routeRestAreas = this.filterRestAreasByRouteCode(allRestAreas, routeType);
      console.log(`🔥 ${routeType.routeName} 휴게소 ${routeRestAreas.length}개 발견`);
      
      // 4단계: 경로 방향에 맞는 휴게소만 선택 (양방향 모두 포함하되 정렬)
      const sortedRestAreas = this.sortRestAreasByRoute(routeRestAreas, routeType);
      
      console.log(`🔥 최종 휴게소 ${sortedRestAreas.length}개 발견`);
      return sortedRestAreas;
    } catch (error) {
      console.error('🔥 경로상 휴게소 조회 실패:', error);
      return [];
    }
  }

  // 경로 분석 - 출발지와 도착지로 어떤 고속도로인지 판단
  private analyzeRoute(start: Coordinates, end: Coordinates): { routeCode: string; routeName: string; direction: string } {
    const startLat = start.lat;
    const startLng = start.lng;
    const endLat = end.lat;
    const endLng = end.lng;
    
    // 경부고속도로 판단 (서울-부산 축)
    if ((startLat > 37.4 && startLng > 126.9 && startLng < 127.2) && // 서울/경기 시작
        (endLat < 35.2 && endLng > 128.8)) { // 부산 도착
      return { routeCode: "0010", routeName: "경부선", direction: "남행" };
    }
    
    if ((startLat < 35.2 && startLng > 128.8) && // 부산 시작  
        (startLat > 37.4 && startLng > 126.9 && startLng < 127.2)) { // 서울/경기 도착
      return { routeCode: "0010", routeName: "경부선", direction: "북행" };
    }
    
    // 호남고속도로 판단 (서울-목포/광주 축)
    if ((startLat > 37.4 && startLng > 126.9) && // 서울 시작
        (endLat < 35.5 && endLng < 127.0)) { // 전라도 도착
      return { routeCode: "0251", routeName: "호남선", direction: "남행" };
    }
    
    // 영동고속도로 판단 (서울-강릉 축)
    if ((startLat > 37.4 && startLng > 126.9) && // 서울 시작
        (endLat > 37.7 && endLng > 128.8)) { // 강원도 동해안 도착
      return { routeCode: "0065", routeName: "영동선", direction: "동행" };
    }
    
    // 서해안고속도로 판단 (서울-목포 서해안 축)
    if ((startLat > 37.4 && startLng > 126.9) && // 서울 시작
        (endLat < 35.0 && endLng < 126.5)) { // 목포 도착
      return { routeCode: "0150", routeName: "서해안선", direction: "남행" };
    }
    
    // 기본값은 경부고속도로 (가장 많이 사용)
    return { routeCode: "0010", routeName: "경부선", direction: "남행" };
  }

  // 노선 코드로 휴게소 필터링
  private filterRestAreasByRouteCode(
    restAreas: RestArea[], 
    routeInfo: { routeCode: string; routeName: string; direction: string }
  ): RestArea[] {
    console.log(`🔥 노선 필터링: ${routeInfo.routeCode} (${routeInfo.routeName})`);
    
    const filtered = restAreas.filter(restArea => {
      const matches = restArea.routeCode === routeInfo.routeCode;
      if (matches) {
        console.log(`✅ 매칭: ${restArea.name} (${restArea.routeCode})`);
      }
      return matches;
    });
    
    console.log(`🔥 ${routeInfo.routeName} 휴게소 ${filtered.length}개 필터링 완료`);
    return filtered;
  }

  // 휴게소를 노선 순서대로 정렬
  private sortRestAreasByRoute(
    restAreas: RestArea[],
    routeInfo: { routeCode: string; routeName: string; direction: string }
  ): RestArea[] {
    // 경부고속도로의 경우 위도 순으로 정렬 (북 -> 남)
    if (routeInfo.routeCode === "0010") {
      return restAreas.sort((a, b) => b.coordinates.lat - a.coordinates.lat); // 위도 내림차순 (서울 -> 부산)
    }
    
    // 호남고속도로의 경우도 위도 순으로 정렬
    if (routeInfo.routeCode === "0251") {
      return restAreas.sort((a, b) => b.coordinates.lat - a.coordinates.lat);
    }
    
    // 영동고속도로의 경우 경도 순으로 정렬 (서 -> 동)
    if (routeInfo.routeCode === "0065") {
      return restAreas.sort((a, b) => a.coordinates.lng - b.coordinates.lng);
    }
    
    // 기본값: 위도 순 정렬
    return restAreas.sort((a, b) => b.coordinates.lat - a.coordinates.lat);
  }

  // 좌표가 경로 근처에 있는지 확인 (샘플링 개선)
  private isNearRoute(point: Coordinates, routePath: Coordinates[], bufferKm: number): boolean {
    let minDistance = Infinity;
    let closestPoint = null;
    
    // 경로가 너무 길면 샘플링해서 성능 향상 (매 10개 점마다 확인)
    const sampleStep = Math.max(1, Math.floor(routePath.length / 1000)); // 최대 1000개 점만 확인
    
    const isNear = routePath.some((routePoint, index) => {
      // 샘플링: 매 sampleStep마다 확인
      if (index % sampleStep !== 0) return false;
      
      const distance = this.calculateDistance(point, routePoint);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = routePoint;
      }
      return distance <= bufferKm;
    });
    
    // 샘플링으로 찾지 못했으면 전체 경로에서 다시 한번 확인 (정확도 향상)
    if (!isNear && minDistance > bufferKm * 0.8) {
      const detailedCheck = routePath.some(routePoint => {
        const distance = this.calculateDistance(point, routePoint);
        if (distance < minDistance) {
          minDistance = distance;
        }
        return distance <= bufferKm;
      });
      
      console.log(`     - 상세검사 결과: 최단거리 ${minDistance.toFixed(2)}km (버퍼: ${bufferKm}km) → ${detailedCheck ? 'IN' : 'OUT'}`);
      return detailedCheck;
    }
    
    console.log(`     - 샘플링 결과: 최단거리 ${minDistance.toFixed(2)}km (버퍼: ${bufferKm}km) → ${isNear ? 'IN' : 'OUT'}`);
    return isNear;
  }

  // 경로상에서 휴게소까지의 정확한 거리와 소요시간 계산
  private calculateRouteDistance(
    restAreaCoord: Coordinates, 
    routePath: Coordinates[]
  ): { distance: number; duration: number; routeIndex: number } {
    let minDistance = Infinity;
    let closestIndex = 0;
    let totalDistance = 0;

    // 경로상 가장 가까운 지점 찾기
    routePath.forEach((routePoint, index) => {
      const distance = this.calculateDistance(restAreaCoord, routePoint);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // 시작점부터 해당 지점까지의 누적 거리 계산
    for (let i = 0; i < closestIndex; i++) {
      if (i < routePath.length - 1) {
        totalDistance += this.calculateDistance(routePath[i], routePath[i + 1]);
      }
    }

    // 소요시간 계산 (평균 고속도로 속도 80km/h 기준)
    const duration = Math.round((totalDistance / 80) * 60); // 분 단위

    return {
      distance: Math.round(totalDistance * 10) / 10, // km, 소수점 1자리
      duration,
      routeIndex: closestIndex
    };
  }

  // 두 좌표 간 거리 계산 (km)
  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.deg2rad(point2.lat - point1.lat);
    const dLng = this.deg2rad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // 휴게소 응답 데이터 파싱 (공식 한국도로공사 API)
  private parseRestAreasResponse(data: any): RestArea[] {
    try {
      console.log('🔥 파싱 시작 - 응답 데이터:', data);
      console.log('🔥 응답 구조:', Object.keys(data));
      
      // locationinfoRest API는 다른 구조를 가질 수 있으므로 여러 경우를 처리
      let itemList: any[] = [];
      
      if (data.list && Array.isArray(data.list)) {
        itemList = data.list;
      } else if (data.response && data.response.body && data.response.body.items) {
        itemList = Array.isArray(data.response.body.items.item) ? 
                   data.response.body.items.item : [data.response.body.items.item];
      } else if (Array.isArray(data)) {
        itemList = data;
      } else {
        console.log('🔥 데이터 구조 오류: 파싱할 수 있는 배열을 찾을 수 없음');
        return [];
      }
      
      console.log('🔥 파싱할 항목 수:', itemList.length);
      
      // locationinfoRest API는 휴게소만 포함하므로 별도 필터링 불필요할 수도 있음
      let restAreasOnly = itemList;
      
      // 기존 API 구조인 경우에만 휴게소 필터링 적용
      if (itemList.length > 0 && itemList[0].svarGsstClssCd !== undefined) {
        restAreasOnly = itemList.filter((item: any) => 
          item.svarGsstClssCd === "0" && item.svarGsstClssNm === "휴게소"
        );
        console.log('🔥 휴게소 필터링 후 개수:', restAreasOnly.length);
      }

      const parsedData = restAreasOnly.map((item: any, index: number) => {
        // API별로 다른 필드명 처리
        const restAreaName = (
          item.unitName || // 한국도로공사 API 실제 필드명
          item.svarNm || // 기존 API
          item.restAreaName || // locationinfoRest API
          item.name || 
          '알 수 없는 휴게소'
        ).replace(/(주유소|휴게소)$/, '');
        
        const address = item.svarAddr || item.addr || item.address || '';
        
        // 처음 5개만 상세 로그 출력
        if (index < 5) {
          console.log(`🔥 휴게소 파싱 [${index}]: "${restAreaName}" 주소: "${address}"`);
          console.log(`🔥 원본 데이터 전체:`, JSON.stringify(item, null, 2));
          console.log(`🔥 사용 가능한 필드들:`, Object.keys(item));
        }
        
        // locationinfoRest API는 직접적인 위도/경도를 제공할 수 있음
        let finalCoordinates;
        
        if (item.lat && item.lng) {
          // API에서 직접 좌표 제공
          finalCoordinates = {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lng)
          };
          if (index < 5) console.log(`🔥 🎯 API 직접 좌표: ${restAreaName} -> (${finalCoordinates.lat}, ${finalCoordinates.lng})`);
        } else if (item.latitude && item.longitude) {
          // 다른 필드명으로 좌표 제공
          finalCoordinates = {
            lat: parseFloat(item.latitude),
            lng: parseFloat(item.longitude)
          };
          if (index < 5) console.log(`🔥 🎯 API 직접 좌표2: ${restAreaName} -> (${finalCoordinates.lat}, ${finalCoordinates.lng})`);
        } else if (item.yValue && item.xValue) {
          // xValue(경도), yValue(위도) 형태 (목 데이터 형식)
          finalCoordinates = {
            lat: parseFloat(item.yValue),
            lng: parseFloat(item.xValue)
          };
          if (index < 5) console.log(`🔥 🎯 XY좌표 파싱: ${restAreaName} -> (${finalCoordinates.lat}, ${finalCoordinates.lng})`);
        } else {
          // 주소에서 좌표 추출 시도
          const coordinates = this.extractCoordinatesFromAddress(address);
          if (coordinates) {
            finalCoordinates = coordinates;
            if (index < 5) console.log(`🔥 ✅ 주소 기반 좌표: ${restAreaName} -> (${coordinates.lat}, ${coordinates.lng})`);
          } else {
            finalCoordinates = this.getEstimatedCoordinates(item.routeNm || item.routeName, restAreaName);
            if (index < 5) console.log(`🔥 ⚠️ 추정 좌표 사용: ${restAreaName} -> (${finalCoordinates.lat}, ${finalCoordinates.lng})`);
          }
        }
        
        // 방향 정보 변환 (다양한 API 구조 대응)
        let direction = '';
        if (item.gudClssCd === "0") {
          direction = "서울방향";
        } else if (item.gudClssCd === "1") {
          direction = "부산방향";
        } else if (item.gudClssNm) {
          direction = item.gudClssNm;
        } else if (item.direction) {
          direction = item.direction;
        }
        
        return {
          id: item.svarCd || item.restAreaCode || item.code || String(Math.random()),
          name: restAreaName,
          coordinates: finalCoordinates,
          routeCode: item.routeNo || item.routeCd || item.routeCode || '',
          direction: direction,
          facilities: this.getFacilitiesFromData(item),
          operatingHours: '24시간',
          phoneNumber: item.rprsTelNo || item.tel || item.phone || '',
          address: address,
          foods: []
        };
      });
      
      console.log('🔥 파싱 완료 - 샘플 데이터:');
      console.log(JSON.stringify(parsedData.slice(0, 3), null, 2));
      
      // 좌표가 있는 데이터만 필터링
      const filteredData = parsedData.filter((restArea: RestArea) => 
        restArea.coordinates.lat !== 0 && restArea.coordinates.lng !== 0
      );
      
      console.log('🔥 최종 휴게소 수:', filteredData.length);
      return filteredData;
    } catch (error) {
      console.error('휴게소 파싱 오류:', error);
      return [];
    }
  }

  // API 데이터에서 편의시설 정보 추출
  private getFacilitiesFromData(item: any): string[] {
    const facilities = ['화장실', '주차장'];
    
    // 주차 정보가 있으면 추가
    if (item.cocrPrkgTrcn && parseInt(item.cocrPrkgTrcn) > 0) facilities.push('승용차주차');
    if (item.fscarPrkgTrcn && parseInt(item.fscarPrkgTrcn) > 0) facilities.push('화물차주차');
    if (item.dspnPrkgTrcn && parseInt(item.dspnPrkgTrcn) > 0) facilities.push('장애인주차');
    
    return facilities;
  }

  // 주소에서 좌표 추출 (더 정확한 지역 기반)
  private extractCoordinatesFromAddress(address: string): { lat: number; lng: number } | null {
    // 구체적인 지역별 정확한 좌표 매핑 (우선순위: 구체적 지역 -> 광역시/도)
    const regionCoordinates: { [key: string]: { lat: number; lng: number } } = {
      // 서울/경기 상세 지역
      '서초구': { lat: 37.4837, lng: 127.0324 },
      '성남시': { lat: 37.4449, lng: 127.1388 },
      '분당구': { lat: 37.3838, lng: 127.1230 },
      '궁내동': { lat: 37.3641, lng: 127.1135 },
      '용인시': { lat: 37.2411, lng: 127.1775 },
      '기흥': { lat: 37.2753, lng: 127.0946 },
      '안성시': { lat: 37.0078, lng: 127.2797 },
      '오산': { lat: 37.1499, lng: 127.0773 },
      
      // 충청 지역
      '천안시': { lat: 36.8151, lng: 127.1139 },
      '청주시': { lat: 36.6424, lng: 127.4890 },
      '청원군': { lat: 36.6424, lng: 127.4890 },
      '옥천군': { lat: 36.3061, lng: 127.5717 },
      '영동군': { lat: 36.1750, lng: 127.7764 },
      '대전시': { lat: 36.3504, lng: 127.3845 },
      '대덕구': { lat: 36.3467, lng: 127.4145 },
      
      // 경북 지역
      '김천시': { lat: 36.1396, lng: 128.1133 },
      '구미시': { lat: 36.1196, lng: 128.3441 },
      '칠곡군': { lat: 35.9948, lng: 128.4015 },
      '경산시': { lat: 35.8251, lng: 128.7411 },
      '경주시': { lat: 35.8562, lng: 129.2247 },
      
      // 대구 지역
      '대구': { lat: 35.8714, lng: 128.6014 },
      '달성군': { lat: 35.7748, lng: 128.4312 },
      '북구': { lat: 35.8858, lng: 128.5828 },
      
      // 경남/부산 지역
      '울산': { lat: 35.5384, lng: 129.3114 },
      '울주군': { lat: 35.5219, lng: 129.1136 },
      '양산시': { lat: 35.3350, lng: 129.0378 },
      
      // 전북 지역 (호남/무안광주선)
      '전북': { lat: 35.8242, lng: 127.1480 },
      '전라북도': { lat: 35.8242, lng: 127.1480 },
      '익산': { lat: 35.9483, lng: 126.9576 },
      '정읍': { lat: 35.5697, lng: 126.8560 },
      
      // 광역시/도 (마지막 우선순위)
      '서울': { lat: 37.5665, lng: 126.9780 },
      '경기': { lat: 37.4138, lng: 127.5183 },
      '충남': { lat: 36.5184, lng: 126.8000 },
      '충북': { lat: 36.8, lng: 127.7 },
      '경북': { lat: 36.4, lng: 128.6 },
      '경남': { lat: 35.4606, lng: 128.2132 }
    };

    // 주소에서 가장 구체적인 지역명부터 찾기 (긴 이름 우선)
    const sortedRegions = Object.keys(regionCoordinates).sort((a, b) => b.length - a.length);
    
    console.log(`🔥 좌표 매핑 시도: "${address}"`);
    
    for (const region of sortedRegions) {
      if (address.includes(region)) {
        const coords = regionCoordinates[region];
        console.log(`🔥 ✅ 매칭 성공: "${address}" -> 지역 "${region}" -> 좌표 (${coords.lat}, ${coords.lng})`);
        return coords;
      }
    }
    
    console.log(`🔥 ❌ 매핑 실패: "${address}" -> 기본값 사용`);
    return null;
  }

  // 고속도로 노선과 휴게소명으로 추정 좌표 생성
  private getEstimatedCoordinates(routeName: string, serviceAreaName: string): { lat: number; lng: number } {
    console.log(`🔥 추정 좌표 생성: 노선="${routeName}", 휴게소="${serviceAreaName}"`);
    
    // 특수한 휴게소들 (정확한 좌표)
    if (serviceAreaName?.includes('하이패스센터') || serviceAreaName?.includes('서울하이패스센터')) {
      console.log(`🔥 하이패스센터 발견 -> 성남 분당 좌표 사용`);
      return { lat: 37.3641, lng: 127.1135 }; // 성남시 분당구 궁내동
    }
    if (serviceAreaName?.includes('서서울')) return { lat: 37.5065, lng: 126.8776 };
    
    // 경부고속도로 휴게소들의 대략적인 위치
    if (routeName?.includes('경부')) {
      if (serviceAreaName?.includes('서울만남')) return { lat: 37.4979, lng: 127.0276 };
      if (serviceAreaName?.includes('기흥')) return { lat: 37.2753, lng: 127.0946 };
      if (serviceAreaName?.includes('안성')) return { lat: 37.0078, lng: 127.2797 };
      if (serviceAreaName?.includes('천안') || serviceAreaName?.includes('망향')) return { lat: 36.8151, lng: 127.1139 };
      if (serviceAreaName?.includes('옥산')) return { lat: 36.6416, lng: 127.3128 };
      if (serviceAreaName?.includes('금강')) return { lat: 36.3504, lng: 127.3845 };
      if (serviceAreaName?.includes('김천')) return { lat: 36.1396, lng: 128.1133 };
      if (serviceAreaName?.includes('구미')) return { lat: 36.1196, lng: 128.3441 };
      if (serviceAreaName?.includes('칠곡')) return { lat: 35.9948, lng: 128.4015 };
      if (serviceAreaName?.includes('경주')) return { lat: 35.8562, lng: 129.2247 };
      if (serviceAreaName?.includes('양산')) return { lat: 35.3350, lng: 129.0378 };
      if (serviceAreaName?.includes('통도사')) return { lat: 35.2895, lng: 129.1628 };
    }
    
    console.log(`🔥 기본값 좌표 사용`);
    return { lat: 36.5, lng: 127.5 };
  }

  // 매장 정보 응답 데이터 파싱
  private parseFoodsResponse(data: any): RestFood[] {
    try {
      if (!data.list || !Array.isArray(data.list)) {
        return [];
      }

      return data.list.map((item: any) => ({
        id: item.shopCode || item.foodId || String(Math.random()),
        name: item.foodName || item.shopName || item.name || '메뉴명 없음',
        price: item.foodCost || item.price || '가격 미정',
        description: item.foodMaterial || item.description || '',
        category: item.foodKind || item.shopType || item.category || '기타',
        shopCode: item.shopCode || '',
        restAreaCode: item.routeCd || item.restAreaCode || '',
        salesRank: item.rank || 0
      }));
    } catch (error) {
      console.error('매장 정보 파싱 오류:', error);
      return [];
    }
  }

  // 편의시설 응답 데이터 파싱
  private parseFacilitiesResponse(data: any): RestFacility[] {
    try {
      if (!data.list || !Array.isArray(data.list)) {
        return [];
      }

      return data.list.map((item: any) => ({
        id: item.facilityId || String(Math.random()),
        type: item.facilityType || item.convenienceType || '기타',
        name: item.facilityName || item.convenienceName || '시설명 없음',
        status: item.operationStatus || item.status || '운영중',
        description: item.description || '',
        restAreaCode: item.routeCd || item.restAreaCode || ''
      }));
    } catch (error) {
      console.error('편의시설 파싱 오류:', error);
      return [];
    }
  }

  // 편의시설 파싱
  private parseFacilities(facilitiesStr: string): string[] {
    if (!facilitiesStr) return [];
    
    const facilities = facilitiesStr.split(',').map(f => f.trim()).filter(f => f);
    return facilities;
  }

  // 점에서 폴리라인까지의 최단거리 계산 (km)
  private calculateDistanceToPolyline(point: Coordinates, polyline: Coordinates[]): number {
    if (polyline.length < 2) return Infinity;
    
    let minDistance = Infinity;
    
    for (let i = 0; i < polyline.length - 1; i++) {
      const segmentStart = polyline[i];
      const segmentEnd = polyline[i + 1];
      
      // 점에서 선분까지의 거리 계산
      const distance = this.calculateDistanceToLineSegment(point, segmentStart, segmentEnd);
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }
  
  // 점에서 선분까지의 거리 계산 (km)
  private calculateDistanceToLineSegment(
    point: Coordinates, 
    lineStart: Coordinates, 
    lineEnd: Coordinates
  ): number {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // 선분의 시작점과 끝점이 같은 경우
      return this.calculateDistance(point, lineStart);
    }
    
    let param = dot / lenSq;
    
    let closestPoint: Coordinates;
    if (param < 0) {
      closestPoint = lineStart;
    } else if (param > 1) {
      closestPoint = lineEnd;
    } else {
      closestPoint = {
        lat: lineStart.lat + param * C,
        lng: lineStart.lng + param * D
      };
    }
    
    return this.calculateDistance(point, closestPoint);
  }
  
  // 가장 가까운 경로점의 인덱스 찾기
  private findClosestRouteIndex(point: Coordinates, routePath: Coordinates[]): number {
    let minDistance = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < routePath.length; i++) {
      const distance = this.calculateDistance(point, routePath[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }
  
  // 경로 상 특정 지점까지의 누적 거리 계산 (km)
  private calculateRouteDistance(routePath: Coordinates[], targetIndex: number): number {
    let totalDistance = 0;
    
    for (let i = 0; i < Math.min(targetIndex, routePath.length - 1); i++) {
      totalDistance += this.calculateDistance(routePath[i], routePath[i + 1]);
    }
    
    return totalDistance;
  }

  // RestSpotFinder 알고리즘 기반 - 정확한 500m 반경 검색
  async getRestAreasOnHighwaySegments(
    highwaySegments: any[], 
    routePath: Coordinates[]
  ): Promise<RestArea[]> {
    try {
      console.log('🎯 향상된 RestSpotFinder - 다중 데이터 소스 휴게소 검색 시작');
      console.log(`📍 경로점: ${routePath.length}개, 고속도로 구간: ${highwaySegments.length}개`);
      
      // 1차: 한국도로공사 API (기본 데이터)
      const officialRestAreas = await this.getRestAreas();
      console.log(`🏪 한국도로공사 API 휴게소: ${officialRestAreas.length}개`);
      
      // 기존 공식 데이터만 사용
      const mergedRestAreas = officialRestAreas;
      console.log(`🔗 사용 휴게소 데이터: ${mergedRestAreas.length}개`);
      
      if (mergedRestAreas.length === 0 || routePath.length < 2) {
        return [];
      }
      
      // 2차: 실제 고속도로 경로 필터링 (500m 반경)
      const accessibleRestAreas = this.getRestAreasNearRoute(routePath, mergedRestAreas);
      console.log(`🎯 500m 반경 내 접근가능 휴게소: ${accessibleRestAreas.length}개`);
      
      // 3차: 경로 순서대로 정렬 및 거리 계산
      const sortedRestAreas = this.sortRestAreasByRouteOrder(routePath, accessibleRestAreas);
      console.log(`📋 최종 경로 순 휴게소: ${sortedRestAreas.length}개`);
      
      // 상위 10개 휴게소 로그
      sortedRestAreas.slice(0, 10).forEach((ra, idx) => {
        console.log(`  ${idx+1}. ${ra.name} (${ra.routeDistance.toFixed(1)}km 지점)`);
      });
      
      return sortedRestAreas;
      
    } catch (error) {
      console.error('🚨 RestSpotFinder 알고리즘 실패:', error);
      return [];
    }
  }
  
  // RestSpotFinder 진짜 알고리즘: 도로명 무시, 순수 좌표 기준 검색 (적응형 반경)
  private getRestAreasNearRoute(routePath: Coordinates[], allRestAreas: RestArea[]): RestArea[] {
    const accessibleRestAreas: RestArea[] = [];
    
    console.log(`🎯 개선된 RestSpotFinder: ${routePath.length}개 경로 포인트 기준, 500m 반경 검색`);
    console.log(`🚨 전체 불러온 휴게소 수: ${allRestAreas.length}개`);
    
    // 청도새마을휴게소가 API 데이터에 있는지 확인
    const cheongdoAreas = allRestAreas.filter(ra => 
      ra.name.includes('청도') || ra.name.includes('새마을')
    );
    console.log(`🚨 청도/새마을 관련 휴게소:`, cheongdoAreas.map(ra => 
      `${ra.name} (${ra.routeCode}) - ${ra.coordinates.lat.toFixed(4)}, ${ra.coordinates.lng.toFixed(4)}`
    ));
    
    // 전체 휴게소 이름들 중 중앙/청도 관련 검색
    const centralAreas = allRestAreas.filter(ra => 
      ra.name.includes('중앙') || ra.name.includes('청도') || ra.name.includes('새마을') ||
      ra.name.includes('Central') || ra.name.toLowerCase().includes('cheongdo')
    );
    console.log(`🚨 중앙/청도 관련 모든 휴게소:`, centralAreas.map(ra => 
      `${ra.name} (${ra.routeCode}) - ${ra.address || 'N/A'}`
    ));
    
    // 디버깅: 휴게소 좌표 샘플
    console.log(`🚨 휴게소 데이터 샘플 (첫 10개):`);
    allRestAreas.slice(0, 10).forEach((ra, i) => {
      console.log(`  ${i+1}. ${ra.name} (${ra.routeCode}) - ${ra.address || 'N/A'}`);
    });
    
    // 디버깅: 경로 좌표 상세 분석 - 특히 칠곡 이후 구간
    console.log(`🚨 경로 좌표 분석:`);
    const keyPoints = [0, Math.floor(routePath.length/4), Math.floor(routePath.length/2), Math.floor(routePath.length*3/4), routePath.length-1];
    keyPoints.forEach(i => {
      console.log(`  ${i}: (${routePath[i].lat.toFixed(4)}, ${routePath[i].lng.toFixed(4)})`);
    });
    
    // 경로 범위 확인
    const minLat = Math.min(...routePath.map(p => p.lat));
    const maxLat = Math.max(...routePath.map(p => p.lat));
    const minLng = Math.min(...routePath.map(p => p.lng));
    const maxLng = Math.max(...routePath.map(p => p.lng));
    console.log(`🚨 경로 범위: 위도 ${minLat.toFixed(4)}~${maxLat.toFixed(4)}, 경도 ${minLng.toFixed(4)}~${maxLng.toFixed(4)}`);
    
    // 칠곡(35.7도) 이후 경로 포인트들 확인 - 경부고속도로를 따라가는지?
    const chilgokAfterPoints = routePath.filter(p => p.lat < 35.8);
    console.log(`🚨 칠곡 이후 경로 포인트 ${chilgokAfterPoints.length}개:`);
    chilgokAfterPoints.slice(0, 10).forEach((p, i) => {
      console.log(`  칠곡후${i}: (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`);
    });
    
    // 중앙선 경유 휴게소들 특별 확인 (실제 노선코드 0550 사용)
    const jungsang_areas = allRestAreas.filter(ra => 
      ra.routeCode === '0550' || // 중앙선 정확한 노선코드
      ra.name.includes('청도') || ra.name.includes('새마을') || ra.name.includes('동명')
    );
    console.log(`🚨 중앙선(노선코드 0550) 휴게소들:`);
    jungsang_areas.forEach(ra => {
      console.log(`  ${ra.name} (${ra.routeCode}): (${ra.coordinates.lat.toFixed(4)}, ${ra.coordinates.lng.toFixed(4)})`);
    });
    
    // 전체 노선코드 확인 (디버깅용)
    const allRouteCodes = new Set(allRestAreas.map(ra => ra.routeCode).filter(Boolean));
    console.log(`🚨 API 데이터의 전체 노선코드: ${Array.from(allRouteCodes).sort().join(', ')}`);
    
    // 경부고속도로 vs 중앙선 휴게소 비교
    const busan_areas = allRestAreas.filter(ra => 
      ra.name.includes('부산') || ra.name.includes('양산') || ra.name.includes('언양') || 
      ra.name.includes('경주') || ra.name.includes('건천') || ra.name.includes('통도사')
    );
    console.log(`🚨 경부고속도로 휴게소들:`);
    busan_areas.forEach(ra => {
      console.log(`  ${ra.name} (${ra.routeCode}): (${ra.coordinates.lat.toFixed(4)}, ${ra.coordinates.lng.toFixed(4)})`);
    });
    
    // 경부고속도로 표준 경로와 비교 (대략적인 경부고속도로 좌표들)
    const gyeongbuHighwayPoints = [
      { name: '칠곡IC', lat: 35.7394, lng: 128.4112 },
      { name: '대구IC', lat: 35.6340, lng: 128.6112 }, 
      { name: '경주IC', lat: 35.8394, lng: 129.2100 },
      { name: '언양IC', lat: 35.4394, lng: 129.0100 },
      { name: '양산IC', lat: 35.3394, lng: 129.1100 },
      { name: '부산IC', lat: 35.1158, lng: 129.0413 }
    ];
    console.log(`🚨 표준 경부고속도로 IC 좌표들:`);
    gyeongbuHighwayPoints.forEach(point => {
      console.log(`  ${point.name}: (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`);
    });
    
    let checkCount = 0;
    for (const restArea of allRestAreas) {
      // 휴게소에서 경로 전체까지의 최단거리 계산
      const distanceToRoute = this.calculateDistanceToPolyline(restArea.coordinates, routePath);
      
      const RADIUS_KM = 0.5; // 500m 반경으로 복구
      
      // 부산방향 휴게소들의 거리 특별 체크
      if (restArea.name.includes('부산') || restArea.name.includes('양산') || 
          restArea.name.includes('언양') || restArea.name.includes('경주') || 
          restArea.name.includes('건천') || restArea.name.includes('통도사')) {
        console.log(`🔍 ${restArea.name}: 경로까지 ${(distanceToRoute * 1000).toFixed(0)}m`);
      }
      
      // 처음 10개 휴게소의 거리 로그
      if (checkCount < 10) {
        console.log(`🔍 일반 ${restArea.name}: 경로까지 ${(distanceToRoute * 1000).toFixed(0)}m`);
        checkCount++;
      }
      
      if (distanceToRoute <= RADIUS_KM) {
        // 경로상에서 몇 km 지점인지 계산
        const routeDistance = this.calculateRouteDistanceToPoint(routePath, restArea.coordinates);
        
        accessibleRestAreas.push({
          ...restArea,
          distanceFromRoute: distanceToRoute,
          routeDistance: routeDistance
        });
        
        console.log(`✅ ${restArea.name}: 경로까지 ${(distanceToRoute * 1000).toFixed(0)}m, ${routeDistance.toFixed(1)}km 지점`);
      }
    }
    
    return accessibleRestAreas;
  }
  
  
  // 경로를 일정 간격으로 구간 분할
  private divideRouteIntoSegments(routePath: Coordinates[], intervalKm: number): Coordinates[] {
    if (routePath.length < 2) return routePath;
    
    const segments: Coordinates[] = [routePath[0]]; // 시작점 추가
    let currentDistance = 0;
    let lastSegmentIndex = 0;
    
    for (let i = 1; i < routePath.length; i++) {
      const segmentDistance = this.calculateDistance(routePath[i-1], routePath[i]);
      currentDistance += segmentDistance;
      
      // 일정 간격마다 구간 포인트 추가
      if (currentDistance >= intervalKm) {
        segments.push(routePath[i]);
        currentDistance = 0;
        lastSegmentIndex = i;
      }
    }
    
    // 마지막 지점이 추가되지 않았으면 추가
    if (lastSegmentIndex < routePath.length - 1) {
      segments.push(routePath[routePath.length - 1]);
    }
    
    return segments;
  }
  
  // 카카오 로컬 API 휴게소 검색
  private async searchKakaoLocalRestAreas(lat: number, lng: number, radius: number): Promise<RestArea[]> {
    const KAKAO_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
    
    if (!KAKAO_API_KEY) {
      throw new Error('Kakao REST API Key가 설정되지 않았습니다.');
    }
    
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=휴게소&x=${lng}&y=${lat}&radius=${radius}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
          'KA': 'sdk/1.0.0 os/javascript lang/ko-KR device/web origin/localhost'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`카카오 API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.documents?.map((place: any) => ({
      id: `kakao_${place.id}`,
      name: place.place_name,
      coordinates: {
        lat: parseFloat(place.y),
        lng: parseFloat(place.x)
      },
      address: place.address_name,
      routeCode: 'KAKAO', // 카카오 데이터 표시
      routeName: '카카오검색',
      direction: '알수없음',
      serviceType: '휴게소',
      operatingTime: '알수없음',
      phone: place.phone || '',
      facilities: [],
      source: 'kakao'
    })) || [];
  }
  
  // 고속도로 휴게소만 필터링 (이름 기반)
  private filterHighwayRestAreas(restAreas: RestArea[]): RestArea[] {
    return restAreas.filter(restArea => {
      const name = restArea.name.toLowerCase();
      
      // 고속도로 휴게소 키워드 포함
      const highwayKeywords = ['휴게소', '(휴게소)', '고속도로', '(상행)', '(하행)', '(부산)', '(서울)', '(강릉)', '(목포)'];
      const hasHighwayKeyword = highwayKeywords.some(keyword => 
        name.includes(keyword.toLowerCase())
      );
      
      // 일반 식당, 주유소 등 제외
      const excludeKeywords = ['식당', '주유소', '카페', '음식점', '마트', '편의점'];
      const hasExcludeKeyword = excludeKeywords.some(keyword => 
        name.includes(keyword) && !name.includes('휴게소')
      );
      
      return hasHighwayKeyword && !hasExcludeKeyword;
    });
  }
  
  
  // 경로상 거리 계산: 출발점부터 특정 지점까지
  private calculateRouteDistanceToPoint(routePath: Coordinates[], point: Coordinates): number {
    if (routePath.length < 2) return 0;
    
    let totalDistance = 0;
    let minDistance = Infinity;
    let bestIndex = 0;
    
    // 경로에서 해당 지점과 가장 가까운 세그먼트 찾기
    for (let i = 0; i < routePath.length - 1; i++) {
      const segmentStart = routePath[i];
      const segmentEnd = routePath[i + 1];
      
      // 세그먼트와의 거리 계산
      const distToSegment = this.distanceToLineSegment(point, segmentStart, segmentEnd);
      
      if (distToSegment < minDistance) {
        minDistance = distToSegment;
        bestIndex = i;
      }
    }
    
    // 출발점부터 가장 가까운 지점까지의 누적 거리
    for (let i = 0; i < bestIndex; i++) {
      totalDistance += this.calculateDistance(routePath[i], routePath[i + 1]);
    }
    
    return totalDistance;
  }
  
  // 점에서 선분까지의 최단거리 계산
  private distanceToLineSegment(point: Coordinates, lineStart: Coordinates, lineEnd: Coordinates): number {
    const A = point.lng - lineStart.lng;
    const B = point.lat - lineStart.lat;
    const C = lineEnd.lng - lineStart.lng;
    const D = lineEnd.lat - lineStart.lat;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

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

    const dx = point.lng - xx;
    const dy = point.lat - yy;
    
    // 좌표를 km로 변환
    return this.calculateDistance(point, { lat: yy, lng: xx });
  }
  
  // RestSpotFinder 알고리즘 - 접근 가능한 휴게소 필터링 (정확한 구현)
  private getAccessibleRestAreas(
    routePath: Coordinates[], 
    allRestAreas: RestArea[], 
    highwaySegments: any[]
  ): RestArea[] {
    const RADIUS_KM = 5.0; // 5km 반경으로 확대 (더 많은 휴게소 포함)
    
    console.log(`🛣️ 경로 상 고속도로 구간들:`);
    highwaySegments.forEach(segment => {
      console.log(`  - ${segment.name}`);
    });
    
    // 전체 경로에서 방향성 판단 (서울→부산 = 하행)
    const routeDirection = this.calculateRouteDirection(routePath);
    console.log(`🧭 경로 방향: ${routeDirection === 'down' ? '하행(부산방향)' : '상행(서울방향)'}`);
    
    // 모든 고속도로 노선코드 추출 (경부선, 영동선, 중부내륙선 등)
    const routeCodes = new Set<string>();
    highwaySegments.forEach(segment => {
      const routeCode = this.mapHighwayNameToRouteCode(segment.name);
      if (routeCode) {
        routeCodes.add(routeCode);
        console.log(`🛣️ ${segment.name} → ${routeCode}`);
      }
    });
    
    console.log(`🔍 검색 대상 노선: ${Array.from(routeCodes).join(', ')}`);
    
    // 디버깅: 실제 API 데이터의 노선 코드들 확인
    const actualRouteCodes = new Set<string>();
    allRestAreas.forEach(ra => {
      if (ra.routeCode && ra.routeCode.trim()) actualRouteCodes.add(ra.routeCode);
    });
    console.warn(`🚨🚨🚨 실제 휴게소 데이터의 모든 노선 코드들: ${Array.from(actualRouteCodes).sort().join(', ')}`);
    
    // 각 노선코드별 휴게소 수 확인
    Array.from(routeCodes).forEach(code => {
      const count = allRestAreas.filter(ra => ra.routeCode === code).length;
      console.warn(`🚨🚨🚨 노선코드 ${code}의 휴게소 수: ${count}개`);
    });
    
    // 경로 주변 휴게소 검색 및 방향성 필터링
    const accessibleRestAreas: RestArea[] = [];
    const addedRestAreaIds = new Set<string>();
    
    // PostGIS ST_DWithin과 동일한 로직: 경로 LineString과 휴게소 간 최단거리 계산
    for (const restArea of allRestAreas) {
      if (addedRestAreaIds.has(restArea.id)) continue;
      
      // 핵심: 휴게소에서 경로 전체 LineString까지의 최단거리 (PostGIS 로직)
      const distanceToRouteLine = this.calculateDistanceToPolyline(restArea.coordinates, routePath);
      
      // 5km 반경 내 휴게소 (임시로 노선 필터링 제거해서 모든 휴게소 확인)
      if (distanceToRouteLine <= RADIUS_KM) {
        // 방향성 체크: 하행이면 (부산)/(하행) 휴게소만, 상행이면 (서울)/(상행) 휴게소만
        if (this.checkRestAreaDirection(restArea, routeDirection)) {
          accessibleRestAreas.push({
            ...restArea,
            distanceFromRoute: distanceToRouteLine
          });
          addedRestAreaIds.add(restArea.id);
          console.log(`✅ 발견: ${restArea.name} (경로까지 ${distanceToRouteLine.toFixed(2)}km, ${restArea.routeCode})`);
        } else {
          console.log(`❌ 방향불일치: ${restArea.name} (${routeDirection} 경로인데 ${this.getRestAreaDirection(restArea)} 휴게소)`);
        }
      } else if (distanceToRouteLine <= RADIUS_KM) {
        console.log(`📍 반경내이지만 노선불일치: ${restArea.name} (${restArea.routeCode}, 거리: ${distanceToRouteLine.toFixed(2)}km)`);
      }
    }
    
    console.log(`🎯 방향성 필터링 완료: ${accessibleRestAreas.length}개 휴게소`);
    return accessibleRestAreas;
  }
  
  // 경로 방향성 계산 (위도 차이로 판단)
  private calculateRouteDirection(routePath: Coordinates[]): 'up' | 'down' {
    const startLat = routePath[0].lat;
    const endLat = routePath[routePath.length - 1].lat;
    
    // 위도가 감소하면 하행(남쪽으로), 증가하면 상행(북쪽으로)
    return endLat < startLat ? 'down' : 'up';
  }
  
  // 휴게소 방향성 체크 (더 관대한 조건)
  private checkRestAreaDirection(restArea: RestArea, routeDirection: 'up' | 'down'): boolean {
    const restAreaDirection = this.getRestAreaDirection(restArea);
    
    // 양방향이거나 방향성이 명확하지 않은 휴게소는 포함
    if (restAreaDirection === '양방향') {
      return true;
    }
    
    if (routeDirection === 'down') {
      // 하행 경로: 부산, 하행, 남쪽, 강릉(영동선), 창원(중부내륙선) 방향 휴게소 모두 포함
      return restAreaDirection.includes('부산') || 
             restAreaDirection.includes('하행') || 
             restAreaDirection.includes('남') ||
             restAreaDirection.includes('강릉') ||  // 영동고속도로
             restAreaDirection.includes('창원') ||  // 중부내륙고속도로  
             restAreaDirection.includes('대구') ||  // 중앙고속도로
             restAreaDirection.includes('진주');   // 남해고속도로
    } else {
      // 상행 경로: 서울, 상행, 북쪽 방향 휴게소만
      return restAreaDirection.includes('서울') || 
             restAreaDirection.includes('상행') || 
             restAreaDirection.includes('북');
    }
  }
  
  // 휴게소 이름에서 방향성 추출 (더 정교한 파싱)
  private getRestAreaDirection(restArea: RestArea): string {
    const name = restArea.name.toLowerCase();
    
    // 명확한 방향 표시
    if (name.includes('(부산)') || name.includes('부산')) return '부산방향';
    if (name.includes('(서울)') || name.includes('서울')) return '서울방향';
    if (name.includes('(강릉)') || name.includes('강릉')) return '강릉방향';
    if (name.includes('(창원)') || name.includes('창원')) return '창원방향';
    if (name.includes('(대구)') || name.includes('대구')) return '대구방향';
    if (name.includes('(진주)') || name.includes('진주')) return '진주방향';
    
    // 상하행 표시
    if (name.includes('하행')) return '하행';
    if (name.includes('상행')) return '상행';
    
    // 방위 표시
    if (name.includes('남')) return '남쪽방향';
    if (name.includes('북')) return '북쪽방향';
    
    // 방향성 정보가 없는 경우 (복합휴게소 등)
    return '양방향';
  }
  
  
  // 휴게소 접근성 판단 (노선별 방향성 확인)
  private isRestAreaAccessible(
    routePoint: Coordinates, 
    restArea: RestArea, 
    routePath: Coordinates[]
  ): boolean {
    // 간단한 방향성 체크: 휴게소가 경로의 진행방향과 맞는지 확인
    const routeIndex = this.findClosestRouteIndex(restArea.coordinates, routePath);
    
    // 경로의 시작이나 끝 부분이면 접근 가능
    if (routeIndex <= 5 || routeIndex >= routePath.length - 5) {
      return true;
    }
    
    // 중간 지점이면 더 정밀한 방향성 체크
    // 현재는 간단하게 모든 휴게소를 접근 가능으로 판단
    return true;
  }
  
  // 경로 순서대로 휴게소 정렬
  private sortRestAreasByRouteOrder(routePath: Coordinates[], restAreas: RestArea[]): RestArea[] {
    const startPoint = routePath[0];
    
    return restAreas
      .map(restArea => ({
        ...restArea,
        routeIndex: this.findClosestRouteIndex(restArea.coordinates, routePath),
        distanceFromStart: this.calculateDistance(startPoint, restArea.coordinates)
      }))
      .sort((a, b) => a.routeIndex - b.routeIndex)
      .map((restArea, index) => ({
        ...restArea,
        routeDistance: restArea.distanceFromStart,
        routeDuration: Math.round(restArea.distanceFromStart / 80 * 60),
        distanceToNext: index < restAreas.length - 1 ? 
          this.calculateDistance(restArea.coordinates, restAreas[index + 1]?.coordinates || restArea.coordinates) : 0
      }));
  }
  
  // 바운딩 박스 계산
  private calculateBoundingBox(coordinates: Coordinates[]) {
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  }

  // 경로 위 휴게소 조회 및 상세정보 통합 (누락된 메서드 추가)
  async getRestAreasWithDetailsOnRoute(
    routePath: Coordinates[], 
    bufferKm: number = 5
  ): Promise<RestArea[]> {
    try {
      console.log('🔥 경로 위 휴게소 상세정보 통합 조회 시작');
      
      // 1단계: 모든 휴게소 기준정보 조회
      const allRestAreas = await this.getRestAreas();
      console.log(`🔥 전체 휴게소 수: ${allRestAreas.length}개`);
      
      if (allRestAreas.length === 0) {
        console.log('🔥 휴게소 데이터가 없습니다.');
        return [];
      }
      
      // 2단계: 경로 근처의 휴게소만 필터링
      const nearbyRestAreas = await this.filterRestAreasByRoute(
        allRestAreas, 
        routePath, 
        bufferKm
      );
      console.log(`🔥 경로 근처 휴게소: ${nearbyRestAreas.length}개`);
      
      if (nearbyRestAreas.length === 0) {
        console.log('🔥 경로 근처에 휴게소가 없습니다.');
        return nearbyRestAreas;
      }
      
      // 3단계: 각 휴게소의 상세 정보 조회 (병렬 처리로 성능 최적화)
      const restAreasWithDetails = await Promise.allSettled(
        nearbyRestAreas.map(async (restArea) => {
          try {
            const detail = await this.getRestAreaDetail(restArea.id);
            
            return {
              ...restArea,
              detail: detail,
              foods: detail?.foods || [],
              facilities: detail?.facilities || restArea.facilities
            };
          } catch (error) {
            console.error(`휴게소 ${restArea.name} 상세정보 조회 실패:`, error);
            // 상세정보 조회 실패시에도 기본 정보는 포함
            return restArea;
          }
        })
      );
      
      // 성공한 결과만 추출
      const successfulResults = restAreasWithDetails
        .filter((result): result is PromiseFulfilledResult<RestArea> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
      
      console.log(`🔥 상세정보 포함 휴게소: ${successfulResults.length}개`);
      
      return successfulResults;
      
    } catch (error) {
      console.error('🔥 경로 위 휴게소 상세정보 통합 조회 실패:', error);
      return [];
    }
  }


}

export const highwayAPI = new HighwayAPI();