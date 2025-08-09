'use client';

import { useEffect, useRef, useState } from 'react';

export default function KakaoMapTest() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('준비 중...');
  const [attempts, setAttempts] = useState(0);

  const forceInitialize = () => {
    setAttempts(prev => prev + 1);
    setStatus('강제 초기화 시도 중...');
    
    console.log(`Force initialize attempt ${attempts + 1}`);
    
    // 기존 스크립트 제거
    const existingScripts = document.querySelectorAll('script[src*="dapi.kakao.com"]');
    existingScripts.forEach(script => script.remove());
    
    // 새 스크립트 로드
    const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!jsKey) {
      setStatus('Kakao API 키가 설정되지 않았습니다.');
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`;
    script.async = true;
    
    script.onload = () => {
      console.log('Script loaded, checking kakao object...');
      
      if (window.kakao) {
        console.log('Kakao object found!');
        setStatus('Kakao 객체 발견, 지도 초기화 중...');
        
        window.kakao.maps.load(() => {
          console.log('Kakao maps loaded, creating map...');
          createTestMap();
        });
      } else {
        console.log('Script loaded but no kakao object');
        setStatus('스크립트는 로드되었지만 kakao 객체가 없음');
      }
    };
    
    script.onerror = () => {
      console.error('Script loading failed');
      setStatus('스크립트 로드 실패');
    };
    
    document.head.appendChild(script);
  };

  const createTestMap = () => {
    try {
      if (!mapRef.current) {
        setStatus('지도 컨테이너 없음');
        return;
      }

      console.log('Creating map instance...');
      
      const mapOption = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울시청
        level: 3
      };

      const map = new window.kakao.maps.Map(mapRef.current, mapOption);
      
      // 마커 추가
      const markerPosition = new window.kakao.maps.LatLng(37.5665, 126.9780);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition
      });
      marker.setMap(map);

      console.log('Map created successfully!');
      setStatus('✅ 지도 생성 성공!');

    } catch (error) {
      console.error('Map creation error:', error);
      setStatus(`지도 생성 실패: ${error}`);
    }
  };

  useEffect(() => {
    // 페이지 로드 시 자동 시도
    const timer = setTimeout(() => {
      if (!window.kakao) {
        forceInitialize();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4 border border-gray-300 rounded-lg">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">Kakao Map 테스트</h3>
        <div className="text-sm mb-2">
          <strong>상태:</strong> {status}
        </div>
        <div className="text-sm mb-2">
          <strong>시도 횟수:</strong> {attempts}
        </div>
        <button
          onClick={forceInitialize}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          강제 초기화 ({attempts})
        </button>
      </div>
      
      <div
        ref={mapRef}
        className="w-full h-64 bg-gray-200 rounded"
        style={{ minHeight: '300px' }}
      >
        {status.includes('준비') && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">지도 준비 중...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}