import { NextRequest, NextResponse } from 'next/server';
import { routeRestAreaService } from '@/lib/routeRestAreaService';
import { Coordinates } from '@/types/map';
import { isValidCoordinate } from '@/lib/utils';

// 경로 + 휴게소 통합 조회 API 엔드포인트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 필수 파라미터 검증
    const { origin, destination } = body;
    
    if (!origin || !destination) {
      return NextResponse.json(
        { 
          error: '출발지(origin)와 목적지(destination)가 필요합니다.',
          required_format: {
            origin: { lat: 37.5665, lng: 126.9780 },
            destination: { lat: 35.1796, lng: 129.0756 }
          }
        },
        { status: 400 }
      );
    }

    // 좌표 유효성 검사
    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
      return NextResponse.json(
        { 
          error: '유효하지 않은 좌표입니다. 위도(-90~90), 경도(-180~180) 범위를 확인해주세요.',
          received: { origin, destination }
        },
        { status: 400 }
      );
    }

    // 옵션 파라미터 파싱 (기본값은 설정 파일에서 가져옴)
    const options = {
      matching: {
        maxDistance: body.maxDistance ?? undefined,        // undefined로 설정하여 서비스 기본값 사용
        highwayOnly: body.highwayOnly ?? undefined,
        minInterval: body.minInterval ?? undefined,
        maxResults: body.maxResults ?? undefined,
        
        // 방향성 필터링 옵션 (설정 파일 기본값 사용)
        enableDirectionFilter: body.enableDirectionFilter ?? undefined,
        directionStrictMode: body.directionStrictMode ?? undefined,
        directionConfidenceThreshold: body.directionConfidenceThreshold ?? undefined,
        includeAmbiguousDirection: body.includeAmbiguousDirection ?? undefined,
        
        // 고속도로 우선 필터링 옵션 (설정 파일 기본값 사용)
        useHighwayFirstFilter: body.useHighwayFirstFilter ?? undefined,
        maxDistanceFromIC: body.maxDistanceFromIC ?? undefined,
        minHighwayCoverage: body.minHighwayCoverage ?? undefined,
        highwayConfidenceThreshold: body.highwayConfidenceThreshold ?? undefined
      },
      collection: {
        includeStores: body.includeStores ?? true,       // 매장 정보 포함
        includeFacilities: body.includeFacilities ?? true, // 편의시설 정보 포함
        maxConcurrent: body.maxConcurrent || 3,            // 동시 요청 수
        timeout: body.timeout || 15000,                    // 타임아웃 (ms)
        retryCount: body.retryCount || 2                   // 재시도 횟수
      },
      includeAnalysis: body.includeAnalysis ?? true,
      formatOutput: body.formatOutput ?? true
    };

    console.log('경로 휴게소 API 호출:', {
      origin,
      destination, 
      options
    });

    // 메인 서비스 호출
    const result = await routeRestAreaService.getRouteWithRestAreas(
      origin as Coordinates,
      destination as Coordinates,
      options
    );

    // 응답 헤더 설정
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, max-age=300'); // 5분 캐싱
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    
    console.log('경로 휴게소 API 응답 완료:', {
      totalRestAreas: result.rest_areas.length,
      routeDistance: result.route_info.total_distance
    });

    return response;

  } catch (error) {
    console.error('경로 휴게소 API 오류:', error);
    
    // 오류 유형별 응답
    if (error instanceof Error) {
      if (error.message.includes('경로 계산')) {
        return NextResponse.json(
          { 
            error: '경로 계산에 실패했습니다. 출발지와 목적지를 확인해주세요.',
            details: error.message
          },
          { status: 502 }
        );
      }
      
      if (error.message.includes('휴게소')) {
        return NextResponse.json(
          { 
            error: '휴게소 정보 조회에 실패했습니다. 잠시 후 다시 시도해주세요.',
            details: error.message
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: '서비스 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로 특정 구간 휴게소 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 쿼리 파라미터 파싱
    const originLat = searchParams.get('originLat');
    const originLng = searchParams.get('originLng');
    const destLat = searchParams.get('destLat');
    const destLng = searchParams.get('destLng');
    const startKm = searchParams.get('startKm');
    const endKm = searchParams.get('endKm');

    // 필수 파라미터 검증
    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { 
          error: '필수 쿼리 파라미터가 누락되었습니다.',
          required: ['originLat', 'originLng', 'destLat', 'destLng'],
          optional: ['startKm', 'endKm'],
          example: '/api/route/rest-areas?originLat=37.5665&originLng=126.9780&destLat=35.1796&destLng=129.0756&startKm=50&endKm=200'
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

    // 좌표 유효성 검사
    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
      return NextResponse.json(
        { error: '유효하지 않은 좌표입니다.' },
        { status: 400 }
      );
    }

    console.log('구간별 휴게소 조회 API 호출:', { origin, destination, startKm, endKm });

    // 구간 지정된 경우 구간별 조회, 아니면 전체 조회
    const result = startKm && endKm 
      ? await routeRestAreaService.getRestAreasBySection(
          origin,
          destination,
          parseFloat(startKm),
          parseFloat(endKm)
        )
      : await routeRestAreaService.getRouteWithRestAreas(origin, destination);

    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, max-age=600'); // 10분 캐싱
    
    return response;

  } catch (error) {
    console.error('구간별 휴게소 조회 API 오류:', error);
    return NextResponse.json(
      { 
        error: '구간별 휴게소 조회에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

