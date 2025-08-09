/**
 * 서울역→부산역 경로에서 누락된 휴게소들 디버깅
 * 용인(강릉), 덕평(강릉), 여주(강릉), 청도새마을휴게소(부산)이 왜 필터링되는지 확인
 */

import { Coordinates } from '@/types/map';
import { highwayAPIWithDB } from '../src/lib/highwayApiWithDB';
import { unifiedRestAreaFilter } from '../src/lib/unifiedRestAreaFilter';
import { routeAPI } from '../src/lib/routeApi';

// 좌표 정의
const SEOUL_STATION = { lat: 37.554722, lng: 126.970833 }; // 서울역
const BUSAN_STATION = { lat: 35.115026, lng: 129.041383 }; // 부산역

// 누락된 휴게소들 (예상)
const MISSING_REST_AREAS = [
  '용인',
  '덕평', 
  '여주',
  '청도새마을'
];

// 두 지점 간 거리 계산 (미터)
function calculateDistance(point1: any, point2: any): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 경로로부터 휴게소까지 최소 거리 계산
function getMinDistanceFromRoute(
  restAreaCoord: any,
  routeCoordinates: any[]
): { distance: number; closestPoint: any; index: number } {
  let minDistance = Infinity;
  let closestPoint = null;
  let closestIndex = -1;
  
  for (let i = 0; i < routeCoordinates.length; i++) {
    const distance = calculateDistance(restAreaCoord, routeCoordinates[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = routeCoordinates[i];
      closestIndex = i;
    }
  }
  
  return {
    distance: minDistance,
    closestPoint,
    index: closestIndex
  };
}

async function debugMissingRestAreas() {
  console.log('🔍 누락된 휴게소 디버깅 시작');
  console.log('=' .repeat(80));
  
  try {
    // 1. 경로 계산
    console.log('📍 1단계: 서울역→부산역 경로 계산 중...');
    const routeInfo = await routeAPI.calculateRoute(SEOUL_STATION, BUSAN_STATION);
    console.log(`  - 총 거리: ${(routeInfo.distance / 1000).toFixed(1)}km`);
    console.log(`  - 총 시간: ${Math.round(routeInfo.duration / 60)}분`);
    console.log(`  - 경로 포인트 수: ${routeInfo.path.length}개\n`);
    
    // 2. 모든 휴게소 조회
    console.log('📍 2단계: 모든 휴게소 데이터 조회 중...');
    const allRestAreas = await highwayAPIWithDB.getRestAreas();
    console.log(`  - 전체 휴게소 수: ${allRestAreas.length}개\n`);
    
    // 3. 누락된 휴게소들 찾기 및 분석
    console.log('📍 3단계: 누락된 휴게소들 분석');
    console.log('=' .repeat(80));
    
    for (const missingName of MISSING_REST_AREAS) {
      const restAreas = allRestAreas.filter(ra => 
        ra.name.toLowerCase().includes(missingName.toLowerCase())
      );
      
      if (restAreas.length === 0) {
        console.log(`\n⚠️ "${missingName}" 휴게소를 DB에서 찾을 수 없습니다.`);
        continue;
      }
      
      for (const restArea of restAreas) {
        console.log(`\n🏪 휴게소: ${restArea.name}`);
        console.log(`  - 위치: ${restArea.coordinates.lat.toFixed(6)}, ${restArea.coordinates.lng.toFixed(6)}`);
        console.log(`  - 도로명: ${'없음'}`);
        console.log(`  - 노선코드: ${restArea.routeCode || '없음'}`);
        console.log(`  - 방향: ${restArea.direction || '없음'}`);
        
        // 경로로부터 최소 거리 계산
        const distanceInfo = getMinDistanceFromRoute(
          restArea.coordinates,
          routeInfo.path
        );
        
        console.log(`\n  📏 거리 분석:`);
        console.log(`    - 경로로부터 최소 거리: ${(distanceInfo.distance/1000).toFixed(2)}km`);
        console.log(`    - 2km 필터 통과 여부: ${distanceInfo.distance <= 2000 ? '✅ 통과' : '❌ 차단'}`);
        console.log(`    - 5km 필터 통과 여부: ${distanceInfo.distance <= 5000 ? '✅ 통과' : '❌ 차단'}`);
        console.log(`    - 가장 가까운 경로 포인트: ${distanceInfo.closestPoint.lat.toFixed(6)}, ${distanceInfo.closestPoint.lng.toFixed(6)}`);
        console.log(`    - 경로상 위치: ${distanceInfo.index}/${routeInfo.path.length} (${((distanceInfo.index/routeInfo.path.length)*100).toFixed(1)}%)`);
        
        // 도로 분석 (routeName 속성 사용 불가로 인해 주석 처리)
        // if (restArea.routeName) {
        //   if (restArea.routeName.includes('영동')) {
        //     console.log(`    🛣️ 영동고속도로 휴게소`);
        //   } else if (restArea.routeName.includes('중앙')) {
        //     console.log(`    🛣️ 중앙고속도로 휴게소`);
        //   } else if (restArea.routeName.includes('경부')) {
        //     console.log(`    🛣️ 경부고속도로 휴게소`);
        //   }
        // }
      }
    }
    
    // 4. 실제 필터링 테스트
    console.log('\n' + '=' .repeat(80));
    console.log('📍 4단계: 실제 필터링 결과 테스트\n');
    
    console.log('🔍 UnifiedRestAreaFilter로 필터링 중...');
    const filteredRestAreas = await unifiedRestAreaFilter.filterRestAreasForRoute(
      routeInfo.path,
      SEOUL_STATION,
      BUSAN_STATION
    );
    
    console.log(`\n✅ 필터링 결과: ${filteredRestAreas.length}개 휴게소`);
    
    // 누락된 휴게소가 결과에 포함되어 있는지 확인
    const foundMissing = [];
    const stillMissing = [];
    
    for (const missingName of MISSING_REST_AREAS) {
      const found = filteredRestAreas.some(ra => 
        ra.name.toLowerCase().includes(missingName.toLowerCase())
      );
      
      if (found) {
        foundMissing.push(missingName);
      } else {
        stillMissing.push(missingName);
      }
    }
    
    if (foundMissing.length > 0) {
      console.log(`\n✅ 발견된 휴게소: ${foundMissing.join(', ')}`);
    }
    
    if (stillMissing.length > 0) {
      console.log(`\n❌ 여전히 누락된 휴게소: ${stillMissing.join(', ')}`);
      
      // 누락된 이유 분석
      console.log('\n💡 누락 이유 분석:');
      for (const missingName of stillMissing) {
        const restAreas = allRestAreas.filter(ra => 
          ra.name.toLowerCase().includes(missingName.toLowerCase())
        );
        
        for (const restArea of restAreas) {
          const distanceInfo = getMinDistanceFromRoute(
            restArea.coordinates,
            routeInfo.path
          );
          
          console.log(`\n  ${restArea.name}:`);
          if (distanceInfo.distance > 2000) {
            console.log(`    - 거리 필터에서 제외: ${(distanceInfo.distance/1000).toFixed(2)}km > 2km`);
          }
          // routeName 속성 사용 불가로 인해 주석 처리
          // if (restArea.routeName && !restArea.routeName.includes('경부')) {
          //   console.log(`    - 비경부선 휴게소: ${restArea.routeName}`);
          // }
          if (restArea.direction) {
            console.log(`    - 방향 정보: ${restArea.direction}`);
          }
        }
      }
    }
    
    // 5. 현재 필터링된 휴게소 목록 출력 (도로별)
    console.log('\n' + '=' .repeat(80));
    console.log('📍 5단계: 현재 필터링된 휴게소 목록 (도로별)\n');
    
    // routeName 속성 사용 불가로 인해 주석 처리
    // const byRoute = {};
    // filteredRestAreas.forEach(ra => {
    //   const routeName = ra.routeName || '미분류';
    //   if (!byRoute[routeName]) byRoute[routeName] = [];
    //   byRoute[routeName].push(ra.name);
    // });
    
    console.log(`🛣️ 전체: ${filteredRestAreas.length}개`);
    filteredRestAreas.forEach((ra, index) => {
      console.log(`  ${index + 1}. ${ra.name}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
debugMissingRestAreas().then(() => {
  console.log('\n' + '=' .repeat(80));
  console.log('🏁 디버깅 완료');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});