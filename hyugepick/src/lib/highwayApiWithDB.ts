import { RestArea, RestFood, Coordinates, RestAreaDetail, RestFacility } from '@/types/map';
import { RestAreaDatabase } from './database/restAreaDatabase';
import { restAreaSyncService } from './database/restAreaSyncService';
import { highwayAPI } from './highwayApi';

// DB 우선 사용하는 개선된 HighwayAPI 클래스
export class HighwayAPIWithDB {
  private db: RestAreaDatabase;
  private fallbackAPI = highwayAPI; // 기존 API를 폴백으로 사용

  constructor() {
    this.db = new RestAreaDatabase();
    // 초기화 시 DB 체크 및 자동 동기화 시작
    this.initialize();
  }

  private async initialize() {
    try {
      // DB 상태 확인
      const status = await restAreaSyncService.checkDatabaseStatus();
      
      console.log('📊 DB 상태:', {
        준비됨: status.isReady,
        휴게소수: status.totalCount,
        마지막동기화: status.lastSyncTime?.toLocaleString() || '없음',
        동기화필요: status.needsSync
      });

      // DB에 데이터가 없거나 동기화가 필요한 경우
      if (!status.isReady || status.totalCount === 0 || status.needsSync) {
        console.log('🔄 초기 데이터 동기화 시작...');
        await restAreaSyncService.fullSync();
      }

      // 자동 동기화 시작 (1주일 주기)
      restAreaSyncService.startAutoSync(24 * 7);
      
    } catch (error) {
      console.error('❌ DB 초기화 실패:', error);
    }
  }

  // 1. 휴게소 기준정보 조회 - DB 우선, 실패시 API 직접 호출
  async getRestAreas(): Promise<RestArea[]> {
    try {
      console.log('🗄️ DB에서 휴게소 정보 조회 시작...');
      
      // 먼저 DB에서 조회
      const restAreas = await this.db.getRestAreas();
      
      if (restAreas && restAreas.length > 0) {
        console.log(`✅ DB에서 ${restAreas.length}개 휴게소 조회 성공`);
        return restAreas;
      }
      
      console.log('⚠️ DB에 데이터가 없습니다. API 직접 호출...');
      
    } catch (error) {
      console.error('❌ DB 조회 실패:', error);
    }

    // DB 조회 실패시 API 직접 호출
    console.log('📡 API 직접 호출 (폴백)...');
    const apiRestAreas = await this.fallbackAPI.getRestAreas();
    
    // API 데이터를 DB에 저장 (비동기로 백그라운드 실행)
    if (apiRestAreas.length > 0) {
      this.saveToDBInBackground(apiRestAreas);
    }
    
    return apiRestAreas;
  }

  // 2. 경로 근처 휴게소 조회 - PostGIS 함수 활용
  async getRestAreasNearRoute(
    routePath: Coordinates[], 
    bufferKm: number = 0.5
  ): Promise<RestArea[]> {
    try {
      console.log('🗄️ DB에서 경로 근처 휴게소 조회...');
      
      // PostGIS 함수를 사용한 효율적인 조회
      const restAreas = await this.db.findRestAreasNearRoute(
        routePath, 
        bufferKm * 1000 // km를 미터로 변환
      );
      
      if (restAreas && restAreas.length > 0) {
        console.log(`✅ DB에서 ${restAreas.length}개 경로 근처 휴게소 조회 성공`);
        return restAreas;
      }
      
      console.log('⚠️ DB 조회 결과가 없습니다.');
      
    } catch (error) {
      console.error('❌ DB 경로 조회 실패:', error);
    }

    // DB 조회 실패시 기존 로직 사용
    console.log('📡 기존 알고리즘으로 필터링 (폴백)...');
    const allRestAreas = await this.getRestAreas();
    return this.fallbackAPI.filterRestAreasByRoute(allRestAreas, routePath, bufferKm);
  }

  // 3. 고속도로 구간 기반 휴게소 조회
  async getRestAreasOnHighwaySegments(
    highwaySegments: any[], 
    routePath: Coordinates[]
  ): Promise<RestArea[]> {
    try {
      // 먼저 경로 근처 휴게소 조회 (DB 사용)
      const nearbyRestAreas = await this.getRestAreasNearRoute(routePath, 0.5);
      
      if (nearbyRestAreas.length > 0) {
        // 고속도로 구간과 방향성 필터링
        const filteredRestAreas = this.filterByHighwaySegments(
          nearbyRestAreas, 
          highwaySegments, 
          routePath
        );
        
        console.log(`✅ ${filteredRestAreas.length}개 휴게소 최종 선택`);
        return filteredRestAreas;
      }
      
    } catch (error) {
      console.error('❌ 고속도로 구간 조회 실패:', error);
    }

    // 폴백: 기존 API 로직 사용
    return this.fallbackAPI.getRestAreasOnHighwaySegments(highwaySegments, routePath);
  }

  // 4. 가장 가까운 휴게소 조회
  async getNearestRestAreas(
    lat: number, 
    lng: number, 
    limit: number = 10
  ): Promise<RestArea[]> {
    try {
      console.log('🗄️ DB에서 가까운 휴게소 조회...');
      
      const restAreas = await this.db.findNearestRestAreas(lat, lng, limit);
      
      if (restAreas && restAreas.length > 0) {
        console.log(`✅ DB에서 ${restAreas.length}개 가까운 휴게소 조회 성공`);
        return restAreas;
      }
      
    } catch (error) {
      console.error('❌ DB 가까운 휴게소 조회 실패:', error);
    }

    // 폴백: 전체 조회 후 거리 계산
    console.log('📡 전체 조회 후 거리 계산 (폴백)...');
    const allRestAreas = await this.getRestAreas();
    return this.calculateNearestRestAreas(allRestAreas, { lat, lng }, limit);
  }

  // 5. 휴게소 상세 정보 조회 (음식점, 편의시설)
  async getRestAreaDetail(restAreaCode: string): Promise<RestAreaDetail | null> {
    // 상세 정보는 아직 DB에 저장하지 않으므로 API 직접 호출
    return this.fallbackAPI.getRestAreaDetail(restAreaCode);
  }

  // 백그라운드에서 DB에 저장
  private async saveToDBInBackground(restAreas: RestArea[]): Promise<void> {
    try {
      console.log('💾 백그라운드에서 DB 저장 시작...');
      const result = await this.db.upsertRestAreas(restAreas);
      console.log(`💾 DB 저장 완료: 신규 ${result.inserted}개, 업데이트 ${result.updated}개`);
    } catch (error) {
      console.error('💾 백그라운드 DB 저장 실패:', error);
    }
  }

  // 고속도로 구간으로 필터링
  private filterByHighwaySegments(
    restAreas: RestArea[], 
    highwaySegments: any[], 
    routePath: Coordinates[]
  ): RestArea[] {
    // 노선 코드 매핑
    const routeCodes = new Set<string>();
    highwaySegments.forEach(segment => {
      const routeCode = this.mapHighwayNameToRouteCode(segment.name);
      if (routeCode) routeCodes.add(routeCode);
    });

    // 방향성 판단
    const direction = this.calculateRouteDirection(routePath);

    // 필터링
    return restAreas.filter(restArea => {
      // 노선 코드 확인
      const isCorrectRoute = !restArea.routeCode || 
                            routeCodes.has(restArea.routeCode);
      
      // 방향성 확인
      const isCorrectDirection = this.checkDirection(restArea, direction);
      
      return isCorrectRoute && isCorrectDirection;
    });
  }

  // 고속도로명을 노선 코드로 매핑
  private mapHighwayNameToRouteCode(highwayName: string): string | null {
    const mappings: { [key: string]: string } = {
      '경부고속도로': '0010',
      '영동고속도로': '0300',
      '중부내륙고속도로': '0300',
      '호남고속도로': '0251',
      '남해고속도로': '0100',
      '서해안고속도로': '0150',
      '중부고속도로': '0300',
      '중앙고속도로': '0550'
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (highwayName.includes(key.replace('고속도로', ''))) {
        return value;
      }
    }
    
    return null;
  }

  // 경로 방향 계산
  private calculateRouteDirection(routePath: Coordinates[]): 'up' | 'down' {
    const startLat = routePath[0].lat;
    const endLat = routePath[routePath.length - 1].lat;
    return endLat < startLat ? 'down' : 'up';
  }

  // 방향성 체크
  private checkDirection(restArea: RestArea, direction: 'up' | 'down'): boolean {
    if (!restArea.direction) return true;
    
    const restAreaDir = restArea.direction.toLowerCase();
    
    if (direction === 'down') {
      return restAreaDir.includes('부산') || 
             restAreaDir.includes('하행') || 
             restAreaDir.includes('남');
    } else {
      return restAreaDir.includes('서울') || 
             restAreaDir.includes('상행') || 
             restAreaDir.includes('북');
    }
  }

  // 가장 가까운 휴게소 계산
  private calculateNearestRestAreas(
    restAreas: RestArea[], 
    point: Coordinates, 
    limit: number
  ): RestArea[] {
    const restAreasWithDistance = restAreas.map(restArea => ({
      ...restArea,
      distance: this.calculateDistance(restArea.coordinates, point)
    }));

    return restAreasWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(({ distance, ...restArea }) => restArea);
  }

  // 두 좌표 간 거리 계산 (km)
  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371;
    const dLat = this.deg2rad(point2.lat - point1.lat);
    const dLng = this.deg2rad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // 수동 동기화 트리거
  async syncNow(): Promise<boolean> {
    try {
      console.log('🔄 수동 동기화 시작...');
      const result = await restAreaSyncService.incrementalSync();
      return result.success;
    } catch (error) {
      console.error('❌ 수동 동기화 실패:', error);
      return false;
    }
  }

  // DB 상태 조회
  async getDatabaseStatus() {
    return restAreaSyncService.checkDatabaseStatus();
  }
}

// 싱글톤 인스턴스
export const highwayAPIWithDB = new HighwayAPIWithDB();