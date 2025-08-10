#!/usr/bin/env node

/**
 * IC(인터체인지) 데이터 동기화 스크립트
 * 한국도로공사 API에서 IC 데이터를 가져와 Supabase에 저장
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apiKey = process.env.NEXT_PUBLIC_DATA_GO_KR_API_KEY || process.env.NEXT_PUBLIC_HIGHWAY_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

if (!apiKey) {
  console.warn('⚠️ 공공데이터 API 키가 설정되지 않았습니다.');
  console.log('💡 모의 데이터를 사용하여 진행합니다.');
  // API 키 없이도 진행 (모의 데이터 사용)
}

const supabase = createClient(supabaseUrl, supabaseKey);

// IC 데이터 타입 (실제 한국도로공사 IC API 응답 구조)
interface ICData {
  icCode: string;      // IC 코드
  icName: string;      // IC 이름
  routeNo: string;     // 노선 번호
  routeName: string;   // 노선 이름
  xValue: string;      // 경도
  yValue: string;      // 위도
}

interface ProcessedIC {
  id: string;
  name: string;
  route_name: string;
  route_no: string;
  direction: string;
  weight: number;
  distance_from_start: number;
  lat: number;
  lng: number;
  prev_ic?: string;
  next_ic?: string;
}

// 메인 함수
async function main() {
  console.log('🚀 IC 데이터 동기화 시작');
  console.log(`📅 ${new Date().toLocaleString('ko-KR')}`);
  console.log('═'.repeat(60));

  try {
    // 1단계: API에서 IC 데이터 가져오기
    console.log('📡 1단계: 한국도로공사 API에서 IC 데이터 가져오기...');
    const icData = await fetchICData();
    console.log(`✅ ${icData.length}개의 IC 데이터 수신 완료`);

    // 2단계: 데이터 처리 및 가중치 계산
    console.log('🔧 2단계: 데이터 처리 및 가중치 계산...');
    const processedData = processICData(icData);
    console.log(`✅ ${processedData.length}개의 IC 데이터 처리 완료`);

    // 3단계: DB에 저장
    console.log('💾 3단계: Supabase DB에 저장...');
    await saveToDatabase(processedData);
    console.log('✅ DB 저장 완료');

    // 4단계: 휴게소 방향 정보 업데이트
    console.log('🧭 4단계: 휴게소 방향 정보 업데이트...');
    await updateRestAreaDirections();
    console.log('✅ 방향 정보 업데이트 완료');

    // 5단계: 통계 출력
    await printStatistics();

    console.log('');
    console.log('🎉 IC 데이터 동기화 완료!');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ 동기화 실패:', error);
    process.exit(1);
  }
}

// IC 데이터 가져오기
async function fetchICData(): Promise<ICData[]> {
  const API_URL = 'https://data.ex.co.kr/openapi/locationinfo/locationinfoIc';
  
  // 한국도로공사 API 키 사용
  const highwayApiKey = process.env.NEXT_PUBLIC_HIGHWAY_API_KEY || apiKey;
  
  console.log(`🔑 API 키 확인: ${highwayApiKey ? '설정됨' : '없음'}`);
  
  if (!highwayApiKey) {
    console.log('⚠️ API 키가 없어 모의 데이터를 사용합니다.');
    return getMockICData();
  }
  
  const allData: ICData[] = [];
  let pageNo = 1;
  const numOfRows = 100;
  let hasMoreData = true;

  while (hasMoreData) {
    // API 파라미터
    const params = new URLSearchParams({
      key: highwayApiKey,
      type: 'json',
      numOfRows: numOfRows.toString(),
      pageNo: pageNo.toString()
    });

    try {
      const apiUrl = `${API_URL}?${params.toString()}`;
      console.log(`📄 페이지 ${pageNo} 요청: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON 파싱 실패:', responseText.substring(0, 200));
        throw new Error('API 응답 파싱 실패');
      }
      
      console.log(`📊 페이지 ${pageNo} 응답:`, {
        count: result.count,
        listLength: result.list?.length,
        code: result.code
      });

      // 데이터 추출 (IC API는 list 필드 사용)
      const data = result.list || [];
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`페이지 ${pageNo}: 더 이상 데이터가 없습니다.`);
        hasMoreData = false;
        break;
      }

      allData.push(...data);
      console.log(`✅ 페이지 ${pageNo}: ${data.length}개 수집, 총 ${allData.length}개`);

      // 최대 페이지 제한 (무한 루프 방지)
      if (pageNo >= 50 || data.length < numOfRows) {
        hasMoreData = false;
      }

      pageNo++;
      
    } catch (error) {
      console.error(`페이지 ${pageNo} API 호출 오류:`, error);
      hasMoreData = false;
    }
  }

  if (allData.length === 0) {
    console.log('⚠️ API에서 데이터를 가져오지 못해 모의 데이터를 사용합니다.');
    return getMockICData();
  }

  return allData;
}

// 모의 IC 데이터 (API 실패 시 사용)
function getMockICData(): ICData[] {
  return [
    // 경부고속도로 IC 예시
    {
      icCode: '0010I001',
      icName: '서울톨게이트',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '127.0853',
      yValue: '37.4564'
    },
    {
      icCode: '0010I002',
      icName: '신갈JC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '127.0786',
      yValue: '37.3245'
    },
    {
      icCode: '0010I003',
      icName: '오산IC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '127.0456',
      yValue: '37.1523'
    },
    {
      icCode: '0010I004',
      icName: '천안IC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '127.1234',
      yValue: '36.8156'
    },
    {
      icCode: '0010I005',
      icName: '대전IC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '127.3845',
      yValue: '36.3467'
    },
    {
      icCode: '0010I006',
      icName: '김천IC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '128.1156',
      yValue: '36.1293'
    },
    {
      icCode: '0010I007',
      icName: '대구IC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '128.5982',
      yValue: '35.8719'
    },
    {
      icCode: '0010I008',
      icName: '경주IC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '129.2134',
      yValue: '35.8392'
    },
    {
      icCode: '0010I009',
      icName: '언양IC',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '129.0127',
      yValue: '35.5439'
    },
    {
      icCode: '0010I010',
      icName: '부산톨게이트',
      routeNo: '0010',
      routeName: '경부선',
      xValue: '129.0756',
      yValue: '35.1796'
    }
  ];
}

// IC 데이터 처리
function processICData(rawData: ICData[]): ProcessedIC[] {
  // 1단계: 중복 제거 (icCode 기준)
  const uniqueICs = new Map<string, ICData>();
  rawData.forEach(ic => {
    if (!uniqueICs.has(ic.icCode)) {
      uniqueICs.set(ic.icCode, ic);
    }
  });
  
  console.log(`🔍 중복 제거: ${rawData.length}개 → ${uniqueICs.size}개 유니크 IC`);
  
  // 2단계: 노선별로 그룹화
  const routeGroups = new Map<string, ICData[]>();
  
  uniqueICs.forEach(ic => {
    const key = `${ic.routeNo}`;
    if (!routeGroups.has(key)) {
      routeGroups.set(key, []);
    }
    routeGroups.get(key)!.push(ic);
  });

  const processedData: ProcessedIC[] = [];

  // 각 그룹별로 처리
  routeGroups.forEach((ics, routeKey) => {
    // IC 코드 순으로 정렬 (startValue가 없으므로)
    const sorted = ics.sort((a, b) => {
      return a.icCode.localeCompare(b.icCode);
    });

    console.log(`📊 노선 ${routeKey}: ${sorted.length}개 IC 처리`);

    // 가중치 할당 및 인접 IC 연결 (상행/하행 구분하여 생성)
    sorted.forEach((ic, index) => {
      const coordinates = {
        lat: parseFloat(ic.yValue) || 0,
        lng: parseFloat(ic.xValue) || 0
      };
      
      // 유효한 좌표인지 확인
      if (coordinates.lat === 0 || coordinates.lng === 0 || 
          coordinates.lat < 33 || coordinates.lat > 39 ||
          coordinates.lng < 125 || coordinates.lng > 132) {
        console.warn(`잘못된 좌표 제외: ${ic.icName} (${coordinates.lat}, ${coordinates.lng})`);
        return;
      }

      const distance = index * 10; // 거리 정보가 없으므로 순서 기반으로 가상의 거리

      // 단순하게 IC 하나만 생성 (방향은 나중에 동적 계산)
      const processed: ProcessedIC = {
        id: ic.icCode,
        name: ic.icName,
        route_name: normalizeRouteName(ic.routeName),
        route_no: ic.routeNo,
        direction: 'BOTH', // 기본값: 양방향
        weight: index + 1, // 순서 기반 가중치
        distance_from_start: distance,
        lat: coordinates.lat,
        lng: coordinates.lng,
        prev_ic: index > 0 ? sorted[index - 1].icCode : undefined,
        next_ic: index < sorted.length - 1 ? sorted[index + 1].icCode : undefined
      };
      
      processedData.push(processed);
    });
  });

  return processedData;
}

// 노선명 정규화
function normalizeRouteName(routeName: string): string {
  return routeName
    .replace('고속도로', '선')
    .replace('고속국도', '선')
    .replace('자동차도', '선')
    .trim();
}

// 방향 정규화
function normalizeDirection(direction: string): string {
  const dir = direction.toLowerCase().trim();
  
  if (dir.includes('상행') || dir.includes('북') || dir.includes('서울')) {
    return 'UP';
  } else if (dir.includes('하행') || dir.includes('남') || dir.includes('부산')) {
    return 'DOWN';
  } else if (dir.includes('양방향') || dir.includes('양')) {
    return 'BOTH';
  }
  
  return 'UNKNOWN';
}

// DB에 저장
async function saveToDatabase(data: ProcessedIC[]): Promise<void> {
  // 기존 데이터 삭제
  console.log('  🗑️ 기존 IC 데이터 삭제 중...');
  const { error: deleteError } = await supabase
    .from('interchanges')
    .delete()
    .neq('id', '0'); // 모든 행 삭제
  
  if (deleteError && deleteError.code !== '42P01') { // 테이블 없음 오류 무시
    console.warn('  ⚠️ 기존 데이터 삭제 실패:', deleteError.message);
  }

  // 배치 삽입
  const batchSize = 100;
  let successCount = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const insertData = batch.map(ic => ({
      id: ic.id,
      name: ic.name,
      route_name: ic.route_name,
      route_no: ic.route_no,
      direction: ic.direction,
      weight: ic.weight,
      distance_from_start: ic.distance_from_start,
      lat: ic.lat,
      lng: ic.lng,
      prev_ic: ic.prev_ic,
      next_ic: ic.next_ic,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('interchanges')
      .insert(insertData);
    
    if (error) {
      console.error(`  ❌ 배치 ${Math.floor(i / batchSize) + 1} 삽입 실패:`, error.message);
    } else {
      successCount += batch.length;
      console.log(`  ✅ 배치 ${Math.floor(i / batchSize) + 1}: ${batch.length}개 저장`);
    }
  }
  
  console.log(`  📊 총 ${successCount}/${data.length}개 IC 저장 완료`);
}

// 휴게소 방향 정보 업데이트
async function updateRestAreaDirections(): Promise<void> {
  // 방향 키워드 기반 초기 업데이트
  const updates = [
    {
      direction: 'UP',
      conditions: ['상행', '서울', '북', '인천', '수원']
    },
    {
      direction: 'DOWN',
      conditions: ['하행', '부산', '남', '대구', '울산']
    },
    {
      direction: 'BOTH',
      conditions: ['양방향', '양', '상하행', '통합']
    }
  ];

  let totalUpdated = 0;

  for (const update of updates) {
    // OR 조건 생성
    const orConditions = update.conditions
      .map(keyword => `direction.ilike.%${keyword}%`)
      .join(',');
    
    const { data, error } = await supabase
      .from('rest_areas')
      .update({ route_direction: update.direction })
      .or(orConditions)
      .select();
    
    if (error) {
      console.warn(`  ⚠️ ${update.direction} 방향 업데이트 실패:`, error.message);
    } else if (data) {
      totalUpdated += data.length;
      console.log(`  ✅ ${update.direction}: ${data.length}개 휴게소 업데이트`);
    }
  }

  console.log(`  📊 총 ${totalUpdated}개 휴게소 방향 정보 업데이트 완료`);
}

// 통계 출력
async function printStatistics(): Promise<void> {
  console.log('');
  console.log('📊 동기화 통계');
  console.log('─'.repeat(50));

  // IC 통계
  const { count: icCount } = await supabase
    .from('interchanges')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  IC 총 개수: ${icCount || 0}개`);

  // 노선별 IC 수
  const { data: icByRoute } = await supabase
    .from('interchanges')
    .select('route_name')
    .order('route_name');
  
  if (icByRoute) {
    const routeCounts = new Map<string, number>();
    icByRoute.forEach(ic => {
      const count = routeCounts.get(ic.route_name) || 0;
      routeCounts.set(ic.route_name, count + 1);
    });
    
    console.log('  노선별 IC 수:');
    routeCounts.forEach((count, route) => {
      console.log(`    - ${route}: ${count}개`);
    });
  }

  // 휴게소 방향 정보 통계
  const { data: directionStats } = await supabase
    .from('rest_areas')
    .select('route_direction')
    .not('route_direction', 'is', null);
  
  if (directionStats) {
    const counts = {
      UP: 0,
      DOWN: 0,
      BOTH: 0,
      UNKNOWN: 0
    };
    
    directionStats.forEach(row => {
      const dir = row.route_direction as keyof typeof counts;
      if (dir in counts) counts[dir]++;
    });
    
    console.log('  휴게소 방향 정보:');
    console.log(`    - 상행(UP): ${counts.UP}개`);
    console.log(`    - 하행(DOWN): ${counts.DOWN}개`);
    console.log(`    - 양방향(BOTH): ${counts.BOTH}개`);
    console.log(`    - 미확인(UNKNOWN): ${counts.UNKNOWN}개`);
  }

  // 동기화 로그 저장
  await supabase
    .from('sync_logs')
    .insert({
      sync_type: 'INTERCHANGE',
      total_count: icCount || 0,
      status: 'SUCCESS',
      synced_at: new Date().toISOString()
    });
}

// 스크립트 실행
main().catch(console.error);