/**
 * 서버 API 테스트 스크립트
 * IC 기반 필터링이 실제로 작동하는지 확인
 */

const SERVER_URL = 'http://localhost:3000';

// 테스트 경로 (서울 → 부산)
const testRoute = {
  origin: { lat: 37.5665, lng: 126.9780 }, // 서울 시청
  destination: { lat: 35.1796, lng: 129.0756 } // 부산 시청
};

async function testServerAPI() {
  console.log('🧪 서버 API 테스트 시작');
  console.log(`📡 서버: ${SERVER_URL}`);
  console.log('═'.repeat(60));

  try {
    // 1. 서버 상태 확인
    console.log('1️⃣ 서버 상태 확인...');
    
    const healthResponse = await fetch(`${SERVER_URL}/api/health`).catch(() => null);
    
    if (!healthResponse || !healthResponse.ok) {
      console.log('⚠️ Health API 없음, 메인 페이지로 테스트');
      
      // 메인 페이지 확인
      const mainResponse = await fetch(SERVER_URL);
      if (mainResponse.ok) {
        console.log('✅ 서버 정상 동작 중');
      } else {
        throw new Error('서버 응답 없음');
      }
    } else {
      console.log('✅ 서버 헬스체크 통과');
    }

    // 2. 경로 계산 API 테스트
    console.log('\n2️⃣ 경로 계산 API 테스트...');
    
    const routePayload = {
      origin: testRoute.origin,
      destination: testRoute.destination,
      options: {
        matching: {
          enableDirectionFilter: true,
          useICBasedFilter: true,
          directionStrictMode: true
        }
      }
    };

    console.log('📤 요청 데이터:', JSON.stringify(routePayload, null, 2));

    const routeResponse = await fetch(`${SERVER_URL}/api/route/rest-areas/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(routePayload)
    });

    if (!routeResponse.ok) {
      console.log(`⚠️ 경로 API 응답: ${routeResponse.status}`);
      
      if (routeResponse.status === 404) {
        console.log('💡 /api/route/rest-areas/recommendations 엔드포인트가 없습니다.');
        console.log('🔍 기존 API 엔드포인트들을 확인해보겠습니다...');
        await testExistingEndpoints();
      } else {
        const errorText = await routeResponse.text();
        console.log('❌ 에러 응답:', errorText);
      }
    } else {
      console.log('✅ 경로 API 응답 성공');
      const routeData = await routeResponse.json();
      
      console.log('\n📊 응답 분석:');
      console.log(`- 전체 거리: ${routeData.route_info?.total_distance}km`);
      console.log(`- 소요 시간: ${routeData.route_info?.total_duration}분`);
      console.log(`- 휴게소 개수: ${routeData.rest_areas?.length || 0}개`);
      
      if (routeData.rest_areas && routeData.rest_areas.length > 0) {
        console.log('\n🏪 휴게소 목록 (처음 3개):');
        routeData.rest_areas.slice(0, 3).forEach((ra, idx) => {
          console.log(`  ${idx + 1}. ${ra.name}`);
          console.log(`     - 위치: ${ra.location?.lat}, ${ra.location?.lng}`);
          console.log(`     - 시작점으로부터: ${ra.distance_from_start}`);
          console.log(`     - 데이터 품질: ${ra.data_quality}`);
        });
      }

      // IC 기반 필터링 적용 여부 확인
      if (routeData.analysis_summary) {
        console.log('\n🎯 분석 요약:');
        console.log(`- 수집 시간: ${routeData.analysis_summary.data_collection_time}`);
        console.log(`- 성공률: ${routeData.analysis_summary.success_rate}%`);
      }
    }

  } catch (error) {
    console.error('❌ API 테스트 실패:', error.message);
  }
}

async function testExistingEndpoints() {
  console.log('\n🔍 기존 API 엔드포인트 탐색...');
  
  const endpointsToTest = [
    '/api/route/rest-areas/recommendations',
    '/api/highway/rest-areas',
    '/api/rest-areas/report'
  ];

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`\n📡 테스트: ${endpoint}`);
      
      const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'GET'
      });

      if (response.ok) {
        console.log(`✅ ${endpoint} - 동작 중`);
        
        try {
          const data = await response.json();
          console.log(`📄 응답 타입: ${typeof data}, 길이: ${Array.isArray(data) ? data.length : 'N/A'}`);
        } catch (e) {
          console.log('📄 응답: JSON이 아닌 형태');
        }
      } else {
        console.log(`⚠️ ${endpoint} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - ${error.message}`);
    }
  }
}

// 스크립트 실행
testServerAPI();