#!/usr/bin/env node

/**
 * 현풍 휴게소 필터링 수정 테스트
 * 새로운 노선 코드 정밀 필터링으로 현풍 휴게소가 제대로 걸러지는지 확인
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { routeCodePrecisionFilter } from '../src/lib/routing/routeCodePrecisionFilter';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

// 서울-부산 실제 경로 좌표
const SEOUL_BUSAN_ROUTE = [
  { lat: 37.5665, lng: 126.9780 }, // 서울 시청
  { lat: 37.4563, lng: 127.1261 }, // 수원IC 근처
  { lat: 37.2636, lng: 127.2286 }, // 안성IC 근처
  { lat: 36.3504, lng: 127.3845 }, // 대전IC 근처
  { lat: 36.1004, lng: 127.9201 }, // 옥천IC 근처
  { lat: 35.8714, lng: 128.6014 }, // 대구IC 근처
  { lat: 35.5384, lng: 128.7294 }, // 경주IC 근처
  { lat: 35.1796, lng: 129.0756 }  // 부산 시청
];

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🧪 현풍 휴게소 필터링 수정 테스트');
  console.log(`📅 ${new Date().toLocaleString('ko-KR')}`);
  console.log('═'.repeat(70));

  try {
    // 1. 전체 휴게소 조회
    console.log('1️⃣ 전체 휴게소 데이터 조회...');
    
    const { data: allRestAreas, error } = await supabase
      .from('rest_areas')
      .select('*')
      .limit(200); // 테스트용으로 제한
    
    if (error) {
      console.error('❌ 휴게소 조회 실패:', error.message);
      return;
    }
    
    console.log(`📊 전체 휴게소: ${allRestAreas?.length || 0}개`);
    
    if (!allRestAreas || allRestAreas.length === 0) {
      console.log('⚠️ 휴게소 데이터가 없습니다.');
      return;
    }

    // 2. 현풍 관련 휴게소 확인
    console.log('\n2️⃣ 현풍 관련 휴게소 필터링 전 상태...');
    
    const hyeonpungAreas = allRestAreas.filter(ra => 
      ra.name && ra.name.includes('현풍')
    );
    
    console.log(`🔍 현풍 관련 휴게소: ${hyeonpungAreas.length}개`);
    hyeonpungAreas.forEach((ra, index) => {
      console.log(`  ${index + 1}. ${ra.name} (${ra.route_name})`);
      console.log(`     위치: ${ra.lat}, ${ra.lng}`);
      console.log(`     노선 코드: ${ra.route_code || 'N/A'}`);
    });

    // 3. 기존 거리 기반 필터링 테스트
    console.log('\n3️⃣ 기존 거리 기반 필터링 테스트...');
    
    const distanceFilteredAreas = allRestAreas.filter(ra => {
      if (!ra.lat || !ra.lng) return false;
      
      const minDistance = getMinDistanceToRoute({ lat: ra.lat, lng: ra.lng });
      return minDistance <= 10; // 10km 이내
    });
    
    const hyeonpungInDistanceFilter = distanceFilteredAreas.filter(ra => 
      ra.name && ra.name.includes('현풍')
    );
    
    console.log(`📍 거리 필터링 (10km): ${distanceFilteredAreas.length}개`);
    console.log(`🔍 현풍 휴게소 포함 여부: ${hyeonpungInDistanceFilter.length}개`);
    
    if (hyeonpungInDistanceFilter.length > 0) {
      console.log('❌ 기존 거리 필터링으로는 현풍 휴게소가 걸러지지 않음!');
      hyeonpungInDistanceFilter.forEach(ra => {
        const distance = getMinDistanceToRoute({ lat: ra.lat, lng: ra.lng });
        console.log(`  - ${ra.name}: ${distance.toFixed(2)}km`);
      });
    } else {
      console.log('✅ 기존 거리 필터링으로 현풍 휴게소가 모두 걸러짐');
    }

    // 4. 새로운 노선 코드 정밀 필터링 테스트
    console.log('\n4️⃣ 새로운 노선 코드 정밀 필터링 테스트...');
    console.log('─'.repeat(60));
    
    const precisionResults = await routeCodePrecisionFilter.filterRestAreasByRouteCode(
      SEOUL_BUSAN_ROUTE,
      allRestAreas,
      {
        maxDistanceFromRoute: 5000,    // 5km
        strictRouteMatching: true,
        excludeBranchLines: true,
        routeAnalysisConfidence: 0.7
      }
    );
    
    const includedRestAreas = routeCodePrecisionFilter.getIncludedRestAreas(precisionResults);
    const summary = routeCodePrecisionFilter.getSummary(precisionResults);
    
    console.log('📊 정밀 필터링 결과:');
    console.log(`  전체: ${summary.total}개`);
    console.log(`  포함: ${summary.included}개`);
    console.log(`  필터링됨: ${summary.filtered}개`);
    console.log(`  평균 거리: ${summary.averageDistance.toFixed(2)}km`);
    console.log(`  노선 매칭률: ${((summary.routeCodeMatches / summary.total) * 100).toFixed(1)}%`);

    // 5. 현풍 휴게소 필터링 결과 확인
    console.log('\n5️⃣ 현풍 휴게소 필터링 결과 확인...');
    
    const hyeonpungInPrecisionFilter = includedRestAreas.filter(ra => 
      ra.name && ra.name.includes('현풍')
    );
    
    console.log(`🎯 현풍 휴게소 포함 여부: ${hyeonpungInPrecisionFilter.length}개`);
    
    if (hyeonpungInPrecisionFilter.length === 0) {
      console.log('✅ 성공! 새로운 정밀 필터링으로 현풍 휴게소가 모두 걸러짐');
      
      // 어떤 이유로 필터링되었는지 확인
      const hyeonpungFilterResults = precisionResults.filter(result =>
        result.restArea.name && result.restArea.name.includes('현풍')
      );
      
      console.log('\n📋 현풍 휴게소 필터링 상세 정보:');
      hyeonpungFilterResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.restArea.name}`);
        console.log(`     필터링됨: ${result.isFiltered ? '✅' : '❌'}`);
        console.log(`     이유: ${result.filterReason}`);
        console.log(`     거리: ${(result.distanceFromRoute / 1000).toFixed(2)}km`);
        console.log(`     노선 매칭: ${result.routeCodeMatch ? '✅' : '❌'}`);
        console.log(`     신뢰도: ${(result.confidenceScore * 100).toFixed(1)}%`);
        console.log('');
      });
      
    } else {
      console.log('❌ 실패! 현풍 휴게소가 여전히 포함됨');
      hyeonpungInPrecisionFilter.forEach(ra => {
        console.log(`  - ${ra.name} (${ra.route_name})`);
      });
    }

    // 6. 포함된 휴게소 샘플 확인
    console.log('\n6️⃣ 정밀 필터링 통과 휴게소 샘플...');
    
    const sampleAreas = includedRestAreas.slice(0, 10);
    console.log(`📋 포함된 휴게소 (상위 ${sampleAreas.length}개):`);
    
    sampleAreas.forEach((ra, index) => {
      const distance = getMinDistanceToRoute({ lat: ra.lat, lng: ra.lng });
      console.log(`  ${index + 1}. ${ra.name} (${ra.route_name})`);
      console.log(`     거리: ${distance.toFixed(2)}km | 코드: ${ra.route_code || 'N/A'}`);
    });

    // 7. 성능 비교
    console.log('\n7️⃣ 필터링 방식 성능 비교...');
    
    const start1 = Date.now();
    const basicFiltered = allRestAreas.filter(ra => {
      if (!ra.lat || !ra.lng) return false;
      return getMinDistanceToRoute({ lat: ra.lat, lng: ra.lng }) <= 5;
    });
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await routeCodePrecisionFilter.filterRestAreasByRouteCode(
      SEOUL_BUSAN_ROUTE,
      allRestAreas,
      { maxDistanceFromRoute: 5000 }
    );
    const time2 = Date.now() - start2;
    
    console.log('⚡ 성능 비교:');
    console.log(`  기본 거리 필터링: ${basicFiltered.length}개, ${time1}ms`);
    console.log(`  정밀 노선 필터링: ${includedRestAreas.length}개, ${time2}ms`);
    console.log(`  성능 차이: +${time2 - time1}ms`);

    console.log('\n🎯 결론');
    console.log('─'.repeat(60));
    
    if (hyeonpungInPrecisionFilter.length === 0) {
      console.log('🎉 현풍 휴게소 필터링 문제가 해결되었습니다!');
      console.log('💡 새로운 노선 코드 정밀 필터링이 성공적으로 동작합니다.');
      console.log('🚀 서울-부산 경로에서 현풍 휴게소가 더 이상 표시되지 않습니다.');
    } else {
      console.log('⚠️ 추가 조정이 필요합니다.');
      console.log('💡 필터링 옵션을 더 엄격하게 설정하거나 추가 규칙이 필요할 수 있습니다.');
    }

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
    process.exit(1);
  }
}

// 경로와의 최단거리 계산 (km)
function getMinDistanceToRoute(point: { lat: number; lng: number }): number {
  let minDistance = Infinity;
  
  for (const routePoint of SEOUL_BUSAN_ROUTE) {
    const distance = calculateDistance(point, routePoint);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance;
}

// 두 점 간의 거리 계산 (km)
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

main().catch(console.error);