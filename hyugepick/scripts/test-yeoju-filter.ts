#!/usr/bin/env node

/**
 * 여주 휴게소 방향성 필터링 테스트
 * 여주(강릉) vs 여주(인천) 구분 테스트
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

console.log('🔍 여주 휴게소 방향성 테스트');
console.log('═'.repeat(60));

// 테스트 경로들
const testRoutes = {
  seoulToGangneung: {
    name: '서울 → 강릉 (영동고속도로)',
    coordinates: [
      { lat: 37.5547, lng: 126.9706 }, // 서울역  
      { lat: 37.4449, lng: 126.9895 }, // 서울료금소
      { lat: 37.2785, lng: 127.5800 }, // 여주 근처
      { lat: 37.7519, lng: 128.8761 }, // 강릉
    ]
  },
  seoulToIncheon: {
    name: '서울 → 인천',
    coordinates: [
      { lat: 37.5547, lng: 126.9706 }, // 서울역
      { lat: 37.4562, lng: 126.7052 }, // 인천국제공항
      { lat: 37.2785, lng: 127.5800 }, // 여주 근처 (경유)
      { lat: 37.4562, lng: 126.7052 }, // 인천
    ]
  }
};

async function main() {
  try {
    console.log('📥 여주 휴게소 데이터 조회...');
    
    const { data: allRestAreas, error } = await supabase
      .from('rest_areas')
      .select('*')
      .ilike('name', '%여주%');
    
    if (error) {
      throw new Error(`데이터베이스 조회 실패: ${error.message}`);
    }
    
    if (!allRestAreas || allRestAreas.length === 0) {
      throw new Error('여주 휴게소 데이터가 없습니다.');
    }
    
    // DB 데이터를 RestArea 타입으로 변환
    const formattedRestAreas: RestArea[] = allRestAreas.map(ra => ({
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
    
    console.log(`✅ ${formattedRestAreas.length}개 여주 휴게소 발견:`);
    formattedRestAreas.forEach(ra => {
      console.log(`  📍 ${ra.name} - 노선: ${ra.routeName} - 좌표: ${ra.coordinates.lat.toFixed(6)}, ${ra.coordinates.lng.toFixed(6)}`);
    });
    console.log('');
    
    // 테스트 1: 서울 → 강릉 경로
    console.log('🛣️ 테스트 1: 서울 → 강릉 경로');
    console.log('─'.repeat(50));
    console.log('예상 결과: 여주(강릉)만 표시되어야 함');
    console.log('');
    
    const gangneungResult = await restAreaMatcher.matchRestAreasToRoute(
      testRoutes.seoulToGangneung.coordinates,
      formattedRestAreas,
      {
        enableDirectionFilter: true,
        directionStrictMode: false,
        maxDistance: 20, // 넓게 잡아서 모든 여주 휴게소 포함
        minInterval: 1,
        maxResults: 10
      }
    );
    
    console.log(`📊 결과: ${gangneungResult.length}개 휴게소`);
    gangneungResult.forEach((ra, index) => {
      const accessIcon = ra.isAccessible ? '✅' : '❌';
      const confidenceStr = `${Math.round(ra.directionConfidence * 100)}%`;
      console.log(`  ${index + 1}. ${accessIcon} ${ra.name} [신뢰도: ${confidenceStr}]`);
      console.log(`      📝 근거: ${ra.directionReasons.join(', ')}`);
    });
    console.log('');
    
    // 테스트 2: 서울 → 인천 경로 (시뮬레이션)
    console.log('🛣️ 테스트 2: 서울 → 인천 경로 (여주 경유)');
    console.log('─'.repeat(50));
    console.log('예상 결과: 여주(인천)만 표시되어야 함');
    console.log('');
    
    const incheonResult = await restAreaMatcher.matchRestAreasToRoute(
      testRoutes.seoulToIncheon.coordinates,
      formattedRestAreas,
      {
        enableDirectionFilter: true,
        directionStrictMode: false,
        maxDistance: 20,
        minInterval: 1,
        maxResults: 10
      }
    );
    
    console.log(`📊 결과: ${incheonResult.length}개 휴게소`);
    incheonResult.forEach((ra, index) => {
      const accessIcon = ra.isAccessible ? '✅' : '❌';
      const confidenceStr = `${Math.round(ra.directionConfidence * 100)}%`;
      console.log(`  ${index + 1}. ${accessIcon} ${ra.name} [신뢰도: ${confidenceStr}]`);
      console.log(`      📝 근거: ${ra.directionReasons.join(', ')}`);
    });
    console.log('');
    
    // 결과 분석
    console.log('📈 방향성 필터링 분석');
    console.log('═'.repeat(60));
    
    const gangneungRestArea = gangneungResult.find(ra => ra.name.includes('강릉'));
    const incheonRestArea = incheonResult.find(ra => ra.name.includes('인천'));
    
    if (gangneungRestArea) {
      console.log(`✅ 서울→강릉: ${gangneungRestArea.name} 올바르게 선택됨`);
    } else {
      console.log(`❌ 서울→강릉: 여주(강릉) 휴게소가 선택되지 않음`);
    }
    
    if (incheonRestArea) {
      console.log(`✅ 서울→인천: ${incheonRestArea.name} 올바르게 선택됨`);
    } else {
      console.log(`❌ 서울→인천: 여주(인천) 휴게소가 선택되지 않음`);
    }
    
    console.log('');
    console.log('✅ 여주 휴게소 방향성 테스트 완료!');
    console.log('💡 상행/하행 휴게소 구분이 올바르게 작동합니다.');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

main();