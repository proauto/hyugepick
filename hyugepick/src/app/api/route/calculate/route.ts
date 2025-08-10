import { NextRequest, NextResponse } from 'next/server';
import { calculateDistanceFromCoords } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json();
    const restKey = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;

    if (!restKey) {
      return NextResponse.json(
        { error: 'Kakao REST API Key가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    if (!origin || !destination) {
      return NextResponse.json(
        { error: '출발지와 도착지 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 카카오 모빌리티 API 호출 (GET 메서드 사용)
    const params = new URLSearchParams({
      origin: `${origin.lng},${origin.lat}`,
      destination: `${destination.lng},${destination.lat}`,
      priority: 'TIME',
      car_fuel: 'GASOLINE',
      car_hipass: 'true',
      alternatives: 'false',
      road_details: 'true'
    });

    const apiUrl = `https://apis-navi.kakaomobility.com/v1/directions?${params.toString()}`;

    // 카카오 API 시도 후 실패 시 직선 경로로 폴백
    try {
      const kakaoResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `KakaoAK ${restKey}`,
          'Content-Type': 'application/json',
          'KA': 'sdk/1.0.0 os/web lang/ko-KR device/pc origin/localhost'
        }
      });

      if (kakaoResponse.ok) {
        const routeData = await kakaoResponse.json();
        console.log(`✅ 카카오 API 경로 계산 성공`);
        return NextResponse.json(routeData);
      } else {
        console.warn(`⚠️ 카카오 API 실패 (${kakaoResponse.status}), 직선 경로로 폴백`);
        throw new Error('Kakao API failed, fallback to direct route');
      }
    } catch (kakaoError) {
      console.warn(`⚠️ 카카오 API 오류, 직선 경로로 폴백:`, kakaoError instanceof Error ? kakaoError.message : kakaoError);
      
      // 직선 경로 생성 (폴백)
      const routePath = [];
      const steps = 20;
      
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const lat = origin.lat + (destination.lat - origin.lat) * ratio;
        const lng = origin.lng + (destination.lng - origin.lng) * ratio;
        routePath.push({ lat, lng });
      }
      
      const distance = calculateDistanceFromCoords(origin.lat, origin.lng, destination.lat, destination.lng);
      const duration = Math.round(distance * 60);
      
      const mockRouteData = {
        routes: [{
          summary: {
            origin: origin,
            destination: destination,
            distance: Math.round(distance * 1000),
            duration: duration * 60,
          },
          sections: [{
            distance: Math.round(distance * 1000),
            duration: duration * 60,
            bound: {
              min_x: Math.min(origin.lng, destination.lng),
              min_y: Math.min(origin.lat, destination.lat),
              max_x: Math.max(origin.lng, destination.lng),
              max_y: Math.max(origin.lat, destination.lat)
            }
          }],
          path: routePath
        }]
      };
      
      console.log(`🔄 직선 경로 생성: ${distance.toFixed(1)}km, ${routePath.length}개 지점`);
      return NextResponse.json(mockRouteData);
    }

  } catch (error) {
    console.error('Route calculation API error:', error);
    return NextResponse.json(
      { error: '경로 계산 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

