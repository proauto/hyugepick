'use client';

import { useEffect, useRef, useState } from 'react';
import { useKakaoMap } from '@/hooks/useKakaoMap';
import { Coordinates } from '@/types/map';

interface MapWithRouteProps {
  departure: Coordinates;
  destination: Coordinates;
  onRouteCalculated?: (route: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function MapWithRoute({ 
  departure, 
  destination, 
  onRouteCalculated, 
  onError,
  className = ''
}: MapWithRouteProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const { isLoaded, isLoading, error: mapError } = useKakaoMap();

  // 지도 초기화
  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      try {
        const mapInstance = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(
            (departure.lat + destination.lat) / 2,
            (departure.lng + destination.lng) / 2
          ),
          level: 8,
        });

        // 지도 컨트롤 추가
        const zoomControl = new window.kakao.maps.ZoomControl();
        mapInstance.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

        setMap(mapInstance);
      } catch (error) {
        console.error('지도 초기화 실패:', error);
        if (onError) {
          onError('지도를 초기화할 수 없습니다.');
        }
      }
    }
  }, [isLoaded, departure, destination, map, onError]);

  // 경로 및 마커 표시
  useEffect(() => {
    if (map && departure && destination) {
      drawRouteAndMarkers();
    }
  }, [map, departure, destination]);

  const drawRouteAndMarkers = async () => {
    if (!map) return;

    try {
      // 기존 오버레이 제거
      if (map.clearOverlayMap) {
        map.clearOverlayMap();
      }

      // 출발지 마커
      const startMarkerImage = new window.kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png',
        new window.kakao.maps.Size(50, 45),
        { offset: new window.kakao.maps.Point(15, 43) }
      );

      const startMarker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(departure.lat, departure.lng),
        image: startMarkerImage
      });
      startMarker.setMap(map);

      // 도착지 마커
      const endMarkerImage = new window.kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png',
        new window.kakao.maps.Size(50, 45),
        { offset: new window.kakao.maps.Point(15, 43) }
      );

      const endMarker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(destination.lat, destination.lng),
        image: endMarkerImage
      });
      endMarker.setMap(map);

      // 경로 라인 그리기
      const linePath = [
        new window.kakao.maps.LatLng(departure.lat, departure.lng),
        new window.kakao.maps.LatLng(
          (departure.lat + destination.lat) / 2,
          (departure.lng + destination.lng) / 2
        ),
        new window.kakao.maps.LatLng(destination.lat, destination.lng)
      ];

      const polyline = new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 6,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
      });
      polyline.setMap(map);

      // 휴게소 마커 추가
      const restAreas = generateMockRestAreas(departure, destination);
      restAreas.forEach((restArea, index) => {
        const restMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(restArea.coordinates.lat, restArea.coordinates.lng)
        });
        restMarker.setMap(map);

        // 마커 클릭 이벤트
        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `
            <div style="padding:10px;min-width:200px;">
              <h4 style="margin:0 0 8px 0;color:#333;font-size:14px;font-weight:bold;">
                ${restArea.name}
              </h4>
              <div style="color:#666;font-size:12px;line-height:1.4;">
                <p style="margin:2px 0;">📍 ${restArea.address}</p>
                <p style="margin:2px 0;">🕒 ${restArea.operatingHours}</p>
                <p style="margin:4px 0 2px 0;"><strong>편의시설:</strong><br/>${restArea.facilities.join(', ')}</p>
              </div>
            </div>
          `
        });

        window.kakao.maps.event.addListener(restMarker, 'click', () => {
          infoWindow.open(map, restMarker);
        });
      });

      // 지도 범위 설정
      const bounds = new window.kakao.maps.LatLngBounds();
      bounds.extend(new window.kakao.maps.LatLng(departure.lat, departure.lng));
      bounds.extend(new window.kakao.maps.LatLng(destination.lat, destination.lng));
      restAreas.forEach(restArea => {
        bounds.extend(new window.kakao.maps.LatLng(restArea.coordinates.lat, restArea.coordinates.lng));
      });
      map.setBounds(bounds);

      // 경로 정보 콜백
      const mockRouteInfo = {
        distance: 350000,
        duration: 14400,
        fare: 15000,
        path: linePath.map(latlng => ({ lat: latlng.getLat(), lng: latlng.getLng() })),
        restAreas: restAreas
      };

      setRouteData(mockRouteInfo);
      if (onRouteCalculated) {
        onRouteCalculated(mockRouteInfo);
      }

    } catch (error) {
      console.error('경로 표시 실패:', error);
      if (onError) {
        onError('경로를 표시할 수 없습니다.');
      }
    }
  };

  // 더미 휴게소 데이터 생성
  const generateMockRestAreas = (start: Coordinates, end: Coordinates) => {
    return [
      {
        id: 'rest1',
        name: '서울톨게이트 휴게소',
        coordinates: {
          lat: start.lat + (end.lat - start.lat) * 0.3,
          lng: start.lng + (end.lng - start.lng) * 0.3
        },
        routeCode: 'KR001',
        direction: '부산방향',
        facilities: ['주유소', '편의점', '화장실', '음식점'],
        operatingHours: '24시간',
        phoneNumber: '02-123-4567',
        address: '경기도 성남시 분당구',
        foods: []
      },
      {
        id: 'rest2',
        name: '대전 휴게소',
        coordinates: {
          lat: start.lat + (end.lat - start.lat) * 0.6,
          lng: start.lng + (end.lng - start.lng) * 0.6
        },
        routeCode: 'KR001',
        direction: '부산방향',
        facilities: ['주유소', '편의점', '화장실', '음식점', 'ATM'],
        operatingHours: '24시간',
        phoneNumber: '042-123-4567',
        address: '대전광역시 유성구',
        foods: []
      }
    ];
  };

  if (mapError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">지도 로딩 실패</h3>
          <p className="text-sm text-gray-600">{mapError}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {!map && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">지도 초기화 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}