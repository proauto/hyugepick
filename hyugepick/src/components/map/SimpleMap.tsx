'use client';

import { useEffect, useRef } from 'react';

interface SimpleMapProps {
  className?: string;
}

export default function SimpleMap({ className = '' }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeMap = () => {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.Map) {
        console.log('Kakao Maps not fully ready, retrying...');
        setTimeout(initializeMap, 500);
        return;
      }

      if (!mapRef.current) {
        console.log('Map container not ready, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }

      console.log('Creating simple map directly...');
      
      try {
        // 지도를 표시할 div와 지도 옵션
        const mapOption = { 
          center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울시청 좌표
          level: 3 // 지도의 확대 레벨
        };

        // 지도를 생성합니다
        const map = new window.kakao.maps.Map(mapRef.current, mapOption);
        console.log('Map instance created:', map);

        // 마커가 표시될 위치입니다
        const markerPosition = new window.kakao.maps.LatLng(37.5665, 126.9780);

        // 마커를 생성합니다
        const marker = new window.kakao.maps.Marker({
          position: markerPosition
        });

        // 마커가 지도 위에 표시되도록 설정합니다
        marker.setMap(map);

        console.log('✅ Simple map created successfully!');
      } catch (error) {
        console.error('❌ Map creation error:', error);
        setTimeout(initializeMap, 1000);
      }
    };

    // 짧은 지연 후 초기화
    setTimeout(initializeMap, 500);
  }, []);

  return (
    <div className={`${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border"
      />
    </div>
  );
}