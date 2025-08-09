'use client';

import { useState, useCallback } from 'react';
import Script from 'next/script';
import LocationInput from '@/components/location/LocationInput';
import RouteMap from '@/components/map/RouteMap';
import KakaoDebugger from '@/components/KakaoDebugger';
import { useKakaoMap } from '@/hooks/useKakaoMap';

interface LocationData {
  address: string;
  coordinates?: { lat: number; lng: number };
}

export default function RoutePage() {
  const [departure, setDeparture] = useState<LocationData>({ address: '' });
  const [destination, setDestination] = useState<LocationData>({ address: '' });
  const [errors, setErrors] = useState<{ departure?: string; destination?: string }>({});
  const [isSearching, setIsSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const { geocode } = useKakaoMap();

  // 유효성 검사
  const validateInputs = (): boolean => {
    const newErrors: { departure?: string; destination?: string } = {};

    if (!departure.address.trim()) {
      newErrors.departure = '출발지를 입력해주세요.';
    } else if (departure.address.trim().length < 2) {
      newErrors.departure = '출발지를 2글자 이상 입력해주세요.';
    }

    if (!destination.address.trim()) {
      newErrors.destination = '도착지를 입력해주세요.';
    } else if (destination.address.trim().length < 2) {
      newErrors.destination = '도착지를 2글자 이상 입력해주세요.';
    }

    if (departure.address.trim() === destination.address.trim() && 
        departure.address.trim().length > 0) {
      newErrors.destination = '출발지와 도착지가 같습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 출발지 변경 핸들러
  const handleDepartureChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setDeparture({ address, coordinates });
    if (errors.departure) {
      setErrors(prev => ({ ...prev, departure: undefined }));
    }
  };

  // 도착지 변경 핸들러
  const handleDestinationChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setDestination({ address, coordinates });
    if (errors.destination) {
      setErrors(prev => ({ ...prev, destination: undefined }));
    }
  };

  // 위치 교환
  const handleSwapLocations = () => {
    const temp = { ...departure };
    setDeparture({ ...destination });
    setDestination(temp);
    setErrors({});
  };

  // 검색 실행
  const handleSearch = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      // Kakao Maps가 로드될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 1. 주소를 좌표로 변환
      let departureCoords = departure.coordinates;
      let destinationCoords = destination.coordinates;

      if (!departureCoords) {
        const coords = await geocode(departure.address);
        if (!coords) {
          throw new Error('출발지 주소를 찾을 수 없습니다.');
        }
        departureCoords = coords;
      }

      if (!destinationCoords) {
        const coords = await geocode(destination.address);
        if (!coords) {
          throw new Error('도착지 주소를 찾을 수 없습니다.');
        }
        destinationCoords = coords;
      }

      // 2. 좌표 업데이트
      setDeparture(prev => ({ ...prev, coordinates: departureCoords }));
      setDestination(prev => ({ ...prev, coordinates: destinationCoords }));

      // 3. 지도 표시
      setShowMap(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.';
      setSearchError(errorMessage);
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 입력 초기화
  const handleReset = () => {
    setDeparture({ address: '' });
    setDestination({ address: '' });
    setErrors({});
    setShowMap(false);
    setRouteInfo(null);
    setSearchError(null);
  };

  // 경로 계산 완료 핸들러 (메모이제이션)
  const handleRouteCalculated = useCallback((route: any) => {
    setRouteInfo(route);
  }, []);

  // 경로 계산 에러 핸들러 (메모이제이션)
  const handleRouteError = useCallback((error: string) => {
    setSearchError(error);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          경로 검색
        </h1>
        <p className="text-gray-600">
          출발지와 도착지를 입력하여 경로상의 휴게소를 찾아보세요
        </p>
      </div>

      {/* 검색 폼 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="space-y-6">
          {/* 출발지 입력 */}
          <LocationInput
            label="출발지"
            placeholder="출발지를 입력하세요 (예: 서울시 강남구)"
            value={departure.address}
            onChange={handleDepartureChange}
            enableGPS={true}
            error={errors.departure}
          />

          {/* 위치 교환 버튼 */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title="출발지와 도착지 바꾸기"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* 도착지 입력 */}
          <LocationInput
            label="도착지"
            placeholder="도착지를 입력하세요 (예: 부산시 해운대구)"
            value={destination.address}
            onChange={handleDestinationChange}
            error={errors.destination}
          />

          {/* 버튼 영역 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              초기화
            </button>
            
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="flex-2 py-3 px-6 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  검색 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  휴게소 검색
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 검색 에러 메시지 */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
              <p className="text-sm text-red-700 mt-1">{searchError}</p>
            </div>
          </div>
        </div>
      )}

      {/* 경로 정보 */}
      {routeInfo && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-medium text-green-900 mb-3">경로 정보</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-green-800">거리</div>
              <div className="text-green-700">{(routeInfo.distance / 1000).toFixed(1)}km</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-800">예상 시간</div>
              <div className="text-green-700">{Math.round(routeInfo.duration / 60)}분</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-800">휴게소</div>
              <div className="text-green-700">{routeInfo.restAreas?.length || 0}개</div>
            </div>
          </div>
        </div>
      )}

      {/* 지도 표시 */}
      {showMap && departure.coordinates && destination.coordinates && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">경로 및 휴게소 위치</h3>
          <div className="rounded-xl overflow-hidden shadow-lg">
            <RouteMap
              departure={departure.coordinates}
              destination={destination.coordinates}
              onRouteCalculated={handleRouteCalculated}
              onError={handleRouteError}
              className="w-full"
            />
          </div>
        </div>
      )}


      {/* 안내 메시지 */}
      {!showMap && (
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                이용 안내
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• PWA 환경에서 GPS 버튼으로 현재 위치를 자동 입력할 수 있습니다</li>
                <li>• 주소는 2글자 이상 입력하시면 자동완성 목록이 나타납니다</li>
                <li>• 정확한 주소를 입력할수록 더 정확한 경로를 제공합니다</li>
                <li>• 경로 검색 후 지도에서 휴게소 마커를 클릭하면 상세 정보를 확인할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Kakao Map 디버깅 - 임시 완전 제거 */}
      {false && (
        <div style={{ display: 'none' }}>
          <KakaoDebugger />
        </div>
      )}
    </div>
  );
}