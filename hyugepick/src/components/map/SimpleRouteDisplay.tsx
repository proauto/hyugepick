'use client';

import { useEffect, useState } from 'react';
import { RouteDisplayProps, Coordinates } from '@/types/map';

// 테스트용 간단한 경로 표시 컴포넌트
export default function SimpleRouteDisplay({ 
  departure, 
  destination, 
  onRouteCalculated, 
  onError 
}: RouteDisplayProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (departure && destination) {
      simulateRouteCalculation();
    }
  }, [departure, destination, onRouteCalculated, onError]);

  const simulateRouteCalculation = async () => {
    setLoading(true);
    
    try {
      // 1초 대기 (API 호출 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 더미 경로 정보 생성
      const mockRoute = {
        distance: 350000, // 350km
        duration: 14400,  // 4시간
        fare: 15000,      // 15,000원
        path: generateMockPath(departure, destination),
        restAreas: generateMockRestAreas(departure, destination)
      };

      if (onRouteCalculated) {
        onRouteCalculated(mockRoute);
      }

    } catch (error) {
      if (onError) {
        onError('경로 계산에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 더미 경로 좌표 생성
  const generateMockPath = (start: Coordinates, end: Coordinates): Coordinates[] => {
    const path: Coordinates[] = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lng = start.lng + (end.lng - start.lng) * ratio;
      path.push({ lat, lng });
    }
    
    return path;
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
      },
      {
        id: 'rest3',
        name: '김천 휴게소',
        coordinates: {
          lat: start.lat + (end.lat - start.lat) * 0.8,
          lng: start.lng + (end.lng - start.lng) * 0.8
        },
        routeCode: 'KR001',
        direction: '부산방향',
        facilities: ['주유소', '편의점', '화장실', '음식점', '수면실'],
        operatingHours: '24시간',
        phoneNumber: '054-123-4567',
        address: '경상북도 김천시',
        foods: []
      }
    ];
  };

  if (loading) {
    return (
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm text-gray-700">경로 계산 중...</span>
        </div>
      </div>
    );
  }

  return null;
}