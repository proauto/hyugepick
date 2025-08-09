#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function testIntegratedFiltering() {
  console.log('🧪 통합 필터링 시스템 테스트');
  console.log('═'.repeat(50));

  // 서울역 → 부산역 좌표
  const origin = { lat: 37.5665, lng: 126.9780 };
  const destination = { lat: 35.1796, lng: 129.0756 };

  try {
    // 1. 경로 계산
    console.log('📍 1단계: 경로 계산 중...');
    const routeResponse = await fetch('http://localhost:3000/api/route/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination })
    });

    if (!routeResponse.ok) {
      throw new Error(`경로 계산 실패: ${routeResponse.status}`);
    }

    const routeData = await routeResponse.json();
    console.log(`✅ 경로 계산 완료: ${(routeData.distance / 1000).toFixed(1)}km`);

    // 2. 통합 필터링 테스트 (frontend처럼)
    console.log('\n🎯 2단계: 통합 필터링 테스트 중...');
    
    // 실제로 frontend에서 사용하는 방식과 동일하게 테스트
    const testData = {
      origin,
      destination,
      routeCoordinates: routeData.path || [origin, destination],
      options: {
        maxDistance: 8.0,
        minInterval: 8.0,  
        maxResults: 20,
        confidenceThreshold: 0.3,
        includePrivateHighways: true
      }
    };

    // 모의 테스트 (실제 unifiedRestAreaFilter는 클라이언트 전용)
    console.log('📋 테스트 조건:');
    console.log(`  - 경로: 서울역 → 부산역 (${(routeData.distance / 1000).toFixed(1)}km)`);
    console.log(`  - 최대거리: ${testData.options.maxDistance}km`);
    console.log(`  - 최소간격: ${testData.options.minInterval}km`);
    console.log(`  - 최대결과: ${testData.options.maxResults}개`);
    console.log(`  - 신뢰도임계값: ${testData.options.confidenceThreshold}`);

    // 3. API 엔드포인트 테스트
    console.log('\n🔄 3단계: API 엔드포인트 테스트 중...');
    const restAreasResponse = await fetch('http://localhost:3000/api/route/rest-areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        maxDistance: 8,
        minInterval: 8,
        maxResults: 20,
        enableDirectionFilter: true,
        directionStrictMode: false,
        directionConfidenceThreshold: 0.3,
        includeAmbiguousDirection: true
      })
    });

    if (!restAreasResponse.ok) {
      throw new Error(`휴게소 API 실패: ${restAreasResponse.status}`);
    }

    const restAreasData = await restAreasResponse.json();
    console.log(`✅ API 테스트 완료: ${restAreasData.rest_areas.length}개 휴게소`);

    // 4. 결과 분석
    console.log('\n📊 4단계: 결과 분석');
    console.log('═'.repeat(30));
    
    const restAreas = restAreasData.rest_areas || [];
    console.log(`총 휴게소 개수: ${restAreas.length}개`);
    
    if (restAreas.length >= 10 && restAreas.length <= 25) {
      console.log('✅ 적절한 개수의 휴게소가 필터링되었습니다!');
    } else {
      console.log(`⚠️ 휴게소 개수가 예상 범위(10-25개)를 벗어났습니다: ${restAreas.length}개`);
    }

    // 현풍 휴게소 검사
    const hyeonpungFound = restAreas.some((area: any) => 
      area.name && area.name.includes('현풍')
    );
    
    if (hyeonpungFound) {
      console.log('❌ 현풍 휴게소가 여전히 결과에 포함되어 있습니다!');
    } else {
      console.log('✅ 현풍 휴게소가 성공적으로 필터링되었습니다!');
    }

    // 샘플 휴게소 출력
    console.log('\n📋 상위 5개 휴게소:');
    restAreas.slice(0, 5).forEach((area: any, i: number) => {
      console.log(`  ${i+1}. ${area.name} (${area.route_name || '노선정보없음'})`);
    });

    console.log('\n🎉 통합 필터링 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testIntegratedFiltering().catch(console.error);