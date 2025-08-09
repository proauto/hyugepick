'use client';

import { useEffect, useRef, useState } from 'react';
import { Coordinates } from '@/types/map';

interface TestMapProps {
  departure: Coordinates;
  destination: Coordinates;
  onRouteCalculated?: (route: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function TestMap({ 
  departure, 
  destination, 
  onRouteCalculated, 
  onError,
  className = ''
}: TestMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initMap = async () => {
      if (!isMounted) return;
      
      try {
        console.log('Starting map initialization...');
        
        // DOM 요소 확인
        if (!mapRef.current) {
          console.log('DOM element not ready');
          return;
        }
        
        // Kakao Maps 로드 확인
        if (!window.kakao || !window.kakao.maps) {
          console.log('Loading Kakao Maps...');
          await loadKakaoMaps();
        }
        
        if (!isMounted) return;
        
        console.log('Creating map...');
        const mapOption = {
          center: new window.kakao.maps.LatLng(
            (departure.lat + destination.lat) / 2,
            (departure.lng + destination.lng) / 2
          ),
          level: 8
        };

        const map = new window.kakao.maps.Map(mapRef.current, mapOption);
        mapInstance.current = map;
        console.log('Map created successfully');

        // 마커 추가
        const startMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(departure.lat, departure.lng)
        });
        startMarker.setMap(map);

        const endMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(destination.lat, destination.lng)
        });
        endMarker.setMap(map);

        // 경로 라인
        const polyline = new window.kakao.maps.Polyline({
          path: [
            new window.kakao.maps.LatLng(departure.lat, departure.lng),
            new window.kakao.maps.LatLng(destination.lat, destination.lng)
          ],
          strokeWeight: 5,
          strokeColor: '#FF0000',
          strokeOpacity: 0.8
        });
        polyline.setMap(map);

        // 지도 범위 조정
        const bounds = new window.kakao.maps.LatLngBounds();
        bounds.extend(new window.kakao.maps.LatLng(departure.lat, departure.lng));
        bounds.extend(new window.kakao.maps.LatLng(destination.lat, destination.lng));
        map.setBounds(bounds);

        setMapStatus('loaded');
        
        // 경로 정보 콜백
        if (onRouteCalculated) {
          onRouteCalculated({
            distance: 350000,
            duration: 14400,
            fare: 15000,
            path: [
              { lat: departure.lat, lng: departure.lng },
              { lat: destination.lat, lng: destination.lng }
            ],
            restAreas: []
          });
        }
        
      } catch (error) {
        console.error('Map initialization error:', error);
        if (isMounted) {
          setMapStatus('error');
          setErrorMessage(error instanceof Error ? error.message : '지도 로드 실패');
          if (onError) {
            onError(error instanceof Error ? error.message : '지도 로드 실패');
          }
        }
      }
    };

    const loadKakaoMaps = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
        if (!jsKey) {
          reject(new Error('Kakao API 키가 설정되지 않았습니다.'));
          return;
        }

        const script = document.createElement('script');
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&libraries=services,clusterer&autoload=false`;
        script.async = true;
        
        script.onload = () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => resolve());
          } else {
            reject(new Error('Kakao Maps 로드 실패'));
          }
        };
        
        script.onerror = () => reject(new Error('스크립트 로드 실패'));
        document.head.appendChild(script);
      });
    };

    // 짧은 지연 후 초기화 시작
    const timer = setTimeout(() => {
      if (isMounted && mapRef.current) {
        initMap();
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [departure.lat, departure.lng, destination.lat, destination.lng, onRouteCalculated, onError]);

  if (mapStatus === 'error') {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded-lg border border-red-200 ${className}`}>
        <div className="text-center p-8">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">지도 로딩 실패</h3>
          <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  if (mapStatus === 'loading') {
    return (
      <div className={`flex items-center justify-center bg-blue-50 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-blue-600">지도를 불러오는 중...</p>
          <p className="text-xs text-blue-500 mt-2">잠시만 기다려주세요</p>
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
    </div>
  );
}