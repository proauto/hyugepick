import { NextRequest, NextResponse } from 'next/server';
import { routeRestAreaService } from '@/lib/routeRestAreaService';
import { Coordinates } from '@/types/map';

// 최적화된 휴게소 추천 API 엔드포인트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 필수 파라미터 검증
    const { origin, destination, preferences = {} } = body;
    
    if (!origin || !destination) {
      return NextResponse.json(
        { 
          error: '출발지(origin)와 목적지(destination)가 필요합니다.',
          example_request: {
            origin: { lat: 37.5665, lng: 126.9780 },
            destination: { lat: 35.1796, lng: 129.0756 },
            preferences: {
              fuelStopInterval: 300,        // 300km마다 연료 보급
              mealStopInterval: 3,          // 3시간마다 식사
              preferredFacilities: ['주유소', '전기차충전소', '음식점']
            }
          }
        },
        { status: 400 }
      );
    }

    // 좌표 유효성 검사
    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
      return NextResponse.json(
        { error: '유효하지 않은 좌표입니다.' },
        { status: 400 }
      );
    }

    // 선호도 설정 파싱
    const processedPreferences = {
      fuelStopInterval: preferences.fuelStopInterval || 300,    // 기본 300km
      mealStopInterval: preferences.mealStopInterval || 3,      // 기본 3시간
      preferredFacilities: preferences.preferredFacilities || ['주유소', '음식점', '화장실']
    };

    console.log('휴게소 추천 API 호출:', {
      origin,
      destination,
      preferences: processedPreferences
    });

    // 추천 서비스 호출
    const result = await routeRestAreaService.getOptimizedRestAreaRecommendations(
      origin as Coordinates,
      destination as Coordinates,
      processedPreferences
    );

    // 추천 우선순위별 정렬
    const sortedRecommendations = result.recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // 응답 데이터 재구성
    const response_data = {
      ...result,
      recommendations: sortedRecommendations,
      recommendation_summary: {
        high_priority: sortedRecommendations.filter(r => r.priority === 'high').length,
        medium_priority: sortedRecommendations.filter(r => r.priority === 'medium').length,
        low_priority: sortedRecommendations.filter(r => r.priority === 'low').length,
        total_recommendations: sortedRecommendations.length
      }
    };

    const response = NextResponse.json(response_data);
    response.headers.set('Cache-Control', 'public, max-age=300'); // 5분 캐싱
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    
    console.log('휴게소 추천 API 응답 완료:', {
      totalRecommendations: sortedRecommendations.length,
      highPriority: response_data.recommendation_summary.high_priority
    });

    return response;

  } catch (error) {
    console.error('휴게소 추천 API 오류:', error);
    return NextResponse.json(
      { 
        error: '휴게소 추천 서비스 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로 간단한 추천 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 쿼리 파라미터 파싱
    const originLat = searchParams.get('originLat');
    const originLng = searchParams.get('originLng');
    const destLat = searchParams.get('destLat');
    const destLng = searchParams.get('destLng');
    const fuelInterval = searchParams.get('fuelInterval');
    const mealInterval = searchParams.get('mealInterval');

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { 
          error: '필수 쿼리 파라미터가 누락되었습니다.',
          required: ['originLat', 'originLng', 'destLat', 'destLng'],
          optional: ['fuelInterval', 'mealInterval'],
          example: '/api/route/rest-areas/recommendations?originLat=37.5665&originLng=126.9780&destLat=35.1796&destLng=129.0756&fuelInterval=300&mealInterval=3'
        },
        { status: 400 }
      );
    }

    const origin: Coordinates = {
      lat: parseFloat(originLat),
      lng: parseFloat(originLng)
    };

    const destination: Coordinates = {
      lat: parseFloat(destLat), 
      lng: parseFloat(destLng)
    };

    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
      return NextResponse.json(
        { error: '유효하지 않은 좌표입니다.' },
        { status: 400 }
      );
    }

    const preferences = {
      fuelStopInterval: fuelInterval ? parseFloat(fuelInterval) : 300,
      mealStopInterval: mealInterval ? parseFloat(mealInterval) : 3,
      preferredFacilities: ['주유소', '음식점', '화장실', '편의점']
    };

    console.log('간단 휴게소 추천 조회:', { origin, destination, preferences });

    const result = await routeRestAreaService.getOptimizedRestAreaRecommendations(
      origin,
      destination,
      preferences
    );

    // 간소화된 응답 (핵심 추천만)
    const simplified_response = {
      route_summary: {
        total_distance: result.route_info.total_distance,
        total_duration: result.route_info.total_duration
      },
      top_recommendations: result.recommendations
        .filter(r => r.priority === 'high' || r.priority === 'medium')
        .slice(0, 5)
        .map((rec, index) => {
          const restArea = result.rest_areas.find(ra => ra.name === rec.restAreaName);
          return {
            rank: index + 1,
            name: rec.restAreaName,
            priority: rec.priority,
            reasons: rec.reason,
            distance_from_start: restArea?.distance_from_start,
            estimated_time: restArea?.estimated_time,
            key_facilities: restArea?.facilities.slice(0, 3) || [],
            store_count: restArea?.stores.length || 0
          };
        }),
      summary: {
        total_rest_areas: result.rest_areas.length,
        high_priority_count: result.recommendations.filter(r => r.priority === 'high').length,
        average_interval: result.analysis_summary.average_interval
      }
    };

    const response = NextResponse.json(simplified_response);
    response.headers.set('Cache-Control', 'public, max-age=600'); // 10분 캐싱
    
    return response;

  } catch (error) {
    console.error('간단 휴게소 추천 API 오류:', error);
    return NextResponse.json(
      { 
        error: '휴게소 추천 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 좌표 유효성 검사 함수
function isValidCoordinate(coord: any): coord is Coordinates {
  return coord && 
         typeof coord.lat === 'number' && 
         typeof coord.lng === 'number' &&
         coord.lat >= -90 && coord.lat <= 90 &&
         coord.lng >= -180 && coord.lng <= 180;
}