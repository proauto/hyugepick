'use client';

import { useEffect, useState, useCallback } from 'react';
import { RouteDisplayProps, RouteInfo, RestArea, Coordinates } from '@/types/map';
import { routeAPI } from '@/lib/routeApi';
import { highwayAPI } from '@/lib/highwayApi';

interface RouteDisplayState {
  route: RouteInfo | null;
  restAreas: RestArea[];
  loading: boolean;
  error: string | null;
  polyline: any | null;
  markers: any[];
  infoWindow: any | null;
}

export default function RouteDisplay({ 
  departure, 
  destination, 
  onRouteCalculated, 
  onError 
}: RouteDisplayProps) {
  const [state, setState] = useState<RouteDisplayState>({
    route: null,
    restAreas: [],
    loading: false,
    error: null,
    polyline: null,
    markers: [],
    infoWindow: null
  });

  const [map, setMap] = useState<any>(null);

  // 경로 계산 시작
  useEffect(() => {
    if (departure && destination) {
      const timer = setTimeout(() => {
        calculateRoute();
      }, 1000); // 1초 후 계산 시작

      return () => clearTimeout(timer);
    }
  }, [departure, destination]);

  // 경로 계산
  const calculateRoute = useCallback(async () => {
    if (!departure || !destination) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🔥 경로 계산 시작:', { departure, destination });

      // 1. 경로 계산
      const routeInfo = await routeAPI.calculateRoute(departure, destination);
      console.log('🔥 경로 계산 완료:', {
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        pathPoints: routeInfo.path.length
      });

      // 2. 휴게소 정보 조회 (새로운 통합 API 사용)
      console.log('🔥 휴게소 검색 시작...');
      const routeRestAreas = await highwayAPI.getRestAreasWithDetailsOnRoute(
        routeInfo.path, 
        3 // 3km 버퍼로 더 정확한 매칭
      );

      console.log('🔥 휴게소 검색 완료:', routeRestAreas.length, '개 발견');

      const updatedRouteInfo = {
        ...routeInfo,
        restAreas: routeRestAreas
      };

      setState(prev => ({
        ...prev,
        route: updatedRouteInfo,
        restAreas: routeRestAreas,
        loading: false
      }));

      // 지도에 경로 및 마커 표시
      displayRouteOnMap(updatedRouteInfo);

      if (onRouteCalculated) {
        onRouteCalculated(updatedRouteInfo);
      }

    } catch (error) {
      console.error('🔥 경로/휴게소 계산 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '경로 계산 실패';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [departure, destination, onRouteCalculated, onError]);

  // 지도에 경로 표시
  const displayRouteOnMap = useCallback((routeInfo: RouteInfo) => {
    if (!window.kakao || !window.kakao.maps) return;

    // 기존 polyline과 마커 제거
    state.markers.forEach(marker => marker.setMap(null));
    if (state.polyline) {
      state.polyline.setMap(null);
    }
    if (state.infoWindow) {
      state.infoWindow.close();
    }

    // 지도 컨테이너 찾기 (임시 방법)
    const mapElement = document.querySelector('[id^="daumMap"]') as HTMLElement;
    if (!mapElement) return;

    // 새 지도 인스턴스 생성 (실제로는 기존 지도 사용해야 함)
    const mapInstance = new window.kakao.maps.Map(mapElement, {
      center: new window.kakao.maps.LatLng(
        (departure.lat + destination.lat) / 2,
        (departure.lng + destination.lng) / 2
      ),
      level: 8
    });

    // 경로 라인 생성
    const linePath = routeInfo.path.map(point => 
      new window.kakao.maps.LatLng(point.lat, point.lng)
    );

    const polyline = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeStyle: 'solid'
    });

    polyline.setMap(mapInstance);

    // 출발지/도착지 마커
    const startMarker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(departure.lat, departure.lng),
      image: createMarkerImage('start')
    });
    startMarker.setMap(mapInstance);

    const endMarker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(destination.lat, destination.lng),
      image: createMarkerImage('end')
    });
    endMarker.setMap(mapInstance);

    // 휴게소 마커
    const restAreaMarkers = routeInfo.restAreas.map(restArea => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(
          restArea.coordinates.lat, 
          restArea.coordinates.lng
        ),
        image: createMarkerImage('restarea')
      });

      marker.setMap(mapInstance);

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {
        showRestAreaInfo(restArea, marker);
      });

      return marker;
    });

    // 지도 범위 조정
    const bounds = new window.kakao.maps.LatLngBounds();
    bounds.extend(new window.kakao.maps.LatLng(departure.lat, departure.lng));
    bounds.extend(new window.kakao.maps.LatLng(destination.lat, destination.lng));
    routeInfo.restAreas.forEach(restArea => {
      bounds.extend(new window.kakao.maps.LatLng(
        restArea.coordinates.lat, 
        restArea.coordinates.lng
      ));
    });
    mapInstance.setBounds(bounds);

    setState(prev => ({
      ...prev,
      polyline,
      markers: [startMarker, endMarker, ...restAreaMarkers],
      infoWindow: new window.kakao.maps.InfoWindow({ zIndex: 1 })
    }));

  }, [departure, destination, state.polyline, state.markers, state.infoWindow]);

  // 마커 이미지 생성
  const createMarkerImage = (type: 'start' | 'end' | 'restarea') => {
    if (!window.kakao) return null;

    let imageSrc, imageSize, imageOption;

    switch (type) {
      case 'start':
        imageSrc = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="#ff4444"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
            <text x="16" y="20" text-anchor="middle" fill="#ff4444" font-size="12" font-weight="bold">S</text>
          </svg>
        `);
        imageSize = new window.kakao.maps.Size(32, 40);
        imageOption = { offset: new window.kakao.maps.Point(16, 40) };
        break;
        
      case 'end':
        imageSrc = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="#4444ff"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
            <text x="16" y="20" text-anchor="middle" fill="#4444ff" font-size="12" font-weight="bold">E</text>
          </svg>
        `);
        imageSize = new window.kakao.maps.Size(32, 40);
        imageOption = { offset: new window.kakao.maps.Point(16, 40) };
        break;
        
      case 'restarea':
        imageSrc = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.268 0 0 6.268 0 14c0 14 14 22 14 22s14-8 14-22C28 6.268 21.732 0 14 0z" fill="#28a745"/>
            <circle cx="14" cy="14" r="8" fill="white"/>
            <path d="M14 8c-1.1 0-2 .9-2 2v2h-1c-.55 0-1 .45-1 1s.45 1 1 1h1v2c0 1.1.9 2 2 2s2-.9 2-2v-2h1c.55 0 1-.45 1-1s-.45-1-1-1h-1v-2c0-1.1-.9-2-2-2z" fill="#28a745"/>
          </svg>
        `);
        imageSize = new window.kakao.maps.Size(28, 36);
        imageOption = { offset: new window.kakao.maps.Point(14, 36) };
        break;
        
      default:
        return null;
    }
    
    return new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  };

  // 휴게소 정보창 표시
  const showRestAreaInfo = useCallback((restArea: RestArea, marker: any) => {
    if (!state.infoWindow) return;

    // 거리 정보 추가
    const distanceInfo = restArea.routeDistance 
      ? `<p style="margin:2px 0;color:#28a745;font-weight:bold;">🚗 출발지로부터 ${restArea.routeDistance}km (${restArea.routeDuration || 0}분 소요)</p>`
      : '';

    // 매장 정보 표시 (기본 foods 속성 사용)
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
          <p style="margin:2px 0;">📍 ${restArea.address || '주소 정보 없음'}</p>
          <p style="margin:2px 0;">🕒 ${restArea.operatingHours}</p>
          ${restArea.phoneNumber ? `<p style="margin:2px 0;">📞 ${restArea.phoneNumber}</p>` : ''}
          <p style="margin:2px 0;">🛣️ ${restArea.routeCode} (${restArea.direction})</p>
          ${storeInfo}
          ${facilityInfo}
        </div>
        <div style="margin-top:10px;display:flex;gap:6px;">
          <button 
            onclick="window.showRestAreaDetail('${restArea.id}')" 
            style="padding:6px 12px;background:#28a745;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;flex:1;"
          >
            상세보기
          </button>
          ${restArea.foods && restArea.foods.length > 0 ? 
            `<button 
              onclick="window.showRestAreaMenu('${restArea.id}')" 
              style="padding:6px 12px;background:#007bff;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;flex:1;"
            >
              매장정보
            </button>` : ''
          }
        </div>
      </div>
    `;

    state.infoWindow.setContent(content);
    state.infoWindow.open(map, marker);
  }, [state.infoWindow, map]);

  // 전역 함수로 상세보기 핸들러 등록
  useEffect(() => {
    (window as any).showRestAreaDetail = (restAreaId: string) => {
      const restArea = state.restAreas.find(ra => ra.id === restAreaId);
      if (restArea) {
        console.log('🔥 휴게소 상세보기:', restArea.name);
        // 간단한 alert으로 상세 정보 표시 (나중에 모달로 대체 가능)
        let detailMsg = `🚻 ${restArea.name}\n\n`;
        detailMsg += `📍 ${restArea.address || '주소 정보 없음'}\n`;
        detailMsg += `🕒 ${restArea.operatingHours}\n`;
        if (restArea.phoneNumber) detailMsg += `📞 ${restArea.phoneNumber}\n`;
        detailMsg += `🛣️ ${restArea.routeCode} (${restArea.direction})\n`;
        if (restArea.routeDistance) {
          detailMsg += `🚗 출발지로부터 ${restArea.routeDistance}km (${restArea.routeDuration}분)\n`;
        }
        if (restArea.facilities.length > 0) {
          detailMsg += `\n🏢 편의시설:\n${restArea.facilities.join(', ')}`;
        }
        alert(detailMsg);
      }
    };

    (window as any).showRestAreaMenu = (restAreaId: string) => {
      const restArea = state.restAreas.find(ra => ra.id === restAreaId);
      if (restArea?.foods) {
        console.log('🔥 휴게소 매장정보:', restArea.name);
        let menuMsg = `🍽️ ${restArea.name} 인기 매장\n\n`;
        restArea.foods.slice(0, 5).forEach((food, idx) => {
          menuMsg += `${idx + 1}. ${food.name}\n`;
          if (food.category) menuMsg += `   분류: ${food.category}\n`;
          if (food.price) menuMsg += `   가격: ${food.price}\n`;
          menuMsg += '\n';
        });
        if (restArea.foods.length > 5) {
          menuMsg += `... 외 ${restArea.foods.length - 5}개 매장 더`;
        }
        alert(menuMsg);
      }
    };

    return () => {
      delete (window as any).showRestAreaDetail;
      delete (window as any).showRestAreaMenu;
    };
  }, [state.restAreas]);

  // 렌더링할 내용 없음 (지도에 직접 그리기 때문)
  return null;
}