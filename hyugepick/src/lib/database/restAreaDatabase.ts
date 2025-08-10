import { Coordinates } from '@/types/map';
import { supabase } from '@/lib/supabase';

// 데이터베이스 타입 정의
interface RestAreaDB {
  id: string;
  unit_code: string;
  name: string;
  route_code?: string;
  route_name?: string;
  direction?: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  service_type?: string;
  operating_hours?: string;
  has_parking: boolean;
  has_toilet: boolean;
  has_gas_station: boolean;
  has_lpg_station: boolean;
  has_electric_charger: boolean;
  has_convenience_store: boolean;
  has_atm: boolean;
  has_restaurant: boolean;
  has_pharmacy: boolean;
  facilities?: any;
  source: 'highway_api' | 'scraping' | 'manual';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

interface SyncLog {
  id?: string;
  sync_type: 'full' | 'incremental' | 'scraping';
  source: 'highway_api' | 'web_scraping';
  status: 'started' | 'completed' | 'failed';
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_failed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export class RestAreaDatabase {
  // 휴게소 데이터 저장 또는 업데이트 (upsert)
  async upsertRestAreas(restAreas: RestAreaDB[]): Promise<{ inserted: number; updated: number; failed: number }> {
    let inserted = 0;
    let updated = 0;
    let failed = 0;

    console.log(`📦 DB에 ${restAreas.length}개 휴게소 저장 시작`);

    for (const restArea of restAreas) {
      try {
        // RestArea를 DB 형식으로 변환
        const dbData = this.convertToDBFormat(restArea);
        
        // 기존 데이터 확인
        const { data: existing } = await supabase
          .from('rest_areas')
          .select('id, updated_at')
          .eq('unit_code', dbData.unit_code)
          .single();

        if (existing) {
          // 업데이트
          const { error } = await supabase
            .from('rest_areas')
            .update({
              ...dbData,
              last_synced_at: new Date().toISOString()
            })
            .eq('unit_code', dbData.unit_code);

          if (error) throw error;
          updated++;
          console.log(`✅ 업데이트: ${restArea.name}`);
        } else {
          // 신규 삽입
          const { error } = await supabase
            .from('rest_areas')
            .insert({
              ...dbData,
              last_synced_at: new Date().toISOString()
            });

          if (error) throw error;
          inserted++;
          console.log(`✅ 신규 저장: ${restArea.name}`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ 저장 실패: ${restArea.name}`, error);
      }
    }

    console.log(`📦 DB 저장 완료: 신규 ${inserted}개, 업데이트 ${updated}개, 실패 ${failed}개`);
    return { inserted, updated, failed };
  }

  // RestArea를 DB 형식으로 변환
  private convertToDBFormat(restArea: RestAreaDB): Omit<RestAreaDB, 'id' | 'created_at' | 'updated_at'> {
    // 편의시설 파싱
    const facilitiesArray = Array.isArray(restArea.facilities) ? restArea.facilities : [];
    const facilitiesStr = facilitiesArray.join(',').toLowerCase();

    return {
      unit_code: restArea.unit_code,
      name: restArea.name,
      route_code: restArea.route_code,
      route_name: restArea.route_name || '',
      direction: restArea.direction,
      lat: restArea.lat,
      lng: restArea.lng,
      address: restArea.address,
      phone: restArea.phone,
      service_type: restArea.service_type || '휴게소',
      operating_hours: restArea.operating_hours || '24시간',
      has_parking: restArea.has_parking || facilitiesStr.includes('주차'),
      has_toilet: restArea.has_toilet || facilitiesStr.includes('화장실'),
      has_gas_station: restArea.has_gas_station || facilitiesStr.includes('주유소'),
      has_lpg_station: restArea.has_lpg_station || facilitiesStr.includes('lpg'),
      has_electric_charger: restArea.has_electric_charger || facilitiesStr.includes('충전') || facilitiesStr.includes('전기'),
      has_convenience_store: restArea.has_convenience_store || facilitiesStr.includes('편의점'),
      has_atm: restArea.has_atm || facilitiesStr.includes('atm') || facilitiesStr.includes('현금'),
      has_restaurant: restArea.has_restaurant || facilitiesStr.includes('식당') || facilitiesStr.includes('음식'),
      has_pharmacy: restArea.has_pharmacy || facilitiesStr.includes('약국'),
      facilities: facilitiesArray,
      source: restArea.source || 'highway_api',
      is_verified: restArea.is_verified !== undefined ? restArea.is_verified : true
    };
  }

  // DB에서 휴게소 데이터 조회
  async getRestAreas(filters?: {
    routeCode?: string;
    direction?: string;
    limit?: number;
  }): Promise<RestAreaDB[]> {
    try {
      let query = supabase
        .from('rest_areas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.routeCode) {
        query = query.eq('route_code', filters.routeCode);
      }
      if (filters?.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      // DB 형식을 RestArea 형식으로 변환
      return data as RestAreaDB[];
    } catch (error) {
      console.error('DB 조회 오류:', error);
      return [];
    }
  }

  // DB 형식을 그대로 반환 (RestAreaDB를 직접 사용)
  private convertFromDBFormat(dbItem: RestAreaDB): RestAreaDB {
    return dbItem;
  }

  // 경로 근처 휴게소 조회 (PostGIS 함수 사용)
  async findRestAreasNearRoute(
    routePath: Coordinates[], 
    bufferMeters: number = 500
  ): Promise<RestAreaDB[]> {
    try {
      // 경로를 WKT LineString 형식으로 변환
      const lineStringWKT = this.convertToLineStringWKT(routePath);
      
      // PostGIS 함수 호출
      const { data, error } = await supabase
        .rpc('find_rest_areas_near_route', {
          route_line: lineStringWKT,
          buffer_meters: bufferMeters
        });

      if (error) throw error;
      if (!data) return [];

      // 결과를 RestArea 형식으로 변환
      const restAreaIds = data.map((item: any) => item.unit_code);
      
      // 전체 정보 조회
      const { data: fullData, error: fullError } = await supabase
        .from('rest_areas')
        .select('*')
        .in('unit_code', restAreaIds);

      if (fullError) throw fullError;
      if (!fullData) return [];

      // 거리 정보 병합하여 반환
      return fullData.map((dbItem: RestAreaDB) => {
        const distanceInfo = data.find((d: any) => d.unit_code === dbItem.unit_code);
        const restArea = dbItem;
        
        if (distanceInfo) {
          (restArea as any).distanceFromRoute = distanceInfo.distance_meters / 1000; // km로 변환
        }
        
        return restArea;
      }).sort((a, b) => ((a as any).distanceFromRoute || 0) - ((b as any).distanceFromRoute || 0));

    } catch (error) {
      console.error('경로 근처 휴게소 조회 오류:', error);
      return [];
    }
  }

  // 좌표 배열을 WKT LineString 형식으로 변환
  private convertToLineStringWKT(coordinates: Coordinates[]): string {
    const points = coordinates.map(coord => `${coord.lng} ${coord.lat}`).join(', ');
    return `LINESTRING(${points})`;
  }

  // 가장 가까운 휴게소 조회
  async findNearestRestAreas(
    lat: number, 
    lng: number, 
    limit: number = 10,
    maxDistanceMeters: number = 50000
  ): Promise<RestAreaDB[]> {
    try {
      const { data, error } = await supabase
        .rpc('find_nearest_rest_areas', {
          point_lat: lat,
          point_lng: lng,
          limit_count: limit,
          max_distance_meters: maxDistanceMeters
        });

      if (error) throw error;
      if (!data) return [];

      // 전체 정보 조회
      const restAreaIds = data.map((item: any) => item.unit_code);
      
      const { data: fullData, error: fullError } = await supabase
        .from('rest_areas')
        .select('*')
        .in('unit_code', restAreaIds);

      if (fullError) throw fullError;
      if (!fullData) return [];

      // 거리 정보 병합하여 반환
      return fullData.map((dbItem: RestAreaDB) => {
        const distanceInfo = data.find((d: any) => d.unit_code === dbItem.unit_code);
        const restArea = dbItem;
        
        if (distanceInfo) {
          (restArea as any).distanceFromStart = distanceInfo.distance_meters / 1000; // km로 변환
        }
        
        return restArea;
      }).sort((a, b) => ((a as any).distanceFromStart || 0) - ((b as any).distanceFromStart || 0));

    } catch (error) {
      console.error('가까운 휴게소 조회 오류:', error);
      return [];
    }
  }

  // 동기화 로그 생성
  async createSyncLog(log: Omit<SyncLog, 'id' | 'started_at'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .insert({
          ...log,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('동기화 로그 생성 오류:', error);
      return null;
    }
  }

  // 동기화 로그 업데이트
  async updateSyncLog(
    logId: string, 
    updates: Partial<SyncLog>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .update({
          ...updates,
          completed_at: updates.status === 'completed' || updates.status === 'failed' 
            ? new Date().toISOString() 
            : undefined
        })
        .eq('id', logId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('동기화 로그 업데이트 오류:', error);
      return false;
    }
  }

  // 마지막 동기화 시간 조회
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return new Date(data.completed_at);
    } catch (error) {
      console.error('마지막 동기화 시간 조회 오류:', error);
      return null;
    }
  }

  // 데이터베이스 초기화 체크
  async checkDatabaseReady(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('rest_areas')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('DB 연결 오류:', error);
        return false;
      }

      console.log(`✅ DB 연결 성공: ${count || 0}개 휴게소 데이터 존재`);
      return true;
    } catch (error) {
      console.error('DB 체크 오류:', error);
      return false;
    }
  }
}