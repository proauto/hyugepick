import { RestArea } from '@/types/map';
import { createClient } from '@supabase/supabase-js';

// 스크래핑 클래스 내부에서만 Supabase 클라이언트 사용

export interface ScrapingResult {
  source: string;
  restAreas: RestArea[];
  success: boolean;
  error?: string;
  executionTime: number;
  itemsFound: number;
}

export class RestAreaScraper {
  private readonly knownMissingRestAreas = [
    // 확인된 누락 휴게소들
    {
      name: '청도새마을휴게소',
      highway: '대구부산고속도로',
      direction: '부산방향',
      estimatedLat: 35.6500,
      estimatedLng: 128.7300,
      operator: '민자'
    },
    {
      name: '청도새마을휴게소',
      highway: '대구부산고속도로', 
      direction: '대구방향',
      estimatedLat: 35.6520,
      estimatedLng: 128.7280,
      operator: '민자'
    },
    {
      name: '정안알밤휴게소',
      highway: '천안논산고속도로',
      direction: '논산방향',
      estimatedLat: 36.4500,
      estimatedLng: 127.1500,
      operator: '민자'
    },
    {
      name: '정안알밤휴게소',
      highway: '천안논산고속도로',
      direction: '천안방향', 
      estimatedLat: 36.4520,
      estimatedLng: 127.1480,
      operator: '민자'
    },
    {
      name: '가평휴게소',
      highway: '서울양양고속도로',
      direction: '양양방향',
      estimatedLat: 37.8300,
      estimatedLng: 127.5100,
      operator: '민자'
    },
    {
      name: '가평휴게소',
      highway: '서울양양고속도로',
      direction: '서울방향',
      estimatedLat: 37.8280,
      estimatedLng: 127.5120,
      operator: '민자'
    },
    {
      name: '고양휴게소',
      highway: '서울양양고속도로',
      direction: '양양방향',
      estimatedLat: 37.7100,
      estimatedLng: 126.9500,
      operator: '민자'
    },
    {
      name: '고양휴게소',
      highway: '서울양양고속도로',
      direction: '서울방향',
      estimatedLat: 37.7120,
      estimatedLng: 126.9480,
      operator: '민자'
    }
  ];

  // 1. 카카오 지도 API로 휴게소 검색
  async searchWithKakaoAPI(): Promise<ScrapingResult> {
    const startTime = Date.now();
    const foundRestAreas: RestArea[] = [];

    try {
      console.log('🔍 카카오 지도 API로 휴게소 검색 시작...');

      const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
      if (!kakaoApiKey) {
        throw new Error('Kakao REST API Key가 설정되지 않았습니다.');
      }

      // 누락된 휴게소들을 각각 검색
      for (const missingRA of this.knownMissingRestAreas) {
        try {
          console.log(`🔎 "${missingRA.name}" 검색 중...`);

          const searchQuery = `${missingRA.name} ${missingRA.highway}`;
          const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchQuery)}&category_group_code=OL7`,
            {
              headers: {
                'Authorization': `KakaoAK ${kakaoApiKey}`
              }
            }
          );

          if (!response.ok) {
            console.error(`❌ ${missingRA.name} 검색 실패: ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          if (data.documents && data.documents.length > 0) {
            for (const place of data.documents) {
              // 검색 결과가 실제로 우리가 찾는 휴게소인지 검증
              if (this.isRelevantRestArea(place, missingRA)) {
                const restArea: RestArea = {
                  id: `kakao_${place.id}`,
                  name: this.cleanRestAreaName(place.place_name),
                  coordinates: {
                    lat: parseFloat(place.y),
                    lng: parseFloat(place.x)
                  },
                  routeCode: this.guessRouteCode(missingRA.highway),
                  routeName: missingRA.highway,
                  direction: missingRA.direction,
                  address: place.address_name || '',
                  phoneNumber: place.phone || '',
                  facilities: ['화장실', '주차장'],
                  operatingHours: '24시간',
                  serviceType: '휴게소'
                };

                foundRestAreas.push(restArea);
                console.log(`✅ 발견: ${restArea.name} (${restArea.coordinates.lat}, ${restArea.coordinates.lng})`);
              }
            }
          } else {
            console.log(`⚠️ "${missingRA.name}" 검색 결과 없음`);
          }

          // API 호출 제한을 위한 대기
          await this.delay(500);

        } catch (error) {
          console.error(`❌ ${missingRA.name} 검색 중 오류:`, error);
        }
      }

      const executionTime = Date.now() - startTime;
      console.log(`🔍 카카오 검색 완료: ${foundRestAreas.length}개 발견 (${executionTime}ms)`);

      return {
        source: 'kakao_api',
        restAreas: foundRestAreas,
        success: true,
        executionTime,
        itemsFound: foundRestAreas.length
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ 카카오 검색 실패:', error);
      
      return {
        source: 'kakao_api',
        restAreas: [],
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        executionTime,
        itemsFound: 0
      };
    }
  }

  // 2. 공공데이터포털 표준데이터 조회
  async fetchPublicData(): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      console.log('🏛️ 공공데이터포털 표준데이터 조회 시작...');

      // 공공데이터포털의 전국휴게소정보표준데이터 API
      // 실제 구현 시에는 해당 API 키와 엔드포인트 필요
      const publicDataApiKey = process.env.PUBLIC_DATA_API_KEY;
      
      if (!publicDataApiKey) {
        console.log('⚠️ 공공데이터포털 API 키가 설정되지 않았습니다.');
        return {
          source: 'public_data',
          restAreas: [],
          success: false,
          error: 'API 키 없음',
          executionTime: Date.now() - startTime,
          itemsFound: 0
        };
      }

      // TODO: 실제 공공데이터포털 API 호출 구현
      // 현재는 플레이스홀더
      console.log('📝 공공데이터포털 API 구현 예정');

      return {
        source: 'public_data',
        restAreas: [],
        success: true,
        executionTime: Date.now() - startTime,
        itemsFound: 0
      };

    } catch (error) {
      return {
        source: 'public_data',
        restAreas: [],
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        executionTime: Date.now() - startTime,
        itemsFound: 0
      };
    }
  }

  // 3. 알려진 누락 휴게소 직접 추가
  async addKnownMissingRestAreas(): Promise<ScrapingResult> {
    const startTime = Date.now();

    try {
      console.log('📝 알려진 누락 휴게소 직접 추가...');

      const restAreas: RestArea[] = this.knownMissingRestAreas.map((missing, index) => ({
        id: `manual_${index + 1}`,
        name: missing.name,
        coordinates: {
          lat: missing.estimatedLat,
          lng: missing.estimatedLng
        },
        routeCode: this.guessRouteCode(missing.highway),
        routeName: missing.highway,
        direction: missing.direction,
        address: `${missing.highway} 상의 휴게소`,
        phoneNumber: '',
        facilities: ['화장실', '주차장', '편의점'],
        operatingHours: '24시간',
        serviceType: '휴게소'
      }));

      console.log(`📝 ${restAreas.length}개 누락 휴게소 추가 완료`);

      return {
        source: 'manual_data',
        restAreas,
        success: true,
        executionTime: Date.now() - startTime,
        itemsFound: restAreas.length
      };

    } catch (error) {
      return {
        source: 'manual_data',
        restAreas: [],
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        executionTime: Date.now() - startTime,
        itemsFound: 0
      };
    }
  }

  // 검색 결과가 관련 있는 휴게소인지 검증
  private isRelevantRestArea(place: any, target: any): boolean {
    const placeName = place.place_name.toLowerCase();
    const targetName = target.name.toLowerCase();

    // 이름이 포함되어 있는지 확인
    const nameMatch = placeName.includes(targetName.replace('휴게소', '')) ||
                     targetName.includes(placeName.replace('휴게소', ''));

    // 카테고리 확인 (휴게소, 졸음쉼터, 주유소 등)
    const relevantCategories = ['휴게소', '주유소', '졸음쉼터', '쉼터'];
    const categoryMatch = relevantCategories.some(cat => placeName.includes(cat));

    // 위치 근접성 확인 (추정 좌표에서 5km 이내)
    const distance = this.calculateDistance(
      { lat: parseFloat(place.y), lng: parseFloat(place.x) },
      { lat: target.estimatedLat, lng: target.estimatedLng }
    );
    const locationMatch = distance < 5; // 5km 이내

    return nameMatch && categoryMatch && locationMatch;
  }

  // 휴게소명 정규화
  private cleanRestAreaName(name: string): string {
    return name
      .replace(/\(.*?\)/g, '') // 괄호 제거
      .replace(/주유소|졸음쉼터/g, '') // 불필요한 키워드 제거
      .replace(/\s+/g, '') // 공백 제거
      .trim();
  }

  // 고속도로명으로 노선코드 추정
  private guessRouteCode(highwayName: string): string {
    const mappings: { [key: string]: string } = {
      '경부고속도로': '0010',
      '대구부산고속도로': '0550', // 중앙고속도로 연장선
      '천안논산고속도로': '0300', // 중부고속도로 계열
      '서울양양고속도로': '0060', // 영동고속도로 계열
      '인천대교연결도로': '0130'
    };

    for (const [highway, code] of Object.entries(mappings)) {
      if (highwayName.includes(highway.replace('고속도로', ''))) {
        return code;
      }
    }

    return '9999'; // 기타
  }

  // 거리 계산 (km)
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 지연 함수
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 중복 검사 (Supabase 클라이언트를 매개변수로 받음)
  async checkForDuplicates(newRestArea: RestArea, supabase: any): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('find_duplicate_rest_areas', {
          name_to_check: newRestArea.name,
          lat_to_check: newRestArea.coordinates.lat,
          lng_to_check: newRestArea.coordinates.lng,
          distance_threshold_meters: 500
        });

      if (error) {
        console.error('중복 검사 오류:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('중복 검사 실행 오류:', error);
      return false;
    }
  }

  // 스크래핑 결과를 데이터베이스에 저장 (Supabase 클라이언트를 매개변수로 받음)
  async saveScrapingResults(results: ScrapingResult[], supabase: any): Promise<{
    inserted: number;
    skipped: number;
    errors: number;
  }> {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const result of results) {
      if (!result.success || result.restAreas.length === 0) {
        continue;
      }

      for (const restArea of result.restAreas) {
        try {
          // 중복 검사
          const isDuplicate = await this.checkForDuplicates(restArea, supabase);
          
          if (isDuplicate) {
            console.log(`⚠️ 중복 스킵: ${restArea.name}`);
            skipped++;
            continue;
          }

          // DB에 저장
          const dbData = {
            unit_code: restArea.id,
            name: restArea.name,
            route_code: restArea.routeCode,
            route_name: restArea.routeName,
            direction: restArea.direction,
            lat: restArea.coordinates.lat,
            lng: restArea.coordinates.lng,
            address: restArea.address,
            phone: restArea.phoneNumber,
            service_type: restArea.serviceType,
            operating_hours: restArea.operatingHours,
            facilities: restArea.facilities,
            source: result.source,
            is_verified: false,
            data_sources: [result.source],
            highway_operator: '민자',
            confidence_score: 0.7, // 스크래핑 데이터는 0.7
            last_synced_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('rest_areas')
            .insert(dbData);

          if (error) throw error;

          inserted++;
          console.log(`✅ 저장: ${restArea.name} (${result.source})`);

        } catch (error) {
          console.error(`❌ 저장 실패: ${restArea.name}`, error);
          errors++;
        }
      }
    }

    return { inserted, skipped, errors };
  }
}

export const restAreaScraper = new RestAreaScraper();