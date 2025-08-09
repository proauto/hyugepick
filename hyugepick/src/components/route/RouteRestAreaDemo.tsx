'use client';

import { useState } from 'react';
import { RouteRestAreaResult } from '@/lib/routeRestAreaService';

interface RouteRestAreaDemoProps {
  className?: string;
}

export default function RouteRestAreaDemo({ className = '' }: RouteRestAreaDemoProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteRestAreaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<'basic' | 'recommendations' | 'section'>('basic');

  // 데모 시나리오들
  const demoScenarios = {
    basic: {
      title: '기본 경로 휴게소 조회',
      description: '서울 → 부산 경로상의 모든 휴게소 정보를 조회합니다.',
      endpoint: '/api/route/rest-areas',
      payload: {
        origin: { lat: 37.5665, lng: 126.9780 },  // 서울시청
        destination: { lat: 35.1796, lng: 129.0756 }, // 부산시청
        maxDistance: 5,
        minInterval: 20,
        maxResults: 15
      }
    },
    recommendations: {
      title: '최적화된 휴게소 추천',
      description: '연료/식사 시점을 고려한 스마트 휴게소 추천을 제공합니다.',
      endpoint: '/api/route/rest-areas/recommendations',
      payload: {
        origin: { lat: 37.5665, lng: 126.9780 },
        destination: { lat: 35.1796, lng: 129.0756 },
        preferences: {
          fuelStopInterval: 250,
          mealStopInterval: 2.5,
          preferredFacilities: ['주유소', '전기차충전소', '음식점', '화장실']
        }
      }
    },
    section: {
      title: '구간별 휴게소 조회',  
      description: '대전-대구 구간(150-300km)의 휴게소만 조회합니다.',
      endpoint: '/api/route/rest-areas?originLat=37.5665&originLng=126.9780&destLat=35.1796&destLng=129.0756&startKm=150&endKm=300',
      payload: null
    }
  };

  // API 호출 함수
  const executeDemo = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const scenario = demoScenarios[selectedDemo];

    try {
      console.log(`${scenario.title} 실행 중...`);

      const response = scenario.payload 
        ? await fetch(scenario.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scenario.payload)
          })
        : await fetch(scenario.endpoint);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      
      console.log(`${scenario.title} 완료:`, data);

    } catch (err) {
      console.error(`${scenario.title} 실패:`, err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}>
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🚗 경로 휴게소 통합 서비스 데모
        </h1>
        <p className="text-gray-600">
          카카오모빌리티 경로 API + 한국도로공사 휴게소 API를 통합한 고급 휴게소 정보 서비스입니다.
        </p>
      </div>

      {/* 데모 시나리오 선택 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">데모 시나리오 선택</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {Object.entries(demoScenarios).map(([key, scenario]) => (
            <div
              key={key}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedDemo === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedDemo(key as any)}
            >
              <h3 className="font-semibold text-gray-800 mb-2">{scenario.title}</h3>
              <p className="text-sm text-gray-600">{scenario.description}</p>
              {key === selectedDemo && (
                <div className="mt-2 text-xs text-blue-600">
                  ✓ 선택됨
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 선택된 시나리오 상세 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="mb-2">
            <span className="font-medium text-gray-700">API 엔드포인트:</span>
            <code className="ml-2 px-2 py-1 bg-gray-200 rounded text-sm">
              {demoScenarios[selectedDemo].endpoint}
            </code>
          </div>
          {demoScenarios[selectedDemo].payload && (
            <div>
              <span className="font-medium text-gray-700">요청 데이터:</span>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify(demoScenarios[selectedDemo].payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 실행 버튼 */}
      <div className="mb-6">
        <button
          onClick={executeDemo}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            loading
              ? 'bg-gray-300 cursor-not-allowed text-gray-600'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {loading ? (
            <>
              <div className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              실행 중...
            </>
          ) : (
            `${demoScenarios[selectedDemo].title} 실행`
          )}
        </button>
      </div>

      {/* 오류 표시 */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">❌ 오류 발생</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 결과 표시 */}
      {result && (
        <div className="space-y-6">
          {/* 경로 정보 요약 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">
              📍 경로 정보
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">총 거리:</span>
                <span className="ml-2 text-blue-900">{result.route_info.total_distance}km</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">소요시간:</span>
                <span className="ml-2 text-blue-900">{result.route_info.total_duration}분</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">휴게소 수:</span>
                <span className="ml-2 text-blue-900">{result.rest_areas.length}개</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">평균 간격:</span>
                <span className="ml-2 text-blue-900">{result.analysis_summary.average_interval}km</span>
              </div>
            </div>
            
            {/* 고속도로 구간 정보 */}
            {result.route_info.highway_sections.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <span className="text-blue-700 font-medium mb-2 block">🛣️ 고속도로 구간:</span>
                <div className="flex flex-wrap gap-2">
                  {result.route_info.highway_sections.map((section, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs"
                    >
                      {section.name} ({section.distance}km)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 추천 정보 (추천 API인 경우에만) */}
          {(result as any).recommendations && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                ⭐ 추천 휴게소
              </h3>
              <div className="space-y-2">
                {(result as any).recommendations
                  .filter((rec: any) => rec.priority === 'high' || rec.priority === 'medium')
                  .slice(0, 5)
                  .map((rec: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border-l-4 border-green-400">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-green-800">{rec.restAreaName}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          rec.priority === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {rec.priority === 'high' ? '🔥 필수' : '👍 권장'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      💡 {rec.reason.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 휴게소 목록 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🏪 휴게소 상세 정보 ({result.rest_areas.length}개)
            </h3>
            
            <div className="space-y-4">
              {result.rest_areas.map((restArea, index) => (
                <div 
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* 휴게소 기본 정보 */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-800">
                        {index + 1}. {restArea.name}
                      </h4>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                        <span>📍 {restArea.distance_from_start} 지점</span>
                        <span>⏰ {restArea.estimated_time} 소요</span>
                        {restArea.distance_to_next && (
                          <span>➡️ 다음까지 {restArea.distance_to_next}</span>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      restArea.data_quality === 'high' 
                        ? 'bg-green-100 text-green-800'
                        : restArea.data_quality === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {restArea.data_quality === 'high' ? '🟢 고품질' 
                       : restArea.data_quality === 'medium' ? '🟡 보통'
                       : '🔘 저품질'} 데이터
                    </div>
                  </div>

                  {/* 편의시설 */}
                  {restArea.facilities.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">
                        🏢 편의시설:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {restArea.facilities.slice(0, 8).map((facility, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {facility}
                          </span>
                        ))}
                        {restArea.facilities.length > 8 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{restArea.facilities.length - 8}개 더
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 매장 정보 */}
                  {restArea.stores.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 mb-2 block">
                        🍽️ 매장 정보 ({restArea.stores.length}개):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {restArea.stores.slice(0, 4).map((store, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-gray-800">
                                {store.store_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {store.store_type}
                              </span>
                            </div>
                            {store.popular_items && store.popular_items.length > 0 && (
                              <div className="mt-1 text-xs text-gray-600">
                                인기: {store.popular_items.slice(0, 2).join(', ')}
                                {store.popular_items.length > 2 && '...'}
                              </div>
                            )}
                          </div>
                        ))}
                        {restArea.stores.length > 4 && (
                          <div className="bg-gray-50 p-3 rounded flex items-center justify-center text-gray-500 text-sm">
                            +{restArea.stores.length - 4}개 매장 더 있음
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 수집 시간 */}
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    📅 정보 수집: {new Date(restArea.collection_time).toLocaleString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* JSON 원본 데이터 (개발자용) */}
          <details className="bg-gray-50 p-4 rounded-lg">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              🔧 JSON 원본 데이터 보기 (개발자용)
            </summary>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}