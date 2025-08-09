/**
 * 인터체인지(IC) 데이터 서비스
 * 한국도로공사 API를 통해 IC 정보를 수집하고 관리
 */

import { supabase } from './supabase';

// IC 데이터 타입 정의
export interface Interchange {
  id: string;
  name: string;                  // IC명
  route_name: string;            // 노선명 (예: 경부선)
  route_no: string;              // 노선번호 (예: 0010)
  direction: string;             // 방향 (상행/하행)
  weight: number;                // 가중치/순서 (거리 기반)
  distance_from_start: number;   // 시점으로부터 거리 (km)
  coordinates: {
    lat: number;
    lng: number;
  };
  adjacent_ics?: {              // 인접 IC 정보
    prev_ic?: string;
    next_ic?: string;
  };
  created_at?: string;
  updated_at?: string;
}

// API 응답 타입 (한국도로공사 IC API 구조)
interface ICApiResponse {
  count: number;
  code: string;
  message: string;
  list: Array<{
    unitCode: string;           // IC 코드
    unitName: string;           // IC명  
    routeCode: string;          // 노선코드
    routeName: string;          // 노선명
    xValue: string;             // 경도 (X좌표)
    yValue: string;             // 위도 (Y좌표)
    startValue?: string;        // 시점으로부터 거리(km)
    [key: string]: string | undefined;         // 기타 필드
  }>;
}

export class InterchangeService {
  private readonly API_KEY = process.env.NEXT_PUBLIC_HIGHWAY_API_KEY || '';
  private readonly API_URL = 'https://data.ex.co.kr/openapi/locationinfo/locationinfoIc';
  
  /**
   * 한국도로공사 API에서 IC 데이터 가져오기
   */
  async fetchInterchangeData(): Promise<Interchange[]> {
    console.log('🔄 IC 데이터 가져오기 시작...');
    console.log(`🔑 API 키 확인: ${this.API_KEY ? '설정됨' : '없음'}`);
    
    if (!this.API_KEY) {
      throw new Error('NEXT_PUBLIC_HIGHWAY_API_KEY가 설정되지 않았습니다.');
    }
    
    try {
      const allICs: any[] = [];
      let pageNo = 1;
      const numOfRows = 100;
      let hasMoreData = true;

      while (hasMoreData) {
        const params = new URLSearchParams({
          key: this.API_KEY,
          type: 'json',
          numOfRows: numOfRows.toString(),
          pageNo: pageNo.toString()
        });
        
        const apiUrl = `${this.API_URL}?${params.toString()}`;
        console.log(`📄 페이지 ${pageNo} 요청: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status} - ${response.statusText}`);
        }
        
        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON 파싱 실패:', responseText.substring(0, 200));
          throw new Error('API 응답 파싱 실패');
        }
        
        console.log(`📊 페이지 ${pageNo} 응답:`, {
          count: data.count,
          listLength: data.list?.length,
          code: data.code,
          message: data.message
        });
        
        if (!data.list || data.list.length === 0) {
          console.log(`페이지 ${pageNo}: 더 이상 데이터가 없습니다.`);
          hasMoreData = false;
          break;
        }
        
        allICs.push(...data.list);
        console.log(`✅ 페이지 ${pageNo}: ${data.list.length}개 수집, 총 ${allICs.length}개`);
        
        // 최대 페이지 제한 (무한 루프 방지)
        if (pageNo >= 50 || data.list.length < numOfRows) {
          hasMoreData = false;
        }
        
        pageNo++;
      }
      
      console.log(`🎉 전체 IC 데이터 수집 완료: ${allICs.length}개`);
      
      // 데이터 변환 및 가중치 계산
      return this.processICData(allICs);
      
    } catch (error) {
      console.error('❌ IC 데이터 가져오기 실패:', error);
      throw error;
    }
  }
  
  /**
   * API 데이터를 Interchange 형식으로 변환
   */
  private processICData(apiData: ICApiResponse['list']): Interchange[] {
    // 노선별로 그룹화
    const routeGroups = new Map<string, typeof apiData>();
    
    apiData.forEach(ic => {
      const key = `${ic.routeCode}`;
      if (!routeGroups.has(key)) {
        routeGroups.set(key, []);
      }
      routeGroups.get(key)!.push(ic);
    });
    
    const interchanges: Interchange[] = [];
    
    // 각 노선별로 가중치 계산
    routeGroups.forEach((ics, routeKey) => {
      // 거리순으로 정렬
      const sortedICs = ics.sort((a, b) => {
        const aDistance = parseFloat(a.startValue || '0');
        const bDistance = parseFloat(b.startValue || '0');
        return aDistance - bDistance;
      });
      
      sortedICs.forEach((ic, index) => {
        const coordinates = {
          lat: parseFloat(ic.yValue) || 0,
          lng: parseFloat(ic.xValue) || 0
        };
        
        // 유효한 좌표인지 확인 (한국 영토 범위)
        if (coordinates.lat === 0 || coordinates.lng === 0 || 
            coordinates.lat < 33 || coordinates.lat > 39 ||
            coordinates.lng < 125 || coordinates.lng > 132) {
          console.warn(`잘못된 좌표 제외: ${ic.unitName} (${coordinates.lat}, ${coordinates.lng})`);
          return;
        }
        
        const distance = parseFloat(ic.startValue || '0');
        
        // 상행/하행 구분을 위해 두 개 생성
        ['UP', 'DOWN'].forEach(direction => {
          interchanges.push({
            id: `${ic.unitCode}_${direction}`,
            name: ic.unitName,
            route_name: this.normalizeRouteName(ic.routeName),
            route_no: ic.routeCode,
            direction: direction,
            weight: direction === 'DOWN' ? index + 1 : sortedICs.length - index, // 하행은 순차, 상행은 역순
            distance_from_start: distance,
            coordinates,
            adjacent_ics: {
              prev_ic: index > 0 ? sortedICs[index - 1].unitCode : undefined,
              next_ic: index < sortedICs.length - 1 ? sortedICs[index + 1].unitCode : undefined
            }
          });
        });
      });
    });
    
    return interchanges;
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
   * 방향 정보 정규화
   */
  private normalizeDirection(direction: string): string {
    const normalized = direction.toLowerCase().trim();
    
    if (normalized.includes('상행') || normalized.includes('북') || normalized.includes('서울')) {
      return 'UP';
    } else if (normalized.includes('하행') || normalized.includes('남') || normalized.includes('부산')) {
      return 'DOWN';
    } else if (normalized.includes('양방향') || normalized.includes('양')) {
      return 'BOTH';
    }
    
    return 'UNKNOWN';
  }
  
  /**
   * Supabase DB에 IC 데이터 저장/업데이트
   */
  async syncToDatabase(interchanges: Interchange[]): Promise<void> {
    console.log('📊 IC 데이터 DB 동기화 시작...');
    
    try {
      // 기존 데이터 삭제 (전체 갱신)
      const { error: deleteError } = await supabase
        .from('interchanges')
        .delete()
        .neq('id', '');  // 모든 행 삭제
      
      if (deleteError) {
        console.error('기존 IC 데이터 삭제 실패:', deleteError);
      }
      
      // 배치 삽입 (500개씩)
      const batchSize = 500;
      for (let i = 0; i < interchanges.length; i += batchSize) {
        const batch = interchanges.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('interchanges')
          .insert(batch.map(ic => ({
            id: ic.id,
            name: ic.name,
            route_name: ic.route_name,
            route_no: ic.route_no,
            direction: ic.direction,
            weight: ic.weight,
            distance_from_start: ic.distance_from_start,
            coordinates: `POINT(${ic.coordinates.lng} ${ic.coordinates.lat})`,
            lat: ic.coordinates.lat,
            lng: ic.coordinates.lng,
            prev_ic: ic.adjacent_ics?.prev_ic,
            next_ic: ic.adjacent_ics?.next_ic,
            updated_at: new Date().toISOString()
          })));
        
        if (error) {
          console.error(`배치 ${i / batchSize + 1} 삽입 실패:`, error);
        } else {
          console.log(`✅ 배치 ${i / batchSize + 1} 완료 (${batch.length}개)`);
        }
      }
      
      console.log(`✅ 총 ${interchanges.length}개 IC 데이터 동기화 완료`);
      
    } catch (error) {
      console.error('❌ DB 동기화 실패:', error);
      throw error;
    }
  }
  
  /**
   * 특정 경로와 노선에서 방향 판단 (Reference 알고리즘 포팅)
   */
  async getDirectionByRoute(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    routeName: string
  ): Promise<'UP' | 'DOWN' | 'BOTH' | 'UNKNOWN'> {
    
    try {
      // 경로 근처의 IC 찾기 (300m 반경)
      const nearbyICs = await this.findNearbyInterchanges(
        routeCoordinates,
        routeName,
        300
      );
      
      if (nearbyICs.length < 2) {
        console.warn(`IC 부족: ${routeName}에서 ${nearbyICs.length}개만 발견`);
        return 'UNKNOWN';
      }
      
      // 시작과 끝 IC의 weight 비교
      const startIC = nearbyICs[0];
      const endIC = nearbyICs[nearbyICs.length - 1];
      
      const weightDiff = startIC.weight - endIC.weight;
      
      console.log(`🧭 방향 판단: ${routeName}`);
      console.log(`  시작 IC: ${startIC.name} (weight: ${startIC.weight})`);
      console.log(`  종료 IC: ${endIC.name} (weight: ${endIC.weight})`);
      console.log(`  방향: ${weightDiff > 0 ? 'UP(상행)' : 'DOWN(하행)'}`);
      
      return weightDiff > 0 ? 'UP' : 'DOWN';
      
    } catch (error) {
      console.error('방향 판단 실패:', error);
      return 'UNKNOWN';
    }
  }
  
  /**
   * 경로 근처의 IC 찾기
   */
  private async findNearbyInterchanges(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    routeName: string,
    radiusMeters: number
  ): Promise<Interchange[]> {
    
    const nearbyICs: Interchange[] = [];
    const processedICIds = new Set<string>();
    
    // 경로의 여러 지점에서 IC 검색
    const samplePoints = this.sampleRoutePoints(routeCoordinates, 10);
    
    for (const point of samplePoints) {
      // Supabase에서 근처 IC 조회
      const { data, error } = await supabase
        .from('interchanges')
        .select('*')
        .eq('route_name', routeName)
        .gte('lat', point.lat - (radiusMeters / 111000))  // 대략적인 위도 범위
        .lte('lat', point.lat + (radiusMeters / 111000))
        .gte('lng', point.lng - (radiusMeters / 111000))
        .lte('lng', point.lng + (radiusMeters / 111000));
      
      if (error) {
        console.error('IC 조회 실패:', error);
        continue;
      }
      
      // 정확한 거리 계산 및 필터링
      data?.forEach(ic => {
        if (!processedICIds.has(ic.id)) {
          const distance = this.calculateDistance(
            point,
            { lat: ic.lat, lng: ic.lng }
          );
          
          if (distance <= radiusMeters) {
            processedICIds.add(ic.id);
            nearbyICs.push({
              id: ic.id,
              name: ic.name,
              route_name: ic.route_name,
              route_no: ic.route_no,
              direction: ic.direction,
              weight: ic.weight,
              distance_from_start: ic.distance_from_start,
              coordinates: { lat: ic.lat, lng: ic.lng },
              adjacent_ics: {
                prev_ic: ic.prev_ic,
                next_ic: ic.next_ic
              }
            });
          }
        }
      });
    }
    
    // 경로 순서대로 정렬
    return this.sortICsByRouteOrder(nearbyICs, routeCoordinates);
  }
  
  /**
   * 경로에서 샘플 포인트 추출
   */
  private sampleRoutePoints(
    coordinates: Array<{ lat: number; lng: number }>,
    sampleCount: number
  ): Array<{ lat: number; lng: number }> {
    
    if (coordinates.length <= sampleCount) {
      return coordinates;
    }
    
    const samples: Array<{ lat: number; lng: number }> = [];
    const step = Math.floor(coordinates.length / sampleCount);
    
    for (let i = 0; i < coordinates.length; i += step) {
      samples.push(coordinates[i]);
    }
    
    // 마지막 포인트 포함
    if (samples[samples.length - 1] !== coordinates[coordinates.length - 1]) {
      samples.push(coordinates[coordinates.length - 1]);
    }
    
    return samples;
  }
  
  /**
   * IC를 경로 순서대로 정렬
   */
  private sortICsByRouteOrder(
    ics: Interchange[],
    routeCoordinates: Array<{ lat: number; lng: number }>
  ): Interchange[] {
    
    return ics.sort((a, b) => {
      const aIndex = this.findClosestRouteIndex(a.coordinates, routeCoordinates);
      const bIndex = this.findClosestRouteIndex(b.coordinates, routeCoordinates);
      return aIndex - bIndex;
    });
  }
  
  /**
   * IC와 가장 가까운 경로 인덱스 찾기
   */
  private findClosestRouteIndex(
    icCoord: { lat: number; lng: number },
    routeCoordinates: Array<{ lat: number; lng: number }>
  ): number {
    
    let minDistance = Infinity;
    let closestIndex = 0;
    
    routeCoordinates.forEach((coord, index) => {
      const distance = this.calculateDistance(icCoord, coord);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }
  
  /**
   * 두 지점 간 거리 계산 (미터)
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
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
   * 전체 동기화 프로세스 실행
   */
  async fullSync(): Promise<void> {
    console.log('🚀 IC 데이터 전체 동기화 시작...');
    
    try {
      // 1. API에서 데이터 가져오기
      const interchanges = await this.fetchInterchangeData();
      
      // 2. DB에 저장
      await this.syncToDatabase(interchanges);
      
      // 3. 동기화 로그 저장
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'INTERCHANGE',
          total_count: interchanges.length,
          status: 'SUCCESS',
          synced_at: new Date().toISOString()
        });
      
      console.log('✅ IC 데이터 전체 동기화 완료');
      
    } catch (error) {
      console.error('❌ IC 데이터 동기화 실패:', error);
      
      // 실패 로그 저장
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'INTERCHANGE',
          status: 'FAILED',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          synced_at: new Date().toISOString()
        });
      
      throw error;
    }
  }
}

export const interchangeService = new InterchangeService();