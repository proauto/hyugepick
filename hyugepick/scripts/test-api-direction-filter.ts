#!/usr/bin/env node

/**
 * 실제 서비스 API의 방향성 필터링 테스트
 * routeRestAreaService를 직접 호출하여 테스트
 */

import dotenv from 'dotenv';
import { routeRestAreaService } from '../src/lib/routeRestAreaService';
import { Coordinates } from '../src/types/map';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

console.log('🚗 실제 서비스 API 방향성 필터링 테스트');
console.log('═'.repeat(60));

const origin: Coordinates = { lat: 37.5547, lng: 126.9706 }; // 서울역
const destination: Coordinates = { lat: 35.1796, lng: 129.0756 }; // 부산역

async function testDirectionFiltering() {
  try {
    console.log('📍 테스트 경로: 서울역 → 부산역');
    console.log('🎯 목표: 방향성 필터링으로 반대방향 휴게소 제거');
    console.log('');

    // 테스트 1: 방향성 필터링 OFF
    console.log('🔄 테스트 1: 방향성 필터링 비활성화');
    console.log('─'.repeat(50));
    
    const resultWithoutFilter = await routeRestAreaService.getRouteWithRestAreas(
      origin,
      destination,
      {
        matching: {
          enableDirectionFilter: false,  // 방향성 필터링 OFF
          maxDistance: 8,
          minInterval: 10,
          maxResults: 25
        }
      }
    );

    console.log(`📊 결과: ${resultWithoutFilter.rest_areas.length}개 휴게소`);
    console.log('휴게소 목록:');
    resultWithoutFilter.rest_areas.forEach((area, index) => {
      console.log(`  ${index + 1}. ${area.name} - ${area.distance_from_start}`);
    });
    
    // 서울 방향 휴게소 찾기
    const seoulDirectionAreas = resultWithoutFilter.rest_areas.filter(area => 
      area.name.includes('(서울)') || area.name.toLowerCase().includes('서울')
    );
    
    if (seoulDirectionAreas.length > 0) {
      console.log(`❌ 반대방향 휴게소 발견: ${seoulDirectionAreas.length}개`);
      seoulDirectionAreas.forEach(area => console.log(`   - ${area.name}`));
    } else {
      console.log(`✅ 반대방향 휴게소 없음`);
    }
    
    console.log('');

    // 테스트 2: 방향성 필터링 ON
    console.log('🧭 테스트 2: 방향성 필터링 활성화 (엄격 모드)');
    console.log('─'.repeat(50));
    
    const resultWithFilter = await routeRestAreaService.getRouteWithRestAreas(
      origin,
      destination,
      {
        matching: {
          enableDirectionFilter: true,        // 방향성 필터링 ON
          directionStrictMode: true,          // 엄격 모드
          directionConfidenceThreshold: 0.7,  // 70% 이상 신뢰도
          includeAmbiguousDirection: false,   // 애매한 경우 제외
          maxDistance: 8,
          minInterval: 10,
          maxResults: 25
        }
      }
    );

    console.log(`📊 결과: ${resultWithFilter.rest_areas.length}개 휴게소`);
    console.log('휴게소 목록:');
    resultWithFilter.rest_areas.forEach((area, index) => {
      console.log(`  ${index + 1}. ${area.name} - ${area.distance_from_start}`);
    });
    
    // 서울 방향 휴게소 확인
    const seoulDirectionAreasFiltered = resultWithFilter.rest_areas.filter(area => 
      area.name.includes('(서울)') || area.name.toLowerCase().includes('서울')
    );
    
    if (seoulDirectionAreasFiltered.length > 0) {
      console.log(`❌ 여전히 반대방향 휴게소 있음: ${seoulDirectionAreasFiltered.length}개`);
      seoulDirectionAreasFiltered.forEach(area => console.log(`   - ${area.name}`));
    } else {
      console.log(`✅ 반대방향 휴게소 성공적으로 제거됨!`);
    }
    
    console.log('');

    // 결과 비교
    console.log('📈 필터링 효과 분석');
    console.log('═'.repeat(60));
    
    const reduction = resultWithoutFilter.rest_areas.length - resultWithFilter.rest_areas.length;
    const reductionPercentage = (reduction / resultWithoutFilter.rest_areas.length * 100).toFixed(1);
    
    console.log(`🔄 필터링 OFF: ${resultWithoutFilter.rest_areas.length}개 휴게소`);
    console.log(`🧭 필터링 ON: ${resultWithFilter.rest_areas.length}개 휴게소`);
    console.log(`📊 필터링 효과: ${reduction}개 감소 (${reductionPercentage}% 감소)`);
    
    // 부산 방향 휴게소 확인
    const busanDirectionAreas = resultWithFilter.rest_areas.filter(area => 
      area.name.includes('(부산)') || area.name.includes('부산')
    );
    
    console.log(`🎯 부산방향 휴게소: ${busanDirectionAreas.length}개`);
    if (busanDirectionAreas.length > 0) {
      console.log('부산방향 휴게소 목록:');
      busanDirectionAreas.forEach(area => console.log(`   ✅ ${area.name}`));
    }
    
    console.log('');
    console.log('✅ 방향성 필터링 테스트 완료!');
    
    if (resultWithFilter.rest_areas.length < resultWithoutFilter.rest_areas.length && 
        seoulDirectionAreasFiltered.length === 0) {
      console.log('🎉 방향성 필터링이 정상적으로 작동하고 있습니다!');
    } else {
      console.log('⚠️ 방향성 필터링에 문제가 있을 수 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testDirectionFiltering();