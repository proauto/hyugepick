/**
 * 서울역→부산역 경로의 휴게소 거리 디버깅 스크립트
 * 기흥복합, 서여주(창원), 양산(서울) 휴게소가 왜 500m 필터를 통과하는지 확인
 */

import { routeRestAreaService } from '../src/lib/routeRestAreaService';
import { routeAPI } from '../src/lib/routeApi';
import { highwayAPIWithDB } from '../src/lib/highwayApiWithDB';

// 좌표 정의
const SEOUL_STATION = { lat: 37.554722, lng: 126.970833 }; // 서울역
const BUSAN_STATION = { lat: 35.115026, lng: 129.041383 }; // 부산역

// 문제가 되는 휴게소들
const PROBLEMATIC_REST_AREAS = [
  '기흥복합',
  '서여주',
  '양산'
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

async function debugRouteDistance() {
  console.log('🔍 서울역→부산역 경로 휴게소 거리 디버깅 시작\n');
  console.log('=' .repeat(80));
  
  try {
    // 1. 경로 계산
    console.log('📍 1단계: 경로 계산 중...');
    const routeInfo = await routeAPI.calculateRoute(SEOUL_STATION, BUSAN_STATION);
    console.log(`  - 총 거리: ${(routeInfo.distance / 1000).toFixed(1)}km`);
    console.log(`  - 총 시간: ${Math.round(routeInfo.duration / 60)}분`);
    console.log(`  - 경로 포인트 수: ${routeInfo.path.length}개\n`);
    
    // 2. 모든 휴게소 조회
    console.log('📍 2단계: 모든 휴게소 데이터 조회 중...');
    const allRestAreas = await highwayAPIWithDB.getRestAreas();
    console.log(`  - 전체 휴게소 수: ${allRestAreas.length}개\n`);
    
    // 3. 문제가 되는 휴게소들 찾기
    console.log('📍 3단계: 문제 휴게소 분석');
    console.log('=' .repeat(80));
    
    for (const problematicName of PROBLEMATIC_REST_AREAS) {
      const restAreas = allRestAreas.filter(ra => 
        ra.name.includes(problematicName)
      );
      
      if (restAreas.length === 0) {
        console.log(`\n⚠️ "${problematicName}" 휴게소를 찾을 수 없습니다.`);
        continue;
      }
      
      for (const restArea of restAreas) {
        console.log(`\n🏪 휴게소: ${restArea.name}`);
        console.log(`  - 위치: ${restArea.coordinates.lat}, ${restArea.coordinates.lng}`);
        console.log(`  - 도로명: ${restArea.routeName || '없음'}`);
        console.log(`  - 노선코드: ${restArea.routeCode || '없음'}`);
        console.log(`  - 방향: ${restArea.direction || '없음'}`);
        
        // 경로로부터 최소 거리 계산
        const distanceInfo = getMinDistanceFromRoute(
          restArea.coordinates,
          routeInfo.path
        );
        
        console.log(`\n  📏 거리 분석:`);
        console.log(`    - 경로로부터 최소 거리: ${distanceInfo.distance.toFixed(1)}m`);
        console.log(`    - 500m 필터 통과 여부: ${distanceInfo.distance <= 500 ? '✅ 통과' : '❌ 차단'}`);
        
        if (distanceInfo.distance <= 500) {
          console.log(`    ⚠️ 문제: 500m 이내에 있어서 필터를 통과함!`);
          console.log(`    - 가장 가까운 경로 포인트: ${distanceInfo.closestPoint.lat}, ${distanceInfo.closestPoint.lng}`);
          console.log(`    - 경로상 위치: ${distanceInfo.index}/${routeInfo.path.length} (${((distanceInfo.index/routeInfo.path.length)*100).toFixed(1)}%)`);
        } else if (distanceInfo.distance <= 1000) {
          console.log(`    💡 참고: 1km 이내에 있음 (${distanceInfo.distance.toFixed(1)}m)`);
        }
        
        // 직선 거리도 계산 (참고용)
        const directDistanceFromStart = calculateDistance(restArea.coordinates, SEOUL_STATION);
        const directDistanceFromEnd = calculateDistance(restArea.coordinates, BUSAN_STATION);
        console.log(`\n  📐 직선 거리 (참고):`);
        console.log(`    - 서울역으로부터: ${(directDistanceFromStart/1000).toFixed(1)}km`);
        console.log(`    - 부산역으로부터: ${(directDistanceFromEnd/1000).toFixed(1)}km`);
      }
    }
    
    // 4. 500m 이내의 모든 휴게소 찾기
    console.log('\n' + '=' .repeat(80));
    console.log('📍 4단계: 500m 필터를 통과하는 모든 휴게소 확인\n');
    
    const nearbyRestAreas = [];
    for (const restArea of allRestAreas) {
      const distanceInfo = getMinDistanceFromRoute(
        restArea.coordinates,
        routeInfo.path
      );
      
      if (distanceInfo.distance <= 500) {
        nearbyRestAreas.push({
          name: restArea.name,
          distance: distanceInfo.distance,
          routeName: restArea.routeName,
          direction: restArea.direction
        });
      }
    }
    
    // 거리순 정렬
    nearbyRestAreas.sort((a, b) => a.distance - b.distance);
    
    console.log(`✅ 500m 이내 휴게소: ${nearbyRestAreas.length}개\n`);
    nearbyRestAreas.forEach((ra, index) => {
      console.log(`${index + 1}. ${ra.name}`);
      console.log(`   - 거리: ${ra.distance.toFixed(1)}m`);
      console.log(`   - 도로: ${ra.routeName || '정보없음'}`);
      console.log(`   - 방향: ${ra.direction || '정보없음'}`);
    });
    
    // 5. 필터 설정 확인
    console.log('\n' + '=' .repeat(80));
    console.log('📍 5단계: 현재 필터 설정 확인\n');
    
    // RouteRestAreaService의 실제 결과 확인
    console.log('RouteRestAreaService 실행 중...');
    const serviceResult = await routeRestAreaService.getRouteWithRestAreas(
      SEOUL_STATION,
      BUSAN_STATION
    );
    
    console.log(`\n최종 필터링 결과: ${serviceResult.rest_areas.length}개 휴게소`);
    
    // 문제 휴게소가 포함되었는지 확인
    const includedProblematic = serviceResult.rest_areas.filter(ra =>
      PROBLEMATIC_REST_AREAS.some(name => ra.name.includes(name))
    );
    
    if (includedProblematic.length > 0) {
      console.log('\n⚠️ 문제 휴게소가 최종 결과에 포함됨:');
      includedProblematic.forEach(ra => {
        console.log(`  - ${ra.name}`);
      });
    } else {
      console.log('\n✅ 문제 휴게소들이 모두 필터링되었습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
debugRouteDistance().then(() => {
  console.log('\n' + '=' .repeat(80));
  console.log('🏁 디버깅 완료');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});