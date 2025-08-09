'use client';

import { useEffect, useRef, useState } from 'react';
import { Coordinates, RestArea } from '@/types/map';
import { unifiedRestAreaFilter } from '@/lib/unifiedRestAreaFilter';

interface RouteMapProps {
  departure: Coordinates;
  destination: Coordinates;
  onRouteCalculated?: (route: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function RouteMap({ 
  departure, 
  destination, 
  onRouteCalculated, 
  onError,
  className = ''
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('지도 초기화 중...');

  useEffect(() => {
    const initializeMap = () => {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.Map) {
        setLoadingMessage('카카오맵 API 로딩 중...');
        setTimeout(initializeMap, 500);
        return;
      }

      if (!mapRef.current) {
        setLoadingMessage('지도 컨테이너 준비 중...');
        setTimeout(initializeMap, 100);
        return;
      }

      // 이미 지도가 초기화되었으면 경로만 다시 그리기
      if (isMapInitialized && mapInstanceRef.current) {
        setLoadingMessage('경로 업데이트 중...');
        updateRoute(mapInstanceRef.current);
        return;
      }
      
      try {
        setLoadingMessage('지도 생성 중...');
        
        // 지도 중심점을 출발지와 도착지의 중점으로 설정
        const centerLat = (departure.lat + destination.lat) / 2;
        const centerLng = (departure.lng + destination.lng) / 2;
        
        const mapOption = {
          center: new window.kakao.maps.LatLng(centerLat, centerLng),
          level: 8, // 넓은 범위를 보기 위해 레벨을 높임
          draggable: true, // 드래그 가능
          scrollwheel: true, // 마우스 휠 줌 가능
          disableDoubleClick: false, // 더블클릭 줌 가능
          disableDoubleClickZoom: false, // 더블클릭 줌 가능
          keyboardShortcuts: true // 키보드 단축키 사용 가능
        };

        const map = new window.kakao.maps.Map(mapRef.current, mapOption);
        mapInstanceRef.current = map;
        
        setLoadingMessage('지도 컨트롤 추가 중...');
        
        // 지도 컨트롤 추가
        const zoomControl = new window.kakao.maps.ZoomControl();
        map.addControl(zoomControl, window.kakao.maps.ControlPosition.TOPRIGHT);
        
        // 지도타입 컨트롤 추가 (일반지도, 스카이뷰)
        const mapTypeControl = new window.kakao.maps.MapTypeControl();
        map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPLEFT);
        
        setIsMapInitialized(true);
        setLoadingMessage('마커 생성 중...');

        // 출발지 마커 (빨간색)
        const departurePosition = new window.kakao.maps.LatLng(departure.lat, departure.lng);
        const departureMarker = new window.kakao.maps.Marker({
          position: departurePosition,
          image: new window.kakao.maps.MarkerImage(
            'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png',
            new window.kakao.maps.Size(50, 45),
            { offset: new window.kakao.maps.Point(15, 43) }
          )
        });
        departureMarker.setMap(map);

        // 도착지 마커 (파란색)
        const destinationPosition = new window.kakao.maps.LatLng(destination.lat, destination.lng);
        const destinationMarker = new window.kakao.maps.Marker({
          position: destinationPosition,
          image: new window.kakao.maps.MarkerImage(
            'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png',
            new window.kakao.maps.Size(50, 45),
            { offset: new window.kakao.maps.Point(15, 43) }
          )
        });
        destinationMarker.setMap(map);

        // 실제 자동차 경로 계산 및 표시
        setLoadingMessage('경로 계산 중...');
        updateRoute(map);

      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error.message : '지도 생성 실패');
        }
        setTimeout(initializeMap, 1000);
      }
    };

    // 초기화
    setTimeout(initializeMap, 500);
  }, [departure.lat, departure.lng, destination.lat, destination.lng, isMapInitialized]);

  // 기존 마커와 경로선 제거 함수
  const clearMapObjects = () => {
    // 기존 마커들 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // 기존 경로선들 제거
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];
  };

  // 경로 업데이트 함수
  const updateRoute = (map: any) => {
    // 기존 마커와 경로선 제거
    clearMapObjects();
    
    // 출발지 마커 (빨간색)
    const departurePosition = new window.kakao.maps.LatLng(departure.lat, departure.lng);
    const departureMarker = new window.kakao.maps.Marker({
      position: departurePosition,
      image: new window.kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png',
        new window.kakao.maps.Size(50, 45),
        { offset: new window.kakao.maps.Point(15, 43) }
      )
    });
    departureMarker.setMap(map);
    markersRef.current.push(departureMarker);

    // 도착지 마커 (파란색)
    const destinationPosition = new window.kakao.maps.LatLng(destination.lat, destination.lng);
    const destinationMarker = new window.kakao.maps.Marker({
      position: destinationPosition,
      image: new window.kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png',
        new window.kakao.maps.Size(50, 45),
        { offset: new window.kakao.maps.Point(15, 43) }
      )
    });
    destinationMarker.setMap(map);
    markersRef.current.push(destinationMarker);

    // 실제 자동차 경로 계산 및 표시
    calculateCarRoute(departurePosition, destinationPosition, map);

    // 지도 범위를 출발지와 도착지가 모두 보이도록 조정
    const bounds = new window.kakao.maps.LatLngBounds();
    bounds.extend(departurePosition);
    bounds.extend(destinationPosition);
    map.setBounds(bounds);

    // 약간의 패딩 추가
    setTimeout(() => {
      map.setBounds(bounds);
    }, 100);
  };

  // 실제 자동차 경로 계산 및 표시
  async function calculateCarRoute(
    startPos: any, 
    endPos: any, 
    map: any
  ): Promise<void> {
    try {
      console.log('🔥 경로 계산 시작:', { 
        start: { lat: startPos.getLat(), lng: startPos.getLng() },
        end: { lat: endPos.getLat(), lng: endPos.getLng() }
      });

      // 카카오 모빌리티 API를 사용한 경로 계산
      const response = await fetch('/api/route/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: {
            lat: startPos.getLat(),
            lng: startPos.getLng()
          },
          destination: {
            lat: endPos.getLat(),
            lng: endPos.getLng()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`경로 계산 실패 (${response.status}): ${errorData.details || errorData.error}`);
      }

      const routeData = await response.json();

      let routePath: Coordinates[] = [];
      let routeDistance = 0;
      let routeDuration = 0;
      const highwaySegments: any[] = []; // 이 함수 스코프로 이동

      // 경로 정보가 있으면 폴리라인으로 표시
      if (routeData.routes && routeData.routes.length > 0) {
        const route = routeData.routes[0];
        const path: any[] = [];
        
        console.log('🔥 카카오 경로 응답 분석 시작');
        console.log('🔥 전체 경로 구조:', JSON.stringify(route, null, 2));
        
        // 경로 좌표들을 카카오맵 LatLng 객체로 변환 + 도로 정보 분석
        route.sections.forEach((section: any, sectionIndex: number) => {
          console.log(`🔥 Section ${sectionIndex}:`, {
            distance: section.distance,
            duration: section.duration,
            roads: section.roads?.length || 0
          });
          
          section.roads?.forEach((road: any, roadIndex: number) => {
            console.log(`🔥 Road ${roadIndex}:`, {
              name: road.name,
              distance: road.distance,
              duration: road.duration,
              traffic_state: road.traffic_state,
              type: road.type,
              speed: road.speed
            });
            
            // 고속도로 구간 감지 (더 정확한 필터링)
            if (road.name && 
                (road.name.includes('고속도로') || road.name.includes('고속화도로')) &&
                road.distance > 1000) { // 1km 이상인 구간만 (작은 구간 제외)
              
              // 중복 고속도로명 체크 (연속된 같은 고속도로는 합치기)
              const lastSegment = highwaySegments[highwaySegments.length - 1];
              if (!lastSegment || lastSegment.name !== road.name) {
                highwaySegments.push({
                  name: road.name,
                  distance: road.distance,
                  duration: road.duration,
                  sectionIndex,
                  roadIndex,
                  startCoord: null,
                  endCoord: null
                });
                console.log(`🔥 고속도로 구간 발견: ${road.name} (거리: ${road.distance}m)`);
              } else {
                // 같은 고속도로 구간이면 거리 누적
                lastSegment.distance += road.distance;
                lastSegment.duration += road.duration;
                console.log(`🔥 고속도로 구간 연장: ${road.name} (총 거리: ${lastSegment.distance}m)`);
              }
            }
            
            if (road.vertexes && Array.isArray(road.vertexes)) {
              const roadPath = [];
              for (let i = 0; i < road.vertexes.length; i += 2) {
                const x = road.vertexes[i];
                const y = road.vertexes[i + 1];
                
                if (typeof x === 'number' && typeof y === 'number') {
                  const coord = { lat: y, lng: x };
                  path.push(new window.kakao.maps.LatLng(y, x));
                  routePath.push(coord);
                  roadPath.push(coord);
                }
              }
              
              // 고속도로 구간에 좌표 정보 추가
              if (road.name && 
                  (road.name.includes('고속도로') || road.name.includes('고속화도로')) &&
                  road.distance > 1000 && roadPath.length > 0) {
                
                const currentSegment = highwaySegments[highwaySegments.length - 1];
                if (currentSegment && currentSegment.name === road.name) {
                  // 시작점이 없으면 설정
                  if (!currentSegment.startCoord) {
                    currentSegment.startCoord = roadPath[0];
                  }
                  // 끝점은 항상 업데이트 (구간이 연장될 수 있음)
                  currentSegment.endCoord = roadPath[roadPath.length - 1];
                  
                  // 경로 정보 누적
                  if (!currentSegment.path) {
                    currentSegment.path = [...roadPath];
                  } else {
                    currentSegment.path.push(...roadPath);
                  }
                }
              }
            }
          });
        });

        console.log('🔥 발견된 고속도로 구간들:', highwaySegments);

        // 경로 거리와 시간 정보 추출
        routeDistance = route.summary?.distance || 0;
        routeDuration = route.summary?.duration || 0;

        console.log('🔥 경로 정보:', {
          distance: routeDistance,
          duration: routeDuration,
          pathPoints: routePath.length,
          highwaySegments: highwaySegments.length
        });

        if (path.length > 1) {
          // 실제 경로 폴리라인 그리기
          const polyline = new window.kakao.maps.Polyline({
            path: path,
            strokeWeight: 6,
            strokeColor: '#3366FF',
            strokeOpacity: 0.8,
            strokeStyle: 'solid'
          });
          polyline.setMap(map);
          polylinesRef.current.push(polyline);
        } else {
          routePath = [departure, destination];
          drawStraightLine(startPos, endPos, map);
        }
      } else {
        // API 실패 시 직선으로 대체
        routePath = [departure, destination];
        drawStraightLine(startPos, endPos, map);
      }

      // 휴게소 검색 시작 (통합 필터링 시스템)
      console.log('🔥 휴게소 검색 시작...');
      setLoadingMessage('휴게소 검색 중...');
      
      try {
        // 실제 경로에서 고속도로 목록 추출
        const actualRouteHighways = highwaySegments.map(segment => segment.name);
        console.log('🛣️ 추출된 경로 고속도로:', actualRouteHighways);
        
        // 통합된 필터링 시스템으로 휴게소 조회 (실제 경로 데이터 활용)
        const filteredRestAreas = await unifiedRestAreaFilter.filterRestAreasForRoute(
          routePath,
          departure,
          destination,
          {}, // 기본 옵션 사용
          actualRouteHighways // 실제 경로의 고속도로 목록 전달
        );
        
        // 기존 RestArea 형식으로 변환
        const restAreas = filteredRestAreas.map(area => ({
          ...area,
          routeDistance: area.distanceFromStart,
          routeDuration: area.estimatedTime
        }));
        
        console.log(`🔥 통합 필터링 완료: ${restAreas.length}개 휴게소 (민자고속도로 포함, 상/하행 정확히 구분)`);
        setLoadingMessage('휴게소 마커 생성 중...');

        // 휴게소 마커 추가
        restAreas.forEach(restArea => {
          const restMarker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(
              restArea.coordinates.lat,
              restArea.coordinates.lng
            ),
            image: createRestAreaMarkerImage()
          });
          restMarker.setMap(map);
          markersRef.current.push(restMarker);

          // 마커 클릭 이벤트
          window.kakao.maps.event.addListener(restMarker, 'click', () => {
            showRestAreaInfo(restArea, restMarker, map);
          });
        });

        // 경로 정보 업데이트하여 상위 컴포넌트에 전달
        if (onRouteCalculated) {
          onRouteCalculated({
            distance: routeDistance,
            duration: routeDuration,
            path: routePath,
            restAreas: restAreas
          });
        }

        // 로딩 완료
        setIsLoading(false);

      } catch (restError) {
        console.error('🔥 휴게소 검색 오류:', restError);
        
        // 휴게소 검색 실패해도 경로는 표시
        if (onRouteCalculated) {
          onRouteCalculated({
            distance: routeDistance,
            duration: routeDuration,
            path: routePath,
            restAreas: []
          });
        }
        
        // 로딩 완료 (에러여도)
        setIsLoading(false);
      }

    } catch (error) {
      console.error('🔥 경로 계산 오류:', error);
      // 에러 발생 시 직선으로 대체
      drawStraightLine(startPos, endPos, map);
      
      if (onRouteCalculated) {
        const distance = calculateDistance(departure, destination);
        const estimatedTime = Math.round(distance / 80 * 60);
        
        onRouteCalculated({
          distance: distance * 1000,
          duration: estimatedTime * 60,
          path: [departure, destination],
          restAreas: []
        });
      }
      
      // 에러 발생해도 로딩 완료
      setIsLoading(false);
    }
  }

  // 직선 경로 표시 (fallback)
  function drawStraightLine(startPos: any, endPos: any, map: any): void {
    const linePath = [startPos, endPos];
    const polyline = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: '#FF0000',
      strokeOpacity: 0.7,
      strokeStyle: 'solid'
    });
    polyline.setMap(map);
    polylinesRef.current.push(polyline);
  }

  // 휴게소 마커 이미지 생성
  const createRestAreaMarkerImage = () => {
    if (!window.kakao) return null;

    const imageSrc = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 14 14 22 14 22s14-8 14-22C28 6.268 21.732 0 14 0z" fill="#28a745"/>
        <circle cx="14" cy="14" r="8" fill="white"/>
        <path d="M14 8c-1.1 0-2 .9-2 2v2h-1c-.55 0-1 .45-1 1s.45 1 1 1h1v2c0 1.1.9 2 2 2s2-.9 2-2v-2h1c.55 0 1-.45 1-1s-.45-1-1-1h-1v-2c0-1.1-.9-2-2-2z" fill="#28a745"/>
      </svg>
    `);
    
    const imageSize = new window.kakao.maps.Size(28, 36);
    const imageOption = { offset: new window.kakao.maps.Point(14, 36) };
    
    return new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  };

  // 휴게소 정보창 표시
  const showRestAreaInfo = (restArea: RestArea, marker: any, map: any) => {
    // 기존 정보창이 있으면 닫기
    if ((window as any).currentInfoWindow) {
      (window as any).currentInfoWindow.close();
    }

    // 거리 정보 추가
    const distanceInfo = restArea.routeDistance 
      ? `<p style="margin:2px 0;color:#28a745;font-weight:bold;">🚗 출발지로부터 ${restArea.routeDistance}km (${restArea.routeDuration || 0}분 소요)</p>`
      : '';

    // 방향성 신뢰도 정보 (새로 추가)
    const confidenceInfo = (restArea as any).confidence
      ? `<p style="margin:2px 0;color:#007bff;font-size:11px;">🧭 방향성 신뢰도: ${Math.round((restArea as any).confidence * 100)}%</p>`
      : '';

    // 방향성 판단 근거 (새로 추가) 
    const reasonInfo = (restArea as any).directionReason?.length > 0
      ? `<p style="margin:2px 0;color:#6c757d;font-size:10px;">📋 ${(restArea as any).directionReason.slice(0, 2).join(', ')}</p>`
      : '';

    // 매장 정보 표시
    const storeInfo = restArea.foods && restArea.foods.length > 0
      ? `<p style="margin:4px 0 2px 0;"><strong>🍽️ 인기 매장:</strong><br/>${restArea.foods.slice(0, 3).map(f => f.name).join(', ')}</p>`
      : '';

    const facilityInfo = restArea.facilities && restArea.facilities.length > 0
      ? `<p style="margin:4px 0 2px 0;"><strong>🏢 편의시설:</strong><br/>${restArea.facilities.slice(0, 5).join(', ')}</p>`
      : restArea.facilities.length > 0 
        ? `<p style="margin:4px 0 2px 0;"><strong>🏢 편의시설:</strong><br/>${restArea.facilities.slice(0, 5).join(', ')}</p>`
        : '';

    const content = `
      <div style="padding:12px;min-width:250px;max-width:320px;">
        <h4 style="margin:0 0 8px 0;color:#333;font-size:15px;font-weight:bold;">
          🚻 ${restArea.name}
        </h4>
        <div style="color:#666;font-size:12px;line-height:1.4;">
          ${distanceInfo}
          ${confidenceInfo}
          ${reasonInfo}
          <p style="margin:2px 0;">📍 ${restArea.address || '주소 정보 없음'}</p>
          <p style="margin:2px 0;">🕒 ${restArea.operatingHours}</p>
          ${restArea.phoneNumber ? `<p style="margin:2px 0;">📞 ${restArea.phoneNumber}</p>` : ''}
          <p style="margin:2px 0;">🛣️ ${restArea.routeCode} (${restArea.direction})</p>
          ${storeInfo}
          ${facilityInfo}
        </div>
      </div>
    `;

    const infoWindow = new window.kakao.maps.InfoWindow({
      content: content,
      zIndex: 1
    });

    infoWindow.open(map, marker);
    (window as any).currentInfoWindow = infoWindow;
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            {/* 스피너 */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            
            {/* 로딩 메시지 */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                지도 로딩 중...
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {loadingMessage}
              </p>
              
              {/* 프로그레스 바 */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                경로와 휴게소 정보를 불러오고 있습니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 두 좌표 간의 직선거리 계산 (km)
function calculateDistance(pos1: Coordinates, pos2: Coordinates): number {
  const R = 6371; // 지구의 반지름 (km)
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}