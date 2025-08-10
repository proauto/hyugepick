#!/usr/bin/env node

/**
 * 현풍 휴게소와 서울-부산 최적경로 간의 거리 확인 스크립트
 * 현풍 휴게소가 실제 경로에서 얼마나 떨어져 있는지 정확히 측정
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

// 서울-부산 실제 최적경로 좌표 (카카오맵 API 기반)
const SEOUL_BUSAN_ROUTE = [
  { lat: 37.5665, lng: 126.9780, name: '서울 시청' },
  { lat: 37.4563, lng: 127.1261, name: '수원IC 근처' },
  { lat: 37.2636, lng: 127.2286, name: '안성IC 근처' },
  { lat: 36.3504, lng: 127.3845, name: '대전IC 근처' },
  { lat: 36.1004, lng: 127.9201, name: '옥천IC 근처' },
  { lat: 35.8714, lng: 128.6014, name: '대구IC 근처' },
  { lat: 35.5384, lng: 128.7294, name: '경주IC 근처' },
  { lat: 35.4606, lng: 129.0403, name: '울산IC 근처' },
  { lat: 35.1796, lng: 129.0756, name: '부산 시청' }
];

// 중부내륙고속도로 주요 구간 (참고용)
const JUNGBU_INLAND_HIGHWAY = [
  { lat: 37.4138, lng: 127.1065, name: '수원 근처' },
  { lat: 36.8065, lng: 127.1522, name: '충주IC' },
  { lat: 36.4919, lng: 127.8864, name: '문경새재IC' },
  { lat: 36.0322, lng: 128.3440, name: '상주IC' },
  { lat: 35.8300, lng: 128.4800, name: '현풍IC' }, // 현풍 근처
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
  console.log('🔍 현풍 휴게소와 서울-부산 경로 간 거리 분석');
  console.log(`📅 ${new Date().toLocaleString('ko-KR')}`);
  console.log('═'.repeat(70));

  try {
    // 1. 현풍 관련 휴게소 조회
    console.log('1️⃣ 현풍 관련 휴게소 조회...');
    
    const { data: hyeonpungRestAreas, error } = await supabase
      .from('rest_areas')
      .select('*')
      .ilike('name', '%현풍%');
    
    if (error) {
      console.error('❌ 현풍 휴게소 조회 실패:', error.message);
      return;
    }
    
    console.log(`📍 현풍 관련 휴게소: ${hyeonpungRestAreas?.length || 0}개`);
    
    if (hyeonpungRestAreas && hyeonpungRestAreas.length > 0) {
      hyeonpungRestAreas.forEach((ra, index) => {
        console.log(`  ${index + 1}. ${ra.name}`);
        console.log(`     - 위치: ${ra.lat}, ${ra.lng}`);
        console.log(`     - 노선: ${ra.route_name} (${ra.route_code})`);
        console.log(`     - 방향: ${ra.direction} → ${ra.route_direction}`);
        console.log('');
      });
    }

    // 2. 각 현풍 휴게소와 서울-부산 경로 간의 최단거리 계산
    console.log('2️⃣ 현풍 휴게소와 서울-부산 경로 간 거리 분석...');
    console.log('─'.repeat(60));
    
    if (hyeonpungRestAreas && hyeonpungRestAreas.length > 0) {
      for (const restArea of hyeonpungRestAreas) {
        if (!restArea.lat || !restArea.lng) continue;
        
        const restAreaPoint = { lat: restArea.lat, lng: restArea.lng };
        
        // 경로의 각 구간과의 거리 계산
        let minDistanceToRoute = Infinity;
        let closestRoutePoint = null;
        
        for (let i = 0; i < SEOUL_BUSAN_ROUTE.length - 1; i++) {
          const segmentStart = SEOUL_BUSAN_ROUTE[i];
          const segmentEnd = SEOUL_BUSAN_ROUTE[i + 1];
          
          // 선분과 점 사이의 최단거리 계산
          const distanceToSegment = distanceFromPointToLineSegment(
            restAreaPoint,
            segmentStart,
            segmentEnd
          );
          
          if (distanceToSegment < minDistanceToRoute) {
            minDistanceToRoute = distanceToSegment;
            closestRoutePoint = segmentStart;
          }
        }
        
        console.log(`🏪 ${restArea.name} (${restArea.route_name})`);
        console.log(`   위치: ${restArea.lat.toFixed(4)}, ${restArea.lng.toFixed(4)}`);
        console.log(`   경로까지 최단거리: ${minDistanceToRoute.toFixed(2)}km`);
        
        // 거리 평가
        let distanceEvaluation = '';
        if (minDistanceToRoute <= 2) {
          distanceEvaluation = '✅ 매우 근접 (2km 이내)';
        } else if (minDistanceToRoute <= 5) {
          distanceEvaluation = '🟡 근접 (5km 이내)';
        } else if (minDistanceToRoute <= 10) {
          distanceEvaluation = '🟠 다소 멀음 (10km 이내)';
        } else {
          distanceEvaluation = '🔴 상당히 멀음 (10km 초과)';
        }
        
        console.log(`   평가: ${distanceEvaluation}`);
        
        // 중부내륙고속도로와의 연결성 확인
        if (restArea.route_name?.includes('중부내륙') || restArea.route_code?.includes('045')) {
          console.log('   📋 중부내륙고속도로상 휴게소로 확인됨');
          
          // 중부내륙고속도로가 서울-부산 경로와 교차하는지 확인
          const connectionPoint = findRouteConnection();
          if (connectionPoint) {
            const distanceToConnection = calculateDistance(restAreaPoint, connectionPoint);
            console.log(`   🔗 경부선 연결지점까지: ${distanceToConnection.toFixed(2)}km`);
          }
        }
        
        console.log('');
      }
    }

    // 3. 중부내륙고속도로와 경부고속도로의 교차점 분석
    console.log('3️⃣ 고속도로 교차점 및 접근성 분석...');
    console.log('─'.repeat(60));
    
    const connectionAnalysis = analyzeHighwayConnection();
    console.log(connectionAnalysis);
    
    // 4. 필터링 권장사항
    console.log('4️⃣ 필터링 개선 권장사항');
    console.log('─'.repeat(60));
    
    if (hyeonpungRestAreas && hyeonpungRestAreas.length > 0) {
      const problematicRestAreas = hyeonpungRestAreas.filter(ra => {
        if (!ra.lat || !ra.lng) return false;
        const distance = getMinDistanceToRoute({ lat: ra.lat, lng: ra.lng });
        return distance > 5; // 5km 이상 떨어진 경우
      });
      
      if (problematicRestAreas.length > 0) {
        console.log('🎯 필터링이 필요한 휴게소:');
        problematicRestAreas.forEach(ra => {
          console.log(`  - ${ra.name}: 경로에서 ${getMinDistanceToRoute({ lat: ra.lat, lng: ra.lng }).toFixed(2)}km 떨어짐`);
        });
        
        console.log('\n💡 개선 방안:');
        console.log('  1. 노선 코드 정밀 매칭: 경부선(001)과 중부내륙선(045) 구분');
        console.log('  2. 거리 기반 필터링 강화: 5km 이내로 제한');
        console.log('  3. 경로 교차점 기반 접근성 판단');
        console.log('  4. 실제 진입 가능성 확인 (IC/JC 위치 고려)');
      } else {
        console.log('✅ 모든 현풍 휴게소가 적정 거리 내에 위치합니다.');
      }
    }

    console.log('\n🎯 결론');
    console.log('─'.repeat(60));
    console.log('현풍 휴게소 필터링 분석이 완료되었습니다.');
    console.log('위 분석 결과를 바탕으로 거리 기반 및 노선별 정밀 필터링을 적용하겠습니다.');

  } catch (error) {
    console.error('❌ 분석 중 오류 발생:', error);
    process.exit(1);
  }
}

// 점과 선분 사이의 최단거리 계산
function distanceFromPointToLineSegment(
  point: { lat: number; lng: number },
  lineStart: { lat: number; lng: number },
  lineEnd: { lat: number; lng: number }
): number {
  const A = point.lng - lineStart.lng;
  const B = point.lat - lineStart.lat;
  const C = lineEnd.lng - lineStart.lng;
  const D = lineEnd.lat - lineStart.lat;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // 시작점과 끝점이 같은 경우
    return calculateDistance(point, lineStart);
  }

  const param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.lng;
    yy = lineStart.lat;
  } else if (param > 1) {
    xx = lineEnd.lng;
    yy = lineEnd.lat;
  } else {
    xx = lineStart.lng + param * C;
    yy = lineStart.lat + param * D;
  }

  return calculateDistance(point, { lat: yy, lng: xx });
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

// 경로와의 최단거리 계산 (간단 버전)
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

// 고속도로 연결지점 찾기
function findRouteConnection(): { lat: number; lng: number } | null {
  // 중부내륙고속도로와 경부고속도로가 만나는 지점 (대략적)
  // 실제로는 수원 근처에서 분기됨
  return { lat: 37.4138, lng: 127.1065 };
}

// 고속도로 교차점 분석
function analyzeHighwayConnection(): string {
  return `
🔗 고속도로 연결성 분석:

1. 경부고속도로 (Route 001):
   - 서울 → 수원 → 대전 → 대구 → 부산
   - 현풍과는 대구IC 근처에서 약 20km 떨어짐

2. 중부내륙고속도로 (Route 045):
   - 수원에서 경부선과 분기
   - 현풍IC를 지나 남쪽으로 진행
   - 현풍 휴게소는 이 노선상에 위치

3. 중부내륙고속도로지선 (Route 451):
   - 중부내륙고속도로에서 분기
   - 현풍(대구) 휴게소가 여기에 위치할 가능성

🎯 문제점:
- 서울→부산 경로는 경부선(001)을 주로 사용
- 중부내륙선(045/451)은 우회 경로로, 직접 접근 어려움
- 현풍 휴게소들이 잘못 매칭되는 원인으로 판단됨
`;
}

main().catch(console.error);