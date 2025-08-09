#!/usr/bin/env node

/**
 * 간단한 방향성 필터링 테스트
 * 환경변수 없이 restAreaMatcher 직접 테스트
 */

import dotenv from 'dotenv';
import { restAreaMatcher } from '../src/lib/restAreaMatcher';
import { Coordinates, RestArea } from '../src/types/map';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

const testRestAreas: RestArea[] = [
  // 서울 방향 휴게소들 (반대방향)
  {
    id: 'test1',
    name: '목감(서울)',
    coordinates: { lat: 37.2500, lng: 126.9500 },
    routeCode: '1',
    routeName: '경부고속도로',
    direction: '서울방향',
    address: '경기도 용인시',
    phoneNumber: '031-123-4567',
    facilities: ['주유소', '휴게실'],
    operatingHours: '24시간',
    serviceType: '휴게소'
  },
  {
    id: 'test2',
    name: '양산(서울)',
    coordinates: { lat: 35.3400, lng: 129.0000 },
    routeCode: '1',
    routeName: '경부고속도로',
    direction: '서울방향',
    address: '경남 양산시',
    phoneNumber: '055-123-4567',
    facilities: ['주유소', '휴게실'],
    operatingHours: '24시간',
    serviceType: '휴게소'
  },
  // 부산 방향 휴게소들 (올바른 방향)
  {
    id: 'test3',
    name: '기흥(부산)',
    coordinates: { lat: 37.2700, lng: 127.1000 },
    routeCode: '1',
    routeName: '경부고속도로',
    direction: '부산방향',
    address: '경기도 용인시 기흥구',
    phoneNumber: '031-234-5678',
    facilities: ['주유소', '휴게실', '식당'],
    operatingHours: '24시간',
    serviceType: '휴게소'
  },
  {
    id: 'test4',
    name: '언양(부산)',
    coordinates: { lat: 35.3600, lng: 129.0200 },
    routeCode: '1',
    routeName: '경부고속도로',
    direction: '부산방향',
    address: '울산 울주군',
    phoneNumber: '052-345-6789',
    facilities: ['주유소', '휴게실'],
    operatingHours: '24시간',
    serviceType: '휴게소'
  }
];

const routeCoordinates: Coordinates[] = [
  { lat: 37.5547, lng: 126.9706 }, // 서울역
  { lat: 37.2636, lng: 127.0286 }, // 수원
  { lat: 36.3504, lng: 127.3845 }, // 대전
  { lat: 35.8722, lng: 128.6025 }, // 대구
  { lat: 35.1796, lng: 129.0756 }, // 부산역
];

console.log('🧪 간단한 방향성 필터링 테스트');
console.log('═'.repeat(60));

async function testSimpleDirectionFilter() {
  try {
    console.log('📍 테스트 경로: 서울역 → 부산역');
    console.log('🏪 테스트 휴게소:');
    testRestAreas.forEach(area => {
      console.log(`   - ${area.name} (${area.direction})`);
    });
    console.log('');

    // 테스트 1: 방향성 필터링 OFF
    console.log('🔄 테스트 1: 방향성 필터링 비활성화');
    console.log('─'.repeat(50));
    
    const resultWithoutFilter = await restAreaMatcher.matchRestAreasToRoute(
      routeCoordinates,
      testRestAreas,
      {
        enableDirectionFilter: false,
        maxDistance: 50,
        minInterval: 1,
        maxResults: 10
      }
    );

    console.log(`📊 결과: ${resultWithoutFilter.length}개 휴게소`);
    resultWithoutFilter.forEach((ra, index) => {
      console.log(`  ${index + 1}. ${ra.name} - ${ra.accessibleDirection}`);
    });
    console.log('');

    // 테스트 2: 방향성 필터링 ON
    console.log('🧭 테스트 2: 방향성 필터링 활성화');
    console.log('─'.repeat(50));
    
    const resultWithFilter = await restAreaMatcher.matchRestAreasToRoute(
      routeCoordinates,
      testRestAreas,
      {
        enableDirectionFilter: true,
        directionStrictMode: true,
        directionConfidenceThreshold: 0.7,
        includeAmbiguousDirection: false,
        maxDistance: 50,
        minInterval: 1,
        maxResults: 10
      }
    );

    console.log(`📊 결과: ${resultWithFilter.length}개 휴게소`);
    resultWithFilter.forEach((ra, index) => {
      const accessIcon = ra.isAccessible ? '✅' : '❌';
      const confidenceStr = `${Math.round(ra.directionConfidence * 100)}%`;
      console.log(`  ${index + 1}. ${accessIcon} ${ra.name} - ${ra.accessibleDirection} [신뢰도: ${confidenceStr}]`);
      console.log(`      📝 근거: ${ra.directionReasons.join(', ')}`);
    });
    console.log('');

    // 결과 분석
    console.log('📈 필터링 효과 분석');
    console.log('═'.repeat(60));
    
    const seoulDirectionBefore = resultWithoutFilter.filter(ra => ra.name.includes('(서울)')).length;
    const seoulDirectionAfter = resultWithFilter.filter(ra => ra.name.includes('(서울)')).length;
    const busanDirectionAfter = resultWithFilter.filter(ra => ra.name.includes('(부산)')).length;

    console.log(`🔄 필터링 OFF: ${resultWithoutFilter.length}개 휴게소 (서울방향 ${seoulDirectionBefore}개 포함)`);
    console.log(`🧭 필터링 ON: ${resultWithFilter.length}개 휴게소 (서울방향 ${seoulDirectionAfter}개, 부산방향 ${busanDirectionAfter}개)`);
    
    if (seoulDirectionAfter === 0 && busanDirectionAfter > 0) {
      console.log('✅ 방향성 필터링이 정상 작동! 반대방향 휴게소가 모두 제거되었습니다.');
    } else if (seoulDirectionAfter > 0) {
      console.log('❌ 문제: 여전히 반대방향 휴게소가 남아있습니다.');
    } else {
      console.log('⚠️ 모든 휴게소가 필터링되었습니다. 필터링 조건을 확인하세요.');
    }
    
    console.log('');
    console.log('✅ 간단한 방향성 필터링 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testSimpleDirectionFilter();