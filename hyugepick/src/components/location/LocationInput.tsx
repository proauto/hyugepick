'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocation } from '@/hooks/useLocation';
import { useKakaoMap } from '@/hooks/useKakaoMap';
import LocationPermissionModal from './LocationPermissionModal';

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
  enableGPS?: boolean;
  error?: string;
  className?: string;
}

export default function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  enableGPS = false,
  error,
  className = ''
}: LocationInputProps) {
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isRetryPermission, setIsRetryPermission] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    location, 
    loading: locationLoading, 
    error: locationError, 
    permission,
    getCurrentLocation, 
    requestPermission,
    clearError,
    isPWA 
  } = useLocation();

  const { geocode } = useKakaoMap();

  // GPS 위치 변경 감지
  useEffect(() => {
    if (enableGPS && location && location.address) {
      onChange(location.address, {
        lat: location.latitude,
        lng: location.longitude
      });
    }
  }, [location, enableGPS, onChange]);

  // 장소 검색 상태
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 카카오 Places API를 사용한 키워드 검색
  const searchPlaces = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      console.log('🔥 카카오 Places 검색 시작:', keyword);
      
      // 카카오맵 API 상태 확인
      console.log('🔥 카카오맵 API 상태 확인:');
      console.log('- window.kakao:', !!window.kakao);
      console.log('- window.kakao.maps:', !!(window.kakao && window.kakao.maps));
      console.log('- window.kakao.maps.services:', !!(window.kakao && window.kakao.maps && window.kakao.maps.services));
      console.log('- window.kakao.maps.services.Places:', !!(window.kakao && window.kakao.maps && window.kakao.maps.services && window.kakao.maps.services.Places));
      
      // 카카오맵 API 로딩 대기 (더 오래)
      let retryCount = 0;
      const maxRetries = 40; // 10초 대기
      
      while (retryCount < maxRetries && (!window.kakao || !window.kakao.maps || !window.kakao.maps.services || !window.kakao.maps.services.Places)) {
        if (retryCount % 4 === 0) { // 1초마다 로그
          console.log(`🔥 카카오맵 API 로딩 대기... (${retryCount + 1}/${maxRetries})`);
          console.log('- 현재 상태:', {
            kakao: !!window.kakao,
            maps: !!(window.kakao && window.kakao.maps),
            services: !!(window.kakao && window.kakao.maps && window.kakao.maps.services),
            Places: !!(window.kakao && window.kakao.maps && window.kakao.maps.services && window.kakao.maps.services.Places)
          });
        }
        await new Promise(resolve => setTimeout(resolve, 250));
        retryCount++;
      }
      
      // 최종 상태 확인
      console.log('🔥 최종 카카오맵 API 상태:', {
        kakao: !!window.kakao,
        maps: !!(window.kakao && window.kakao.maps),
        services: !!(window.kakao && window.kakao.maps && window.kakao.maps.services),
        Places: !!(window.kakao && window.kakao.maps && window.kakao.maps.services && window.kakao.maps.services.Places)
      });
      
      // Kakao Places API 사용
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        const places = new window.kakao.maps.services.Places();
        
        places.keywordSearch(keyword, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            console.log('🔥 검색 결과:', result);
            setSearchResults(result.slice(0, 5)); // 상위 5개만
            setShowResults(true);
          } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
            setSearchResults([]);
            setShowResults(false);
            setSearchError('검색 결과가 없습니다.');
          } else {
            setSearchError('검색 중 오류가 발생했습니다.');
          }
          setIsSearching(false);
        });
      } else {
        throw new Error('카카오맵 API가 로드되지 않았습니다.');
      }
    } catch (error) {
      console.error('🔥 Places 검색 오류:', error);
      setSearchError('검색 중 오류가 발생했습니다.');
      setIsSearching(false);
    }
  };

  // 검색 결과 선택 처리
  const handlePlaceSelect = (place: any) => {
    console.log('🔥 장소 선택:', place);
    
    // 장소명을 우선으로 하되, 주소도 포함
    const selectedAddress = place.place_name;
    const fullAddress = place.road_address_name || place.address_name;
    const coordinates = {
      lat: parseFloat(place.y),
      lng: parseFloat(place.x)
    };

    console.log('🔥 선택된 주소:', selectedAddress);
    console.log('🔥 좌표:', coordinates);

    // 부모 컴포넌트에 선택된 장소 정보 전달
    onChange(selectedAddress, coordinates);
    
    // 검색 상태 초기화
    setShowResults(false);
    setSearchResults([]);
    setSearchKeyword(''); // 검색 키워드 초기화
    setSearchError(null);
    
    console.log('🔥 장소 선택 완료');
  };

  // 입력 필드 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);
    
    // 실시간 검색 (300ms 디바운스)
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchPlaces(keyword);
    }, 300);
  };

  // 검색 타임아웃 레퍼런스
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // 컴포넌트 언마운트시 타임아웃 클리어
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // 외부 클릭시 검색 결과 닫기
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && dropdownRef.current) {
        const target = event.target as Node;
        if (!inputRef.current.contains(target) && !dropdownRef.current.contains(target)) {
          setShowResults(false);
          // 외부 클릭시에만 검색 키워드 초기화
          if (searchKeyword !== '' && !value) {
            setSearchKeyword('');
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchKeyword, value]);

  // GPS 버튼 클릭 핸들러
  const handleGPSClick = () => {
    if (!isPWA) {
      // PWA가 아닌 환경에서도 GPS 기능 허용 (테스트 목적)
      console.warn('PWA 환경이 아닙니다. 일부 기능이 제한될 수 있습니다.');
    }

    if (permission === 'denied') {
      setIsRetryPermission(true);
      setShowPermissionModal(true);
    } else if (permission === 'granted') {
      getCurrentLocation();
    } else {
      setIsRetryPermission(false);
      setShowPermissionModal(true);
    }
  };

  // 권한 허용 핸들러
  const handleAllowPermission = async () => {
    if (isRetryPermission) {
      // 브라우저 설정 안내
      alert('브라우저 설정에서 위치 권한을 허용해주세요.\n주소창 왼쪽의 자물쇠 아이콘을 클릭하여 설정할 수 있습니다.');
    } else {
      await requestPermission();
    }
    setShowPermissionModal(false);
  };

  // 권한 거부 핸들러
  const handleDenyPermission = () => {
    setShowPermissionModal(false);
  };


  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchKeyword !== '' ? searchKeyword : value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full pl-4 pr-20 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white ${
            error || searchError 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300'
          }`}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            // 포커스를 잃었을 때 검색 키워드가 있으면서 선택되지 않았다면 초기화
            setTimeout(() => {
              if (searchKeyword !== '' && !value) {
                setSearchKeyword('');
              }
            }, 200); // 클릭 이벤트가 처리될 시간을 줌
          }}
        />
        
        {/* 검색 아이콘 */}
        <div className={`absolute top-1/2 transform -translate-y-1/2 p-2 ${
          enableGPS ? 'right-12' : 'right-3'
        }`}>
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* 검색 결과 드롭다운 */}
        {showResults && searchResults.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {searchResults.map((place, index) => (
              <div
                key={index}
                onMouseDown={(e) => {
                  // 마우스 다운 시 기본 동작 방지 (onBlur 방지)
                  e.preventDefault();
                }}
                onClick={() => handlePlaceSelect(place)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-800">{place.place_name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {place.road_address_name || place.address_name}
                </div>
                {place.category_name && (
                  <div className="text-xs text-blue-600 mt-1">{place.category_name}</div>
                )}
                {place.distance && (
                  <div className="text-xs text-gray-500 mt-1">{place.distance}m</div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* GPS 버튼 */}
        {enableGPS && (
          <button
            type="button"
            onClick={handleGPSClick}
            disabled={locationLoading}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
              locationLoading 
                ? 'text-blue-400 cursor-not-allowed' 
                : permission === 'granted' 
                  ? 'text-blue-600 hover:bg-blue-50' 
                  : 'text-gray-400 hover:bg-gray-50'
            }`}
            title="현재 위치 가져오기"
          >
            {locationLoading ? (
              <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}

      </div>

      {/* 에러 메시지 */}
      {(error || searchError || locationError) && (
        <p className="mt-1 text-sm text-red-600">
          {error || searchError || locationError}
        </p>
      )}


      {/* GPS 권한 모달 */}
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onAllow={handleAllowPermission}
        onDeny={handleDenyPermission}
        isRetry={isRetryPermission}
      />
    </div>
  );
}