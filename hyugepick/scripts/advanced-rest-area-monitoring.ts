#!/usr/bin/env node

/**
 * 고도화된 민자고속도로 휴게소 모니터링 시스템
 * - 민자고속도로 운영사 웹사이트 데이터 수집
 * - 다층 검증 시스템 (웹사이트, 전화, 지도 POI, 리뷰)
 * - 신규/폐점 휴게소 자동 감지 및 알림
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { privateHighwayCollector } from '../src/lib/scraping/privateHighwayOperators';
import { verificationSystem } from '../src/lib/verification/restAreaVerification';
import { changeDetectionSystem, DEFAULT_MONITORING_CONFIG } from '../src/lib/monitoring/changeDetectionSystem';

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

// 모니터링 통계
interface MonitoringStats {
  startTime: Date;
  endTime?: Date;
  executionTimeMs: number;
  
  // 데이터 수집
  operatorsChecked: number;
  operatorsSuccessful: number;
  newRestAreasFound: number;
  
  // 검증 시스템
  restAreasVerified: number;
  verificationIssues: number;
  
  // 변화 감지
  changesDetected: number;
  highPriorityChanges: number;
  notificationsSent: number;
  
  // 데이터베이스
  recordsInserted: number;
  recordsUpdated: number;
  errors: string[];
}

console.log('🚀 고도화된 민자고속도로 휴게소 모니터링 시작');
console.log(`🕐 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
console.log('');

async function main() {
  const stats: MonitoringStats = {
    startTime: new Date(),
    executionTimeMs: 0,
    operatorsChecked: 0,
    operatorsSuccessful: 0,
    newRestAreasFound: 0,
    restAreasVerified: 0,
    verificationIssues: 0,
    changesDetected: 0,
    highPriorityChanges: 0,
    notificationsSent: 0,
    recordsInserted: 0,
    recordsUpdated: 0,
    errors: []
  };

  try {
    console.log('📋 모니터링 계획:');
    console.log('  1️⃣  민자고속도로 운영사 웹사이트 데이터 수집');
    console.log('  2️⃣  기존 휴게소 다층 검증');
    console.log('  3️⃣  신규/폐점 휴게소 자동 감지');
    console.log('  4️⃣  변화사항 알림 및 데이터베이스 업데이트');
    console.log('');

    // 1단계: 민자고속도로 운영사 데이터 수집
    console.log('🏢 1단계: 민자고속도로 운영사 데이터 수집');
    console.log('─'.repeat(60));
    
    const operatorResults = await privateHighwayCollector.collectFromAllOperators();
    stats.operatorsChecked = operatorResults.length;
    stats.operatorsSuccessful = operatorResults.filter(r => r.success).length;
    
    console.log(`✅ 운영사 수집 완료: ${stats.operatorsSuccessful}/${stats.operatorsChecked}개 성공`);
    
    for (const result of operatorResults) {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.operatorName}: ${result.itemsFound}개 휴게소 발견`);
      
      if (!result.success && result.error) {
        stats.errors.push(`${result.operatorName}: ${result.error}`);
      }
    }
    
    const allNewRestAreas = operatorResults
      .filter(r => r.success)
      .flatMap(r => r.restAreas);
    
    stats.newRestAreasFound = allNewRestAreas.length;
    console.log(`📊 총 발견된 휴게소: ${stats.newRestAreasFound}개`);
    console.log('');

    // 2단계: 기존 휴게소 다층 검증
    console.log('🔍 2단계: 기존 휴게소 다층 검증');
    console.log('─'.repeat(60));
    
    // 기존 휴게소 목록 조회 (샘플로 몇 개만)
    const { data: existingRestAreas, error: fetchError } = await supabase
      .from('rest_areas')
      .select('*')
      .eq('highway_operator', '민자')
      .limit(5); // 테스트용으로 5개만
    
    if (fetchError) {
      console.error('❌ 기존 휴게소 조회 실패:', fetchError);
      stats.errors.push(`기존 휴게소 조회 실패: ${fetchError.message}`);
    } else if (existingRestAreas) {
      console.log(`📋 검증 대상: ${existingRestAreas.length}개 휴게소`);
      
      for (const restArea of existingRestAreas) {
        try {
          console.log(`  🔍 ${restArea.name} 검증 중...`);
          
          const verificationResult = await verificationSystem.verifyRestArea({
            id: restArea.id,
            name: restArea.name,
            coordinates: { lat: restArea.lat, lng: restArea.lng },
            routeCode: restArea.route_code,
            direction: restArea.direction,
            address: restArea.address || '',
            phoneNumber: restArea.phone || '',
            facilities: restArea.facilities || [],
            operatingHours: restArea.operating_hours || '24시간'
          });
          
          stats.restAreasVerified++;
          
          const statusIcon = verificationResult.overallStatus === 'active' ? '✅' : 
                           verificationResult.overallStatus === 'inactive' ? '❌' : 
                           verificationResult.overallStatus === 'uncertain' ? '❓' : '🆕';
          
          console.log(`    ${statusIcon} 상태: ${verificationResult.overallStatus} (신뢰도: ${Math.round(verificationResult.confidence * 100)}%)`);
          
          if (verificationResult.changes.length > 0) {
            stats.verificationIssues++;
            console.log(`    📝 변경사항 ${verificationResult.changes.length}개 감지`);
          }
          
          if (verificationResult.recommendations.length > 0) {
            console.log(`    💡 권장사항: ${verificationResult.recommendations.join(', ')}`);
          }
          
        } catch (error) {
          console.error(`  ❌ ${restArea.name} 검증 실패:`, error);
          stats.errors.push(`검증 실패 - ${restArea.name}: ${error}`);
        }
        
        // API 호출 제한을 위한 대기
        await delay(1000);
      }
    }
    
    console.log(`✅ 검증 완료: ${stats.restAreasVerified}개 휴게소, ${stats.verificationIssues}개 이슈 발견`);
    console.log('');

    // 3단계: 신규/폐점 휴게소 자동 감지
    console.log('🤖 3단계: 신규/폐점 휴게소 자동 감지');
    console.log('─'.repeat(60));
    
    const detectionResults = await changeDetectionSystem.runFullMonitoring();
    stats.changesDetected = detectionResults.length;
    stats.highPriorityChanges = detectionResults.filter(r => 
      r.severity === 'high' || r.severity === 'critical'
    ).length;
    
    console.log(`📊 감지 결과: ${stats.changesDetected}개 변화 발견`);
    
    for (const change of detectionResults) {
      const severityIcon = change.severity === 'critical' ? '🔴' :
                          change.severity === 'high' ? '🟠' :
                          change.severity === 'medium' ? '🟡' : '🟢';
      
      const typeIcon = change.type === 'new_rest_area' ? '🆕' :
                      change.type === 'closed_rest_area' ? '🚫' :
                      change.type === 'temporarily_closed' ? '⏸️' : '📝';
      
      console.log(`  ${typeIcon} ${severityIcon} ${getChangeTypeKorean(change.type)}: ${change.restArea?.name || '알 수 없음'} (신뢰도: ${Math.round(change.confidence * 100)}%)`);
      
      if (change.notifications.length > 0) {
        stats.notificationsSent += change.notifications.length;
        console.log(`    📧 알림 발송: ${change.notifications.length}개`);
      }
    }
    
    if (stats.changesDetected === 0) {
      console.log('  ✅ 변화사항 없음');
    }
    console.log('');

    // 4단계: 데이터베이스 업데이트
    console.log('💾 4단계: 데이터베이스 업데이트');
    console.log('─'.repeat(60));
    
    // 새로 발견된 휴게소 저장
    for (const restArea of allNewRestAreas) {
      try {
        const { error } = await supabase
          .from('rest_areas')
          .upsert({
            unit_code: restArea.id,
            name: restArea.name,
            route_code: restArea.routeCode,
            route_name: '',
            direction: restArea.direction,
            lat: restArea.coordinates.lat,
            lng: restArea.coordinates.lng,
            address: restArea.address,
            phone: restArea.phoneNumber,
            service_type: '휴게소',
            operating_hours: restArea.operatingHours,
            facilities: restArea.facilities,
            source: 'advanced_monitoring',
            highway_operator: '민자',
            data_sources: ['automated_scraping'],
            confidence_score: 0.8,
            verification_status: 'pending',
            last_synced_at: new Date().toISOString()
          });

        if (error) {
          console.error(`❌ ${restArea.name} 저장 실패:`, error);
          stats.errors.push(`저장 실패 - ${restArea.name}: ${error.message}`);
        } else {
          stats.recordsInserted++;
          console.log(`✅ ${restArea.name} 저장 완료`);
        }
        
      } catch (error) {
        console.error(`❌ ${restArea.name} 저장 중 오류:`, error);
        stats.errors.push(`저장 오류 - ${restArea.name}: ${error}`);
      }
    }
    
    // 변화 감지 결과 로그 저장
    try {
      const { error } = await supabase
        .from('scraping_logs')
        .insert({
          source_id: null,
          scraping_type: 'advanced_monitoring',
          status: 'completed',
          items_found: stats.newRestAreasFound,
          items_processed: stats.restAreasVerified,
          items_added: stats.recordsInserted,
          items_updated: stats.recordsUpdated,
          execution_time_ms: Date.now() - stats.startTime.getTime(),
          started_at: stats.startTime.toISOString(),
          completed_at: new Date().toISOString(),
          error_message: stats.errors.length > 0 ? stats.errors.join('; ') : null
        });
      
      if (error) {
        console.warn('⚠️ 모니터링 로그 저장 실패:', error);
      }
    } catch (error) {
      console.warn('⚠️ 모니터링 로그 저장 오류:', error);
    }
    
    console.log(`✅ 데이터베이스 업데이트 완료: ${stats.recordsInserted}개 삽입, ${stats.recordsUpdated}개 수정`);
    console.log('');

    // 최종 결과 요약
    stats.endTime = new Date();
    stats.executionTimeMs = stats.endTime.getTime() - stats.startTime.getTime();
    
    console.log('🎯 모니터링 완료!');
    console.log('═'.repeat(60));
    console.log('📊 실행 결과:');
    console.log(`  🏢 운영사 수집: ${stats.operatorsSuccessful}/${stats.operatorsChecked}개 성공`);
    console.log(`  🔍 휴게소 검증: ${stats.restAreasVerified}개 완료 (${stats.verificationIssues}개 이슈)`);
    console.log(`  🤖 변화 감지: ${stats.changesDetected}개 발견 (${stats.highPriorityChanges}개 고우선순위)`);
    console.log(`  💾 데이터베이스: ${stats.recordsInserted}개 삽입, ${stats.recordsUpdated}개 수정`);
    console.log(`  📧 알림 발송: ${stats.notificationsSent}개`);
    console.log(`  ⏱️ 총 실행시간: ${(stats.executionTimeMs / 1000).toFixed(1)}초`);
    
    if (stats.errors.length > 0) {
      console.log(`  ❌ 오류: ${stats.errors.length}개`);
      console.log('');
      console.log('⚠️  오류 세부사항:');
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('');
    console.log(`🕐 완료 시간: ${new Date().toLocaleString('ko-KR')}`);
    
    // 전체 휴게소 수 확인
    const { count: totalRestAreas } = await supabase
      .from('rest_areas')
      .select('*', { count: 'exact', head: true });

    console.log(`🎯 현재 전체 휴게소 수: ${totalRestAreas}개`);

    // GitHub Actions 출력
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=operators_checked::${stats.operatorsChecked}`);
      console.log(`::set-output name=operators_successful::${stats.operatorsSuccessful}`);
      console.log(`::set-output name=new_rest_areas::${stats.newRestAreasFound}`);
      console.log(`::set-output name=rest_areas_verified::${stats.restAreasVerified}`);
      console.log(`::set-output name=changes_detected::${stats.changesDetected}`);
      console.log(`::set-output name=high_priority_changes::${stats.highPriorityChanges}`);
      console.log(`::set-output name=records_inserted::${stats.recordsInserted}`);
      console.log(`::set-output name=notifications_sent::${stats.notificationsSent}`);
      console.log(`::set-output name=execution_time::${stats.executionTimeMs}`);
      console.log(`::set-output name=error_count::${stats.errors.length}`);
    }

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('💥 고도화된 모니터링 시스템 실패:', error);
    
    stats.endTime = new Date();
    stats.executionTimeMs = stats.endTime.getTime() - stats.startTime.getTime();
    stats.errors.push(error instanceof Error ? error.message : '알 수 없는 시스템 오류');
    
    // 실패 로그 기록
    try {
      await supabase.from('scraping_logs').insert({
        source_id: null,
        scraping_type: 'advanced_monitoring',
        status: 'failed',
        items_found: stats.newRestAreasFound,
        items_processed: stats.restAreasVerified,
        items_added: stats.recordsInserted,
        execution_time_ms: stats.executionTimeMs,
        started_at: stats.startTime.toISOString(),
        completed_at: stats.endTime.toISOString(),
        error_message: stats.errors.join('; ')
      });
    } catch (logError) {
      console.error('로그 기록 실패:', logError);
    }

    process.exit(1);
  }
}

// 유틸리티 함수들
function getChangeTypeKorean(changeType: string): string {
  const koreanMap: Record<string, string> = {
    'new_rest_area': '신규 휴게소',
    'closed_rest_area': '휴게소 폐점',
    'temporarily_closed': '임시 휴업',
    'facility_changes': '시설 변경',
    'hours_changes': '운영시간 변경',
    'name_changes': '명칭 변경',
    'location_changes': '위치 변경',
    'contact_changes': '연락처 변경',
    'ownership_changes': '운영주체 변경'
  };
  
  return koreanMap[changeType] || '기타 변경';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 스크립트 실행
main();