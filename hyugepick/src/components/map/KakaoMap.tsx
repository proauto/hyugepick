'use client';

import { useEffect, useRef, useState } from 'react';
import { useKakaoMap } from '@/hooks/useKakaoMap';
import { MapProps, Coordinates } from '@/types/map';

export default function KakaoMap({ 
  center = { lat: 37.5665, lng: 126.9780 }, // 서울 시청 기본값
  level = 3,
  className = '',
  onMapLoad,
  children
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const { isLoaded, isLoading, error } = useKakaoMap();

  // 지도 초기화
  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      try {
        const mapInstance = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(center.lat, center.lng),
          level: level,
          disableDoubleClick: false,
          disableDoubleClickZoom: false,
          projectionId: null
        });

        // 모바일 터치 제스처 지원
        mapInstance.setDraggable(true);
        mapInstance.setZoomable(true);

        // 지도 컨트롤 추가
        const mapTypeControl = new window.kakao.maps.MapTypeControl();
        mapInstance.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

        const zoomControl = new window.kakao.maps.ZoomControl();
        mapInstance.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

        setMap(mapInstance);
        
        if (onMapLoad) {
          onMapLoad(mapInstance);
        }
      } catch (error) {
        console.error('지도 초기화 실패:', error);
      }
    }
  }, [isLoaded, center, level, map, onMapLoad]);

  // 중심점 변경
  useEffect(() => {
    if (map && center) {
      const moveLatLng = new window.kakao.maps.LatLng(center.lat, center.lng);
      map.setCenter(moveLatLng);
    }
  }, [map, center]);

  // 줌 레벨 변경
  useEffect(() => {
    if (map && level) {
      map.setLevel(level);
    }
  }, [map, level]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">지도 로딩 실패</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
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
      
      {/* 지도 위에 렌더링할 추가 컴포넌트들 */}
      {map && children}
      
      {/* 지도 로딩 오버레이 */}
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