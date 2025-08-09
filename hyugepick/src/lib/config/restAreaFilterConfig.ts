/**
 * 휴게소 필터링 공통 설정 파일
 * UnifiedRestAreaFilter와 RouteRestAreaService에서 공통으로 사용
 */

// 고속도로 우선 필터링 설정
export const HIGHWAY_FILTER_CONFIG = {
  maxDistanceFromRoute: 8000,         // 경로로부터 최대 거리 (8km) - 영동선/중앙선 포함
  maxDistanceFromIC: 2000,            // IC로부터 최대 거리 (m)
  minHighwayCoverage: 0.2,            // 최소 고속도로 커버리지 (20%)
  highwayConfidenceThreshold: 0.5,    // 고속도로 신뢰도 임계값 (50%)
} as const;

// 방향성 필터링 설정
export const DIRECTION_FILTER_CONFIG = {
  enableDirectionFilter: true,        // 방향성 필터링 사용
  useICBasedFilter: true,             // IC 기반 필터 사용
  directionStrictMode: false,         // 엄격 모드 해제 (관대하게)
  directionConfidenceThreshold: 0.4,  // 신뢰도 임계값 (40%)
  includeAmbiguousDirection: true,    // 애매한 경우도 포함
  includeUnknown: true,               // 방향 불명 포함
  includeBoth: true,                  // 양방향 휴게소 포함
} as const;

// 노선 코드 필터링 설정
export const ROUTE_CODE_FILTER_CONFIG = {
  usePrecisionRouteFilter: true,      // 노선 코드 정밀 필터 사용
  excludeBranchLines: false,          // 지선도 포함 (경로가 지나갈 수 있음)
  maxRouteDistance: 5000,             // 경로로부터 최대 거리 (m)
  strictRouteMatching: false,         // 엄격한 노선 매칭 해제
  routeAnalysisConfidence: 0.6,       // 노선 분석 신뢰도
} as const;

// 일반 필터링 설정
export const GENERAL_FILTER_CONFIG = {
  maxDistance: 2,                     // 경로로부터 최대 거리 (2km)
  minInterval: 15,                    // 휴게소간 최소 간격 (km)
  maxResults: 20,                     // 최대 결과 수
  highwayOnly: true,                  // 고속도로만
  includePrivateHighways: true,       // 민자고속도로 포함
} as const;

// 고속도로 우선 필터 옵션 (통합)
export const HIGHWAY_FIRST_FILTER_OPTIONS = {
  maxDistanceFromRoute: HIGHWAY_FILTER_CONFIG.maxDistanceFromRoute,
  maxDistanceFromIC: HIGHWAY_FILTER_CONFIG.maxDistanceFromIC,
  minHighwayCoverage: HIGHWAY_FILTER_CONFIG.minHighwayCoverage,
  highwayConfidenceThreshold: HIGHWAY_FILTER_CONFIG.highwayConfidenceThreshold,
  enableDirectionFilter: DIRECTION_FILTER_CONFIG.enableDirectionFilter,
  minInterval: GENERAL_FILTER_CONFIG.minInterval,
  maxResults: GENERAL_FILTER_CONFIG.maxResults,
} as const;

// IC 기반 방향 필터 옵션 (통합)
export const IC_BASED_FILTER_OPTIONS = {
  maxDistanceFromRoute: 2000, // 2km로 수정
  includeUnknown: DIRECTION_FILTER_CONFIG.includeUnknown,
  includeBoth: DIRECTION_FILTER_CONFIG.includeBoth,
  strictMode: DIRECTION_FILTER_CONFIG.directionStrictMode,
} as const;

// 노선 코드 정밀 필터 옵션 (통합)
export const ROUTE_CODE_FILTER_OPTIONS = {
  maxDistanceFromRoute: ROUTE_CODE_FILTER_CONFIG.maxRouteDistance,
  strictRouteMatching: ROUTE_CODE_FILTER_CONFIG.strictRouteMatching,
  excludeBranchLines: ROUTE_CODE_FILTER_CONFIG.excludeBranchLines,
  routeAnalysisConfidence: ROUTE_CODE_FILTER_CONFIG.routeAnalysisConfidence,
} as const;

// RouteRestAreaService 기본 옵션
export const ROUTE_SERVICE_DEFAULT_OPTIONS = {
  matching: {
    ...GENERAL_FILTER_CONFIG,
    ...DIRECTION_FILTER_CONFIG,
    ...ROUTE_CODE_FILTER_CONFIG,
    useHighwayFirstFilter: true,       // 고속도로 우선 필터 사용
    ...HIGHWAY_FILTER_CONFIG,
  },
  collection: {
    includeStores: true,
    includeFacilities: true,
    maxConcurrent: 3,
    timeout: 15000,
    retryCount: 2
  },
  includeAnalysis: true,
  formatOutput: true
} as const;

// UnifiedRestAreaFilter 기본 옵션
export const UNIFIED_FILTER_DEFAULT_OPTIONS = {
  maxDistance: 0.5,                    // 500m 반경 (km)
  minInterval: 8.0,                    // 8km 간격
  maxResults: 20,                      // 최대 20개
  confidenceThreshold: 0.3,            // 30% 이상 신뢰도
  includePrivateHighways: true         // 민자고속도로 포함
} as const;

// 필터 타입 열거형
export enum FilterType {
  HIGHWAY_FIRST = 'highway_first',     // 고속도로 우선
  IC_BASED = 'ic_based',               // IC 기반 방향
  ROUTE_CODE = 'route_code',           // 노선 코드 정밀
  DISTANCE_ONLY = 'distance_only'      // 거리만
}

// 현재 활성 필터 설정
export const ACTIVE_FILTER_TYPE = FilterType.HIGHWAY_FIRST;

// 필터 설정 가져오기 헬퍼 함수
export function getFilterConfig(filterType: FilterType = ACTIVE_FILTER_TYPE) {
  switch (filterType) {
    case FilterType.HIGHWAY_FIRST:
      return HIGHWAY_FIRST_FILTER_OPTIONS;
    case FilterType.IC_BASED:
      return IC_BASED_FILTER_OPTIONS;
    case FilterType.ROUTE_CODE:
      return ROUTE_CODE_FILTER_OPTIONS;
    case FilterType.DISTANCE_ONLY:
      return { maxDistance: GENERAL_FILTER_CONFIG.maxDistance };
    default:
      return HIGHWAY_FIRST_FILTER_OPTIONS;
  }
}

// 설정 병합 헬퍼 함수
export function mergeFilterOptions<T extends Record<string, any>>(
  defaultOptions: T,
  userOptions?: Partial<T>
): T {
  return { ...defaultOptions, ...userOptions };
}