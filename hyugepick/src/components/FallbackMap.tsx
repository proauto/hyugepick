'use client';

import { useState } from 'react';

interface FallbackMapProps {
  departure: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  onRouteCalculated?: (route: any) => void;
  className?: string;
}

export default function FallbackMap({ 
  departure, 
  destination, 
  onRouteCalculated,
  className = '' 
}: FallbackMapProps) {
  const [viewType, setViewType] = useState<'naver' | 'google' | 'tmap'>('naver');

  // 거리 계산 (직선거리)
  const calculateDistance = () => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (destination.lat - departure.lat) * Math.PI / 180;
    const dLon = (destination.lng - departure.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(departure.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = calculateDistance();
  const estimatedTime = Math.round(distance / 80 * 60); // 80km/h 평균속도

  // 외부 지도 링크 생성
  const getMapLinks = () => {
    const depCoords = `${departure.lat},${departure.lng}`;
    const destCoords = `${destination.lat},${destination.lng}`;
    
    return {
      naver: `https://map.naver.com/p/directions/${depCoords}/${destCoords}/-/car`,
      google: `https://www.google.com/maps/dir/${depCoords}/${destCoords}`,
      tmap: `https://tmap.life/route?startX=${departure.lng}&startY=${departure.lat}&endX=${destination.lng}&endY=${destination.lat}`
    };
  };

  const mapLinks = getMapLinks();

  // 경로 정보 콜백 호출
  if (onRouteCalculated) {
    onRouteCalculated({
      distance: distance * 1000, // 미터 단위
      duration: estimatedTime * 60, // 초 단위
      fare: Math.round(distance * 50), // 예상 통행료
      path: [departure, destination],
      restAreas: [] // 휴게소는 외부 지도에서 확인
    });
  }

  return (
    <div className={`bg-white border border-gray-300 rounded-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">경로 정보</h3>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
            대안 지도
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-800">직선거리</div>
            <div className="text-blue-600 font-bold">{distance.toFixed(1)}km</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-800">예상시간</div>
            <div className="text-blue-600 font-bold">{estimatedTime}분</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-800">예상 통행료</div>
            <div className="text-blue-600 font-bold">{Math.round(distance * 50)}원</div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            📍 Kakao Maps를 불러올 수 없어 외부 지도 서비스를 이용해주세요
          </p>
          <div className="flex space-x-2">
            {Object.entries(mapLinks).map(([name, url]) => (
              <button
                key={name}
                onClick={() => {
                  setViewType(name as any);
                  window.open(url, '_blank');
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === name 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {name === 'naver' && '네이버 지도'}
                {name === 'google' && 'Google Maps'}
                {name === 'tmap' && 'T맵'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">출발지</div>
              <div className="text-sm text-gray-600">
                위도: {departure.lat.toFixed(6)}, 경도: {departure.lng.toFixed(6)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center my-4">
            <div className="border-l-2 border-dashed border-gray-300 h-8"></div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">도착지</div>
              <div className="text-sm text-gray-600">
                위도: {destination.lat.toFixed(6)}, 경도: {destination.lng.toFixed(6)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <strong>안내:</strong> 위 버튼을 클릭하면 외부 지도 앱이 열립니다. 
              정확한 경로와 휴게소 정보는 해당 지도에서 확인하실 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}