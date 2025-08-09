'use client';

import { useState, useEffect } from 'react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  onDeny: () => void;
  isRetry?: boolean;
}

export default function LocationPermissionModal({
  isOpen,
  onClose,
  onAllow,
  onDeny,
  isRetry = false
}: LocationPermissionModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-transform duration-300 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}>
          
          {/* 헤더 */}
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isRetry ? 'GPS 권한이 필요합니다' : '위치 정보 사용 권한'}
            </h3>
            
            <p className="text-gray-600 text-sm leading-relaxed">
              {isRetry ? (
                <>
                  현재 위치 기반 서비스를 이용하려면<br />
                  GPS 권한을 허용해주세요.<br />
                  <span className="text-blue-600 font-medium mt-2 block">
                    브라우저 설정에서 권한을 변경할 수 있습니다.
                  </span>
                </>
              ) : (
                <>
                  가까운 휴게소를 찾기 위해<br />
                  현재 위치 정보가 필요합니다.<br />
                  <span className="text-gray-500 text-xs mt-2 block">
                    위치 정보는 휴게소 검색에만 사용됩니다.
                  </span>
                </>
              )}
            </p>
          </div>

          {/* 기능 설명 */}
          {!isRetry && (
            <div className="px-6 pb-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  위치 정보로 할 수 있는 것:
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li className="flex items-center">
                    <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    현재 위치 근처 휴게소 자동 검색
                  </li>
                  <li className="flex items-center">
                    <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    출발지 자동 입력으로 편리한 경로 검색
                  </li>
                  <li className="flex items-center">
                    <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    거리순 휴게소 정렬 및 추천
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="p-6 pt-2 flex flex-col space-y-3">
            <button
              onClick={onAllow}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isRetry ? '설정에서 권한 변경하기' : '위치 정보 사용 허용'}
            </button>
            
            <button
              onClick={onDeny}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              나중에 하기
            </button>

            {isRetry && (
              <p className="text-xs text-gray-500 text-center mt-2">
                수동으로 출발지를 입력하여 서비스를 이용할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}