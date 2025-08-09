'use client';

import { useState } from 'react';
import { Coordinates, RouteInfo, RestAreaDetail } from '@/types/map';
import { routeAPI } from '@/lib/routeApi';

interface RouteWithRestAreasExampleProps {
  className?: string;
}

export default function RouteWithRestAreasExample({ className = '' }: RouteWithRestAreasExampleProps) {
  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestArea, setSelectedRestArea] = useState<RestAreaDetail | null>(null);

  // 샘플 경로: 서울 → 부산
  const sampleOrigin: Coordinates = { lat: 37.5665, lng: 126.9780 }; // 서울
  const sampleDestination: Coordinates = { lat: 35.1796, lng: 129.0756 }; // 부산

  const handleCalculateRoute = async () => {
    setLoading(true);
    setError(null);
    setRouteInfo(null);

    try {
      console.log('경로 및 휴게소 정보 조회 시작...');
      
      const result = await routeAPI.calculateRouteWithRestAreas(
        sampleOrigin,
        sampleDestination,
        3 // 3km 반경 내 휴게소 검색
      );

      setRouteInfo(result);
      console.log('경로 및 휴게소 정보 조회 완료:', result);
      
    } catch (err) {
      console.error('경로 조회 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestAreaDetail = async (restAreaCode: string) => {
    try {
      console.log(`휴게소 ${restAreaCode} 상세정보 조회...`);
      
      const detail = await routeAPI.getRestAreaDetailInfo(restAreaCode);
      setSelectedRestArea(detail);
      
      if (detail) {
        console.log('휴게소 상세정보 조회 완료:', detail);
      }
    } catch (err) {
      console.error('휴게소 상세정보 조회 실패:', err);
    }
  };

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        카카오 경로 + 휴게소 정보 통합 조회
      </h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          서울 → 부산 경로 상의 휴게소 정보를 조회합니다.
        </p>
        
        <button
          onClick={handleCalculateRoute}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 cursor-not-allowed text-gray-600'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? '조회 중...' : '경로 및 휴게소 조회'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">오류: {error}</p>
        </div>
      )}

      {routeInfo && (
        <div className="space-y-6">
          {/* 경로 기본 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">경로 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">거리:</span>
                <span className="font-medium ml-2">{Math.round(routeInfo.distance / 1000)}km</span>
              </div>
              <div>
                <span className="text-gray-600">예상 시간:</span>
                <span className="font-medium ml-2">{Math.round(routeInfo.duration / 60)}분</span>
              </div>
              <div>
                <span className="text-gray-600">예상 요금:</span>
                <span className="font-medium ml-2">{routeInfo.fare.toLocaleString()}원</span>
              </div>
              <div>
                <span className="text-gray-600">휴게소 수:</span>
                <span className="font-medium ml-2">{routeInfo.restAreas.length}개</span>
              </div>
            </div>
          </div>

          {/* 경로 상 휴게소 목록 */}
          {routeInfo.restAreas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                경로 상 휴게소 목록 ({routeInfo.restAreas.length}개)
              </h3>
              
              <div className="space-y-3">
                {routeInfo.restAreas.map((restArea, index) => (
                  <div
                    key={restArea.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          {index + 1}. {restArea.name}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                          <div>📍 {restArea.address}</div>
                          <div>🛣️ {restArea.routeCode} ({restArea.direction})</div>
                          <div>⏰ {restArea.operatingHours}</div>
                        </div>

                        {/* 경로 상 거리/시간 정보 */}
                        {(restArea.routeDistance || restArea.routeDuration) && (
                          <div className="flex gap-4 text-sm">
                            {restArea.routeDistance && (
                              <span className="text-blue-600">
                                🚗 {restArea.routeDistance}km
                              </span>
                            )}
                            {restArea.routeDuration && (
                              <span className="text-green-600">
                                ⏱️ {restArea.routeDuration}분 소요
                              </span>
                            )}
                          </div>
                        )}

                        {/* 편의시설 */}
                        {restArea.facilities && restArea.facilities.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">편의시설: </span>
                            <span className="text-xs text-gray-600">
                              {restArea.facilities.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleRestAreaDetail(restArea.id)}
                        className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                      >
                        상세보기
                      </button>
                    </div>

                    {/* 매장/음식 정보 미리보기 */}
                    {restArea.detail?.foods && restArea.detail.foods.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500 mb-1 block">인기 음식 TOP 3:</span>
                        <div className="flex flex-wrap gap-1">
                          {restArea.detail.foods.slice(0, 3).map((food, idx) => (
                            <span
                              key={food.id}
                              className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded"
                            >
                              {food.name} ({food.price})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 선택된 휴게소 상세 정보 모달 */}
      {selectedRestArea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">휴게소 상세 정보</h3>
                <button
                  onClick={() => setSelectedRestArea(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 매장 정보 */}
              {selectedRestArea.foods.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    🍽️ 인기 매장 & 음식 ({selectedRestArea.foods.length}개)
                  </h4>
                  <div className="space-y-2">
                    {selectedRestArea.foods.map((food) => (
                      <div key={food.id} className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{food.name}</span>
                            <span className="text-gray-600 ml-2">({food.category})</span>
                          </div>
                          <span className="text-blue-600 font-medium">{food.price}</span>
                        </div>
                        {food.description && (
                          <p className="text-sm text-gray-600 mt-1">{food.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 편의시설 정보 */}
              {selectedRestArea.facilities.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    🏪 편의시설 ({selectedRestArea.facilities.length}개)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRestArea.facilities.map((facility) => (
                      <div key={facility.id} className="bg-gray-50 p-2 rounded text-sm">
                        <span className="font-medium">{facility.name}</span>
                        <span className="text-gray-600 ml-2">({facility.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                업데이트: {new Date(selectedRestArea.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}