#!/usr/bin/env node

/**
 * 방향성 기반 휴게소 필터링 테스트 스크립트
 * 서울역 → 부산역 경로에서 접근 가능한 휴게소만 필터링
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { restAreaMatcher } from '../src/lib/restAreaMatcher';
import { Coordinates, RestArea } from '../src/types/map';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 필수 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧭 방향성 기반 휴게소 필터링 테스트');
console.log('═'.repeat(60));
console.log('📍 테스트 경로: 서울역 → 부산역');
console.log('🎯 목표: 하행선(부산방향) 휴게소만 필터링');
console.log('');

// 서울역 → 부산역 경부고속도로 주요 경로
const routeCoordinates: Coordinates[] = [
  { lat: 37.5547, lng: 126.9706 }, // 서울역
  { lat: 37.4449, lng: 126.9895 }, // 서울료금소
  { lat: 37.3012, lng: 127.0108 }, // 과천
  { lat: 37.2636, lng: 127.0286 }, // 수원
  { lat: 37.1567, lng: 127.0728 }, // 기흥
  { lat: 37.0045, lng: 127.2582 }, // 용인
  { lat: 36.8065, lng: 127.1121 }, // 천안
  { lat: 36.6424, lng: 127.2021 }, // 천안논산고속도로 분기점
  { lat: 36.3504, lng: 127.3845 }, // 대전
  { lat: 36.1776, lng: 127.4419 }, // 대전 남부
  { lat: 35.9663, lng: 127.7456 }, // 옥천
  { lat: 35.8955, lng: 128.0223 }, // 영동
  { lat: 35.8722, lng: 128.6025 }, // 대구
  { lat: 35.7480, lng: 128.7324 }, // 경산
  { lat: 35.5462, lng: 128.7952 }, // 청도
  { lat: 35.4608, lng: 128.8776 }, // 밀양
  { lat: 35.3369, lng: 128.9853 }, // 양산
  { lat: 35.1796, lng: 129.0756 }, // 부산역
];

async function main() {
  try {
    console.log('📥 데이터베이스에서 휴게소 목록 조회...');
    
    const { data: restAreas, error } = await supabase
      .from('rest_areas')
      .select('*')
      .order('name');
    
    if (error) {
      throw new Error(`데이터베이스 조회 실패: ${error.message}`);
    }
    
    if (!restAreas || restAreas.length === 0) {
      throw new Error('휴게소 데이터가 없습니다.');
    }
    
    // DB 데이터를 RestArea 타입으로 변환
    const formattedRestAreas: RestArea[] = restAreas.map(ra => ({
      id: ra.id || ra.unit_code,
      name: ra.name,
      coordinates: { lat: ra.lat, lng: ra.lng },
      routeCode: ra.route_code,
      routeName: ra.route_name,
      direction: ra.direction,
      address: ra.address || '',
      phoneNumber: ra.phone || '',
      facilities: ra.facilities || [],
      operatingHours: ra.operating_hours || '24시간',
      serviceType: ra.service_type || '휴게소'
    }));
    
    console.log(`✅ ${formattedRestAreas.length}개 휴게소 데이터 로드 완료`);
    console.log('');
    
    // 테스트 1: 방향성 필터링 OFF
    console.log('🔄 테스트 1: 방향성 필터링 비활성화');
    console.log('─'.repeat(50));
    
    const resultWithoutFilter = await restAreaMatcher.matchRestAreasToRoute(
      routeCoordinates,
      formattedRestAreas,
      {
        enableDirectionFilter: false,
        maxDistance: 2, // 2km 반경으로 수정
        minInterval: 5, // 간격 줄여서 더 많은 휴게소 표시
        maxResults: 20
      }
    );
    
    console.log(`📊 결과: ${resultWithoutFilter.length}개 휴게소`);
    resultWithoutFilter.forEach((ra, index) => {
      console.log(`  ${index + 1}. ${ra.name} (${ra.direction || '방향불명'}) - ${ra.distanceFromStart}km`);
    });
    console.log('');
    
    // 테스트 2: 방향성 필터링 ON (일반 모드)
    console.log('🧭 테스트 2: 방향성 필터링 활성화 (일반 모드)');
    console.log('─'.repeat(50));
    
    const resultWithFilter = await restAreaMatcher.matchRestAreasToRoute(
      routeCoordinates,
      formattedRestAreas,
      {
        enableDirectionFilter: true,
        directionStrictMode: false,
        directionConfidenceThreshold: 0.6,
        includeAmbiguousDirection: true,
        maxDistance: 2, // 2km 반경으로 수정
        minInterval: 5, // 간격 줄여서 더 많은 휴게소 표시
        maxResults: 20
      }
    );
    
    console.log(`📊 결과: ${resultWithFilter.length}개 휴게소`);
    resultWithFilter.forEach((ra, index) => {
      const accessIcon = ra.isAccessible ? '✅' : '❌';
      const confidenceStr = `${Math.round(ra.directionConfidence * 100)}%`;
      console.log(`  ${index + 1}. ${accessIcon} ${ra.name} (${ra.accessibleDirection}) - ${ra.distanceFromStart}km [신뢰도: ${confidenceStr}]`);
      
      if (ra.directionReasons.length > 0) {
        console.log(`      📝 근거: ${ra.directionReasons.join(', ')}`);
      }
    });
    console.log('');
    
    // 테스트 3: 방향성 필터링 ON (엄격 모드)
    console.log('🔒 테스트 3: 방향성 필터링 활성화 (엄격 모드)');
    console.log('─'.repeat(50));
    
    const resultStrictMode = await restAreaMatcher.matchRestAreasToRoute(
      routeCoordinates,
      formattedRestAreas,
      {
        enableDirectionFilter: true,
        directionStrictMode: true,
        directionConfidenceThreshold: 0.8,
        includeAmbiguousDirection: false,
        maxDistance: 2, // 2km 반경으로 수정
        minInterval: 5, // 간격 줄여서 더 많은 휴게소 표시
        maxResults: 20
      }
    );
    
    console.log(`📊 결과: ${resultStrictMode.length}개 휴게소`);
    resultStrictMode.forEach((ra, index) => {
      const confidenceStr = `${Math.round(ra.directionConfidence * 100)}%`;
      console.log(`  ${index + 1}. ✅ ${ra.name} (${ra.accessibleDirection}) - ${ra.distanceFromStart}km [신뢰도: ${confidenceStr}]`);
    });
    console.log('');
    
    // 결과 비교
    console.log('📈 결과 비교 분석');
    console.log('═'.repeat(60));
    console.log(`🔄 필터링 OFF: ${resultWithoutFilter.length}개 휴게소`);
    console.log(`🧭 필터링 ON (일반): ${resultWithFilter.length}개 휴게소`);
    console.log(`🔒 필터링 ON (엄격): ${resultStrictMode.length}개 휴게소`);
    console.log('');
    
    const reductionRate = ((resultWithoutFilter.length - resultWithFilter.length) / resultWithoutFilter.length * 100);
    console.log(`📊 필터링 효과: ${reductionRate.toFixed(1)}% 감소`);
    
    // 민자고속도로 휴게소 확인
    const privateRestAreas = resultWithFilter.filter(ra => 
      ra.name.includes('청도새마을') || ra.name.includes('정안알밤') || 
      ra.name.includes('가평') || ra.name.includes('고양')
    );
    
    if (privateRestAreas.length > 0) {
      console.log('');
      console.log('🛣️ 민자고속도로 휴게소 발견:');
      privateRestAreas.forEach(ra => {
        console.log(`  ✅ ${ra.name} (${ra.accessibleDirection}) - 신뢰도: ${Math.round(ra.directionConfidence * 100)}%`);
      });
    }
    
    console.log('');
    console.log('✅ 방향성 필터링 테스트 완료!');
    console.log('💡 이제 서울→부산 경로에서 올바른 방향의 휴게소만 표시됩니다.');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

main();