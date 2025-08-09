'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import { MapProps } from '@/types/map';

// 지도 컴포넌트를 lazy loading으로 분리
const KakaoMap = lazy(() => import('./KakaoMap'));

interface LazyMapProps extends MapProps {
  fallback?: React.ReactNode;
  loadingDelay?: number;
}

export default function LazyMap({ 
  fallback, 
  loadingDelay = 300,
  ...mapProps 
}: LazyMapProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    // Intersection Observer로 뷰포트 감지
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      {
        rootMargin: '100px', // 100px 전에 미리 로딩 시작
        threshold: 0.1
      }
    );

    const mapContainer = document.getElementById('lazy-map-container');
    if (mapContainer) {
      observer.observe(mapContainer);
    }

    return () => {
      if (mapContainer) {
        observer.unobserve(mapContainer);
      }
    };
  }, []);

  useEffect(() => {
    if (isInView) {
      // 지연 시간 후 지도 로드
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, loadingDelay);

      return () => clearTimeout(timer);
    }
  }, [isInView, loadingDelay]);

  const defaultFallback = (
    <div className="w-full h-full min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">지도 준비 중</h3>
        <p className="text-sm text-gray-500">
          잠시만 기다려주세요...
        </p>
      </div>
    </div>
  );

  return (
    <div 
      id="lazy-map-container" 
      className={`relative ${mapProps.className || ''}`}
      style={{ minHeight: '400px' }}
    >
      {shouldLoad ? (
        <Suspense fallback={fallback || defaultFallback}>
          <KakaoMap {...mapProps} />
        </Suspense>
      ) : (
        <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            {/* 지도 아이콘 */}
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              지도 로딩 대기 중
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              성능 최적화를 위해 필요할 때 지도를 로드합니다
            </p>
            
            <button
              onClick={() => setShouldLoad(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              지금 지도 로드하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}