#!/usr/bin/env node

/**
 * 추가 휴게소 데이터 수집 스크립트
 * 한국도로공사 API에 누락된 민자고속도로 휴게소들을 수집
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { restAreaScraper } from '../src/lib/scraping/restAreaScraper';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

// Supabase 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 필수 환경변수가 설정되지 않았습니다.');
  console.error('필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 추가 휴게소 데이터 수집 시작');
console.log(`🕐 시작 시간: ${new Date().toLocaleString('ko-KR')}`);

// 스크래핑 로그 기록
async function logScrapingResult(
  sourceType: string,
  status: string,
  itemsFound: number = 0,
  itemsProcessed: number = 0,
  itemsAdded: number = 0,
  executionTime: number = 0,
  error?: string
): Promise<void> {
  try {
    // 먼저 source_id를 조회하거나 생성
    let { data: source } = await supabase
      .from('rest_area_sources')
      .select('id')
      .eq('source_type', sourceType)
      .single();

    if (!source) {
      // 소스가 없으면 생성
      const { data: newSource } = await supabase
        .from('rest_area_sources')
        .insert({
          source_type: sourceType,
          source_name: sourceType === 'kakao_api' ? '카카오 지도 API' : 
                      sourceType === 'manual_data' ? '알려진 누락 데이터' : sourceType,
          priority: 4
        })
        .select('id')
        .single();
      
      source = newSource;
    }

    if (source) {
      await supabase.from('scraping_logs').insert({
        source_id: source.id,
        scraping_type: 'missing_rest_areas',
        status: status,
        items_found: itemsFound,
        items_processed: itemsProcessed,
        items_added: itemsAdded,
        execution_time_ms: executionTime,
        error_message: error,
        started_at: new Date().toISOString(),
        completed_at: status !== 'started' ? new Date().toISOString() : null
      });
    }
  } catch (err) {
    console.error('❌ 스크래핑 로그 기록 실패:', err);
  }
}

// 메인 실행 함수
async function main() {
  const startTime = Date.now();
  const allResults: any[] = [];

  try {
    console.log('\n📋 수집 계획:');
    console.log('  1. 알려진 누락 휴게소 직접 추가');
    console.log('  2. 카카오 지도 API 검색');
    console.log('  3. 데이터 검증 및 저장');

    // 1단계: 알려진 누락 휴게소 직접 추가
    console.log('\n📝 1단계: 알려진 누락 휴게소 추가...');
    await logScrapingResult('manual_data', 'started');
    
    const manualResult = await restAreaScraper.addKnownMissingRestAreas();
    allResults.push(manualResult);
    
    await logScrapingResult(
      'manual_data', 
      manualResult.success ? 'completed' : 'failed',
      manualResult.itemsFound,
      manualResult.itemsFound,
      0, // 아직 저장 안함
      manualResult.executionTime,
      manualResult.error
    );

    console.log(`📝 결과: ${manualResult.itemsFound}개 휴게소 준비`);

    // 2단계: 카카오 지도 API 검색
    console.log('\n🔍 2단계: 카카오 지도 API 검색...');
    await logScrapingResult('kakao_api', 'started');
    
    const kakaoResult = await restAreaScraper.searchWithKakaoAPI();
    allResults.push(kakaoResult);
    
    await logScrapingResult(
      'kakao_api',
      kakaoResult.success ? 'completed' : 'failed',
      kakaoResult.itemsFound,
      kakaoResult.itemsFound,
      0, // 아직 저장 안함
      kakaoResult.executionTime,
      kakaoResult.error
    );

    console.log(`🔍 결과: ${kakaoResult.itemsFound}개 휴게소 발견`);

    // 3단계: 데이터베이스에 저장
    console.log('\n💾 3단계: 데이터베이스 저장...');
    const saveResult = await restAreaScraper.saveScrapingResults(allResults, supabase);

    // 4단계: 결과 요약
    console.log('\n✅ 추가 휴게소 수집 완료!');
    console.log('📊 수집 결과:');
    
    let totalFound = 0;
    let totalSuccessful = 0;
    
    allResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.source}: ${result.itemsFound}개 발견`);
      totalFound += result.itemsFound;
      if (result.success) totalSuccessful++;
    });

    console.log('\n📊 저장 결과:');
    console.log(`  - 신규 추가: ${saveResult.inserted}개`);
    console.log(`  - 중복 스킵: ${saveResult.skipped}개`);
    console.log(`  - 오류: ${saveResult.errors}개`);
    console.log(`  - 총 발견: ${totalFound}개`);
    console.log(`  - 성공한 소스: ${totalSuccessful}/${allResults.length}개`);

    const endTime = Date.now();
    console.log(`🕐 완료 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`⏱️ 총 실행시간: ${((endTime - startTime) / 1000).toFixed(1)}초`);

    // 전체 휴게소 수 확인
    const { count: totalRestAreas } = await supabase
      .from('rest_areas')
      .select('*', { count: 'exact', head: true });

    console.log(`\n🎯 현재 전체 휴게소 수: ${totalRestAreas}개`);
    console.log('   - 한국도로공사: ~203개');
    console.log('   - 추가 수집: ~' + (totalRestAreas! - 203) + '개');

    // GitHub Actions 출력
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=total_found::${totalFound}`);
      console.log(`::set-output name=inserted::${saveResult.inserted}`);
      console.log(`::set-output name=skipped::${saveResult.skipped}`);
      console.log(`::set-output name=errors::${saveResult.errors}`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 추가 휴게소 수집 실패:', error);
    
    // 실패 로그 기록
    await logScrapingResult('combined', 'failed', 0, 0, 0, Date.now() - startTime,
      error instanceof Error ? error.message : '알 수 없는 오류'
    );

    process.exit(1);
  }
}

// 스크립트 실행
main();