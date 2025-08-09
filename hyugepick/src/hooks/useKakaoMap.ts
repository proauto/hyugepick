'use client';

import { useEffect, useState, useCallback } from 'react';

interface KakaoMapState {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useKakaoMap = () => {
  const [state, setState] = useState<KakaoMapState>({
    isLoaded: false,
    isLoading: false,
    error: null
  });

  const loadKakaoMap = useCallback(async () => {
    const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    
    if (!jsKey) {
      setState(prev => ({
        ...prev,
        error: 'Kakao JavaScript Key가 설정되지 않았습니다.'
      }));
      return;
    }

    // 이미 로드된 경우
    if (window.kakao && window.kakao.maps) {
      setState(prev => ({ ...prev, isLoaded: true, error: null }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 스크립트가 이미 로드 중인지 확인
      const existingScript = document.querySelector(`script[src*="dapi.kakao.com"]`);
      
      if (existingScript) {
        // 이미 로딩 중이면 로드 완료를 기다림
        await new Promise((resolve, reject) => {
          const checkKakao = () => {
            if (window.kakao && window.kakao.maps) {
              resolve(true);
            } else {
              setTimeout(checkKakao, 100);
            }
          };
          
          setTimeout(() => reject(new Error('Kakao Map 로딩 시간 초과')), 10000);
          checkKakao();
        });
      } else {
        // 새로 스크립트 로드
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&libraries=services,clusterer&autoload=false`;
          script.async = true;
          
          script.onload = () => {
            if (window.kakao && window.kakao.maps) {
              window.kakao.maps.load(() => {
                resolve();
              });
            } else {
              reject(new Error('Kakao Map 로드 실패'));
            }
          };
          
          script.onerror = () => {
            reject(new Error('Kakao Map 스크립트 로드 실패'));
          };
          
          document.head.appendChild(script);
        });
      }

      setState(prev => ({
        ...prev,
        isLoaded: true,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Kakao Map 로드 중 오류 발생'
      }));
    }
  }, []);

  // 지오코딩 (주소 -> 좌표)
  const geocode = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // 서비스가 로드될 때까지 대기
    let retryCount = 0;
    const maxRetries = 20;
    
    while ((!window.kakao || !window.kakao.maps || !window.kakao.maps.services) && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount++;
    }
    
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      throw new Error('Kakao Map 서비스가 로드되지 않았습니다.');
    }

    return new Promise((resolve, reject) => {
      const geocoder = new window.kakao.maps.services.Geocoder();
      
      geocoder.addressSearch(address, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          resolve({
            lat: parseFloat(result[0].y),
            lng: parseFloat(result[0].x)
          });
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  // 역지오코딩 (좌표 -> 주소)
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    // 서비스가 로드될 때까지 대기
    let retryCount = 0;
    const maxRetries = 20;
    
    while ((!window.kakao || !window.kakao.maps || !window.kakao.maps.services) && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount++;
    }
    
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      throw new Error('Kakao Map 서비스가 로드되지 않았습니다.');
    }

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
          resolve(null);
        }
      });
    });
  }, []);

  useEffect(() => {
    loadKakaoMap();
  }, [loadKakaoMap]);

  return {
    ...state,
    loadKakaoMap,
    geocode,
    reverseGeocode
  };
};