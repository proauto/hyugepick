#!/usr/bin/env node

/**
 * 휴게소 데이터 동기화 스크립트
 * GitHub Actions에서 실행되거나 로컬에서 직접 실행 가능
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 환경변수 로드 (.env.local도 포함)
dotenv.config();
dotenv.config({ path: '.env.local' });

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const highwayApiKey = process.env.NEXT_PUBLIC_HIGHWAY_API_KEY;

if (!supabaseUrl || !supabaseKey || !highwayApiKey) {
  console.error('❌ 필수 환경변수가 설정되지 않았습니다.');
  console.error('필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_HIGHWAY_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 동기화 타입 결정
const syncType = process.env.SYNC_TYPE || process.argv[2] || 'incremental';

console.log('🔄 휴게소 데이터 동기화 시작');
console.log(`📊 동기화 타입: ${syncType}`);
console.log(`🕐 시작 시간: ${new Date().toLocaleString('ko-KR')}`);

// 한국도로공사 API 호출 함수
async function fetchRestAreasFromAPI(): Promise<any[]> {
  const baseUrl = 'https://data.ex.co.kr/openapi';
  let allRestAreas: any[] = [];
  let pageNo = 1;
  const numOfRows = 100;

  try {
    while (pageNo <= 10) { // 최대 10페이지
      const apiUrl = `${baseUrl}/locationinfo/locationinfoRest?key=${highwayApiKey}&type=json&numOfRows=${numOfRows}&pageNo=${pageNo}`;
      
      console.log(`📡 API 페이지 ${pageNo} 요청 중... (URL: ${apiUrl})`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`❌ API 오류: ${response.status}`);
        break;
      }

      const data = await response.json();
      
      if (data?.list && Array.isArray(data.list)) {
        allRestAreas.push(...data.list);
        console.log(`✅ 페이지 ${pageNo}: ${data.list.length}개 수집`);
        
        // 디버깅: API 응답 구조 확인
        console.log(`📊 API 응답 키들: ${Object.keys(data).join(', ')}`);
        if (data.count) console.log(`📊 총 데이터 개수: ${data.count}`);
        if (data.totalCount) console.log(`📊 총 데이터 개수: ${data.totalCount}`);
        
        // 전체 데이터 수와 현재까지 수집한 수를 비교
        const totalCollected = allRestAreas.length;
        const totalCount = data.count || data.totalCount || 0;
        
        console.log(`📊 진행상황: ${totalCollected}/${totalCount}`);
        
        // API에서 받은 데이터가 적어도 다음 페이지 요청은 시도해보자
        if (data.list.length === 0) {
          console.log(`📄 빈 페이지 - 종료`);
          break; // 완전히 빈 페이지면 종료
        }
        
        if (totalCount > 0 && totalCollected >= totalCount) {
          console.log(`📄 전체 데이터 수집 완료 (${totalCollected}/${totalCount})`);
          break;
        }
        
        pageNo++;
      } else {
        console.log(`❌ 페이지 ${pageNo} 응답 구조 오류:`, Object.keys(data || {}));
        break;
      }
    }

    console.log(`📊 총 ${allRestAreas.length}개 휴게소 데이터 수집 완료`);
    return allRestAreas;

  } catch (error) {
    console.error('❌ API 호출 실패:', error);
    throw error;
  }
}

// DB에 데이터 저장 함수
async function saveToDatabase(restAreas: any[]): Promise<{
  inserted: number;
  updated: number;
  failed: number;
}> {
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const restArea of restAreas) {
    try {
      // 데이터 변환
      const dbData = {
        unit_code: restArea.unitCode || restArea.svarCd,
        name: (restArea.unitName || restArea.svarNm || '').replace(/(주유소|휴게소)$/, ''),
        route_code: restArea.routeCode || restArea.routeCd,
        route_name: restArea.routeName || restArea.routeNm,
        direction: restArea.direction || restArea.gudClssNm,
        lat: parseFloat(restArea.yValue || restArea.latitude || 0),
        lng: parseFloat(restArea.xValue || restArea.longitude || 0),
        address: restArea.svarAddr || restArea.address,
        phone: restArea.rprsTelNo || restArea.telNo,
        service_type: restArea.serviceType || '휴게소',
        operating_hours: restArea.operatingTime || '24시간',
        facilities: [],
        source: 'highway_api',
        is_verified: true,
        last_synced_at: new Date().toISOString()
      };

      // 좌표가 없는 데이터는 스킵
      if (dbData.lat === 0 || dbData.lng === 0) {
        console.log(`⚠️ 스킵: ${dbData.name} (좌표 없음)`);
        failed++;
        continue;
      }

      // upsert 실행
      const { data: existing } = await supabase
        .from('rest_areas')
        .select('id')
        .eq('unit_code', dbData.unit_code)
        .single();

      if (existing) {
        // 업데이트
        const { error } = await supabase
          .from('rest_areas')
          .update(dbData)
          .eq('unit_code', dbData.unit_code);

        if (error) throw error;
        updated++;
      } else {
        // 신규 삽입
        const { error } = await supabase
          .from('rest_areas')
          .insert(dbData);

        if (error) throw error;
        inserted++;
      }

    } catch (error) {
      console.error(`❌ 저장 실패: ${restArea.unitName}`, error);
      failed++;
    }
  }

  return { inserted, updated, failed };
}

// 동기화 로그 기록
async function logSync(
  type: string,
  status: string,
  stats: any,
  error?: string
): Promise<void> {
  try {
    await supabase.from('sync_logs').insert({
      sync_type: type,
      source: 'highway_api',
      status: status,
      total_fetched: stats.fetched || 0,
      total_inserted: stats.inserted || 0,
      total_updated: stats.updated || 0,
      total_failed: stats.failed || 0,
      error_message: error,
      started_at: new Date().toISOString(),
      completed_at: status !== 'started' ? new Date().toISOString() : null
    });
  } catch (err) {
    console.error('❌ 로그 기록 실패:', err);
  }
}

// 메인 실행 함수
async function main() {
  try {
    // 동기화 시작 로그
    await logSync(syncType, 'started', {});

    // API에서 데이터 가져오기
    const restAreas = await fetchRestAreasFromAPI();
    
    if (restAreas.length === 0) {
      throw new Error('API에서 데이터를 가져올 수 없습니다.');
    }

    // 데이터베이스에 저장
    console.log('💾 데이터베이스 저장 중...');
    const result = await saveToDatabase(restAreas);

    // 결과 출력
    console.log('\n✅ 동기화 완료!');
    console.log('📊 동기화 결과:');
    console.log(`  - 가져온 데이터: ${restAreas.length}개`);
    console.log(`  - 신규 추가: ${result.inserted}개`);
    console.log(`  - 업데이트: ${result.updated}개`);
    console.log(`  - 실패: ${result.failed}개`);
    console.log(`🕐 완료 시간: ${new Date().toLocaleString('ko-KR')}`);

    // 동기화 완료 로그
    await logSync(syncType, 'completed', {
      fetched: restAreas.length,
      ...result
    });

    // GitHub Actions 출력 설정
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=total::${restAreas.length}`);
      console.log(`::set-output name=inserted::${result.inserted}`);
      console.log(`::set-output name=updated::${result.updated}`);
      console.log(`::set-output name=failed::${result.failed}`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 동기화 실패:', error);
    
    // 실패 로그
    await logSync(syncType, 'failed', {}, 
      error instanceof Error ? error.message : '알 수 없는 오류'
    );

    process.exit(1);
  }
}

// 스크립트 실행
main();