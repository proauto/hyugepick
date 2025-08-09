'use client';

import { useState, useEffect, useCallback } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationState {
  location: Location | null;
  loading: boolean;
  error: string | null;
  permission: 'granted' | 'denied' | 'prompt' | 'unsupported';
}

interface UseLocationReturn extends LocationState {
  getCurrentLocation: () => Promise<void>;
  requestPermission: () => Promise<void>;
  clearError: () => void;
  isSupported: boolean;
  isPWA: boolean;
}

export const useLocation = (): UseLocationReturn => {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
    permission: 'prompt'
  });

  // PWA 환경 감지 (테스트 목적으로 항상 true로 설정)
  const isPWA = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://') ||
    true); // 개발/테스트 목적으로 일반 브라우저에서도 GPS 기능 허용

  // 지오로케이션 지원 여부 확인
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // 권한 상태 확인
  const checkPermission = useCallback(async () => {
    if (!isSupported) {
      setState(prev => ({ ...prev, permission: 'unsupported' }));
      return;
    }

    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setState(prev => ({ ...prev, permission: permission.state as any }));
        
        permission.addEventListener('change', () => {
          setState(prev => ({ ...prev, permission: permission.state as any }));
        });
      }
    } catch (error) {
      console.warn('Permission API not supported');
    }
  }, [isSupported]);

  // 현재 위치 가져오기
  const getCurrentLocation = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: 'GPS 기능을 지원하지 않는 브라우저입니다.',
        permission: 'unsupported'
      }));
      return;
    }

    // PWA 환경이 아닌 경우 경고만 표시 (기능은 동작)
    if (!isPWA) {
      console.warn('PWA 환경이 아닙니다. GPS 기능이 제한될 수 있습니다.');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5분
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // 역지오코딩으로 주소 가져오기
          const address = await reverseGeocode(latitude, longitude);
          
          setState(prev => ({
            ...prev,
            location: { latitude, longitude, address },
            loading: false,
            permission: 'granted'
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            location: { latitude, longitude },
            loading: false,
            permission: 'granted'
          }));
        }
      },
      (error) => {
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'GPS 권한이 거부되었습니다.';
            setState(prev => ({ ...prev, permission: 'denied' }));
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 요청 시간이 초과되었습니다.';
            break;
          default:
            errorMessage = '위치를 가져올 수 없습니다.';
            break;
        }
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
      },
      options
    );
  }, [isSupported, isPWA]);

  // 권한 요청
  const requestPermission = useCallback(async (): Promise<void> => {
    if (!isPWA) {
      return;
    }
    
    await getCurrentLocation();
  }, [getCurrentLocation, isPWA]);

  // 에러 초기화
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 컴포넌트 마운트 시 권한 상태 확인
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...state,
    getCurrentLocation,
    requestPermission,
    clearError,
    isSupported,
    isPWA
  };
};

// 역지오코딩 함수 (Kakao Maps API 사용)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Kakao Maps가 로드되었는지 확인
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps && window.kakao.maps.services) {
      return new Promise((resolve, reject) => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        const coord = new window.kakao.maps.LatLng(lat, lng);
        
        geocoder.coord2Address(coord.getLng(), coord.getLat(), (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const address = result[0].road_address 
              ? result[0].road_address.address_name 
              : result[0].address.address_name;
            resolve(address);
          } else {
            // Kakao API 실패시 좌표 기반 더미 주소 반환
            resolve(`위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`);
          }
        });
      });
    } else {
      // Kakao Maps가 로드되지 않은 경우 좌표 기반 더미 주소 반환
      return `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
    }
  } catch (error) {
    // 에러 발생시 좌표 기반 더미 주소 반환
    return `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
  }
}