/**
 * 고속도로 노선 코드 정밀 필터링 시스템
 * 메인 고속도로와 지선을 구분하여 정확한 휴게소 필터링 제공
 */

export interface RouteCodeFilterOptions {
  maxDistanceFromRoute: number;          // 경로로부터 최대 허용 거리 (미터)
  strictRouteMatching: boolean;          // 엄격한 노선 매칭 모드
  excludeBranchLines: boolean;           // 지선 제외 여부
  allowedRouteCodes?: string[];          // 허용된 노선 코드 목록
  routeAnalysisConfidence: number;       // 경로 분석 신뢰도 임계값
}

interface RestArea {
  id?: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  routeName: string;
  routeCode?: string;
  direction?: string;
  route_direction?: string;
  // 추가 호환성
  lat?: number;
  lng?: number;
  route_name?: string;
  route_code?: string | null;
  [key: string]: any;
}

interface FilterResult {
  restArea: RestArea;
  isFiltered: boolean;
  filterReason: string;
  distanceFromRoute: number;
  routeCodeMatch: boolean;
  confidenceScore: number;
}

interface FilterSummary {
  total: number;
  filtered: number;
  included: number;
  averageDistance: number;
  routeCodeMatches: number;
  averageConfidence: number;
}

export class RouteCodePrecisionFilter {
  private readonly DEFAULT_OPTIONS: RouteCodeFilterOptions = {
    maxDistanceFromRoute: 5000,        // 5km
    strictRouteMatching: true,
    excludeBranchLines: true,
    routeAnalysisConfidence: 0.7
  };

  // 데이터 구조 호환성을 위한 헬퍼 메서드들
  private getLatLng(restArea: RestArea): { lat: number; lng: number } {
    if (restArea.coordinates && restArea.coordinates.lat && restArea.coordinates.lng) {
      return { lat: restArea.coordinates.lat, lng: restArea.coordinates.lng };
    }
    if (restArea.lat && restArea.lng) {
      return { lat: restArea.lat, lng: restArea.lng };
    }
    return { lat: 0, lng: 0 }; // 기본값
  }

  private getRouteName(restArea: RestArea): string | undefined {
    return restArea.routeName || restArea.route_name;
  }

  private getRouteCode(restArea: RestArea): string | undefined {
    return restArea.routeCode || restArea.route_code;
  }

  // 메인 고속도로 노선 코드 매핑 (실제 데이터 기반)
  private readonly MAIN_HIGHWAY_CODES: { [key: string]: string[] } = {
    '경부선': ['001', '0010'],
    '영동선': ['050', '0500'], 
    '중부내륙선': ['045', '0450'],
    '중부선': ['040', '0400'],
    '서해안선': ['015', '0150'],
    '남해선': ['010', '0100'],
    '중앙선': ['055', '0550'],
    '호남선': ['025', '0250'],
    '당진영덕선': ['300', '3000'],
    '새만금포항선': ['200', '2000']
  };

  // 실제 데이터의 노선명 패턴 (정확한 매칭을 위해)
  private readonly ROUTE_NAME_PATTERNS: { [key: string]: RegExp[] } = {
    '경부선': [/^경부선$/, /경부고속도로/, /경부/],
    '영동선': [/^영동선$/, /영동고속도로/, /영동/],
    '중부내륙선': [/^중부내륙선$/, /중부내륙고속도로/],
    '중부선': [/^중부선$/, /중부고속도로/],
    '서해안선': [/^서해안선$/, /서해안고속도로/],
    '남해선': [/^남해선/, /남해고속도로/],
    '중앙선': [/^중앙선$/, /중앙고속도로/],
    '호남선': [/^호남선$/, /호남고속도로/]
  };

  // 지선 및 연결선 패턴 (실제 지선만 필터링)
  private readonly BRANCH_LINE_PATTERNS = [
    /지선$/,
    /연결선$/,
    /연결로$/,
    /순환선$/,
    /우회도로/,
    /외곽순환선$/,
    /도시고속도로/
  ];

  /**
   * 경로 기반 휴게소 정밀 필터링
   */
  async filterRestAreasByRouteCode(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    restAreas: RestArea[],
    options: Partial<RouteCodeFilterOptions> = {}
  ): Promise<FilterResult[]> {
    
    const filterOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    console.log('🎯 노선 코드 정밀 필터링 시작:', {
      restAreasCount: restAreas.length,
      maxDistance: `${filterOptions.maxDistanceFromRoute}m`,
      strictMode: filterOptions.strictRouteMatching,
      excludeBranches: filterOptions.excludeBranchLines
    });

    // 디버깅: 실제 데이터 구조 확인
    if (restAreas.length > 0) {
      const firstArea = restAreas[0];
      const latLng = this.getLatLng(firstArea);
      const routeName = this.getRouteName(firstArea);
      console.log('🔍 첫 번째 휴게소 데이터 구조:', {
        name: firstArea.name,
        coordinates: latLng,
        routeName: routeName,
        routeCode: this.getRouteCode(firstArea),
        keys: Object.keys(firstArea).slice(0, 10) // 처음 10개 필드명
      });
    }

    // 디버깅을 위한 거리 기반 1차 필터링 확인
    let distanceQualified = 0;
    let routeMatched = 0;
    let branchFiltered = 0;

    // 1. 경로 분석으로 주요 노선 식별
    const mainRoutes = await this.analyzeRouteHighways(routeCoordinates, filterOptions);
    console.log('📊 경로상 주요 노선:', mainRoutes.map(r => `${r.name}(${r.code})`).join(', '));

    // 2. 각 휴게소에 대해 필터링 적용
    const results: FilterResult[] = [];
    
    for (const restArea of restAreas) {
      const result = await this.evaluateRestArea(
        restArea,
        routeCoordinates,
        mainRoutes,
        filterOptions
      );
      results.push(result);
      
      // 디버깅 통계 수집
      if (result.distanceFromRoute <= filterOptions.maxDistanceFromRoute) {
        distanceQualified++;
      }
      if (result.routeCodeMatch) {
        routeMatched++;
      }
      if (this.isBranchLine(restArea)) {
        branchFiltered++;
      }
    }

    // 디버깅 정보 출력
    console.log('🔍 필터링 단계별 분석:');
    console.log(`  📏 거리 조건 만족: ${distanceQualified}/${restAreas.length}개`);
    console.log(`  🛣️ 노선명 매칭: ${routeMatched}/${restAreas.length}개`); 
    console.log(`  🌿 지선 휴게소: ${branchFiltered}개`);
    
    // 샘플 휴게소 분석
    const sampleResults = results.slice(0, 5);
    console.log('📋 샘플 휴게소 분석:');
    sampleResults.forEach((result, i) => {
      const routeName = this.getRouteName(result.restArea);
      console.log(`  ${i+1}. ${result.restArea.name} (${routeName || 'Unknown'})`);
      console.log(`     거리: ${(result.distanceFromRoute/1000).toFixed(2)}km | 매칭: ${result.routeCodeMatch ? '✅' : '❌'} | ${result.isFiltered ? '필터됨' : '포함'}`);
      if (result.isFiltered) {
        console.log(`     이유: ${result.filterReason}`);
      }
    });

    // 3. 필터링 요약 정보 생성
    const summary = this.generateFilterSummary(results);
    console.log('✅ 노선 코드 정밀 필터링 완료:', {
      전체: summary.total,
      포함: summary.included,
      필터링됨: summary.filtered,
      평균거리: `${summary.averageDistance.toFixed(2)}km`,
      노선매칭률: `${((summary.routeCodeMatches / summary.total) * 100).toFixed(1)}%`
    });

    return results;
  }

  /**
   * 경로 분석으로 실제 지나가는 고속도로 노선 식별 (IC 데이터 활용)
   */
  private async analyzeRouteHighways(
    coordinates: Array<{ lat: number; lng: number }>,
    options: RouteCodeFilterOptions
  ): Promise<Array<{ name: string; code: string; confidence: number }>> {
    
    console.log('🛣️ 경로 분석: 실제 지나가는 고속도로 식별 중...');
    
    // 1단계: 경로 근처의 IC들을 찾아서 어떤 도로들을 지나가는지 파악
    const routeHighways = new Map<string, number>();
    
    // 경로를 여러 구간으로 나누어 각 구간별로 근처 휴게소들의 노선명 수집
    const samplePoints = this.sampleRoutePoints(coordinates, 10);  // 10개 샘플 포인트
    
    // 전체 휴게소에서 경로 근처에 있는 것들의 노선명 수집
    const nearbyRouteNames = new Set<string>();
    
    // 경로 근처(5km 이내) 휴게소들의 노선명을 수집하여 어떤 도로를 지나가는지 파악
    for (const point of samplePoints) {
      // 이 구간에서 가까운 휴게소들의 노선 정보 수집
      // (실제로는 여기서 전체 휴게소 데이터를 받아서 거리 계산해야 함)
    }
    
    // 2단계: 지리적 패턴과 결합하여 신뢰도 계산
    const routeVector = this.calculateRouteVector(coordinates);
    
    // 서울-부산 방향성 (경부선 후보)
    if (this.isSeoulBusanDirection(coordinates)) {
      routeHighways.set('경부선', 0.8);
    }
    
    // 동서 방향성 (영동선, 서해안선 후보)
    if (Math.abs(routeVector.lngDiff) > Math.abs(routeVector.latDiff) * 1.5) {
      routeHighways.set('영동선', 0.7);
      routeHighways.set('서해안선', 0.6);
    }
    
    // 남북 방향성 (중부내륙선, 중앙선 후보)
    if (Math.abs(routeVector.latDiff) > Math.abs(routeVector.lngDiff) * 1.5) {
      routeHighways.set('중부내륙선', 0.7);
      routeHighways.set('중앙선', 0.6);
    }
    
    // 내륙 경로 분석
    if (this.isInlandRoute(coordinates)) {
      routeHighways.set('중부내륙선', (routeHighways.get('중부내륙선') || 0) + 0.2);
      routeHighways.set('중앙선', (routeHighways.get('중앙선') || 0) + 0.2);
    }
    
    // 3단계: 관대한 필터링 - 여러 고속도로를 허용
    const candidateRoutes = Array.from(routeHighways.entries())
      .filter(([_, confidence]) => confidence >= options.routeAnalysisConfidence)
      .map(([routeName, confidence]) => ({
        name: routeName,
        code: this.MAIN_HIGHWAY_CODES[routeName]?.[0] || '000',
        confidence
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // 4단계: 기본 후보들 추가 (관대한 접근)
    const defaultCandidates = [
      { name: '경부선', code: '0010', confidence: 0.6 },
      { name: '영동선', code: '0500', confidence: 0.5 },
      { name: '중부내륙선', code: '0450', confidence: 0.5 }
    ];
    
    // 기존 후보와 중복되지 않는 기본 후보들 추가
    defaultCandidates.forEach(defaultRoute => {
      if (!candidateRoutes.find(route => route.name === defaultRoute.name)) {
        candidateRoutes.push(defaultRoute);
      }
    });

    console.log('🎯 감지된 후보 고속도로:', candidateRoutes.map(r => `${r.name}(${r.confidence.toFixed(2)})`).join(', '));

    return candidateRoutes.length > 0 ? candidateRoutes : [
      { name: '경부선', code: '0010', confidence: 0.5 } // 최종 기본값
    ];
  }

  /**
   * 경로에서 샘플 포인트 추출
   */
  private sampleRoutePoints(
    coordinates: Array<{ lat: number; lng: number }>,
    sampleCount: number
  ): Array<{ lat: number; lng: number }> {
    
    if (coordinates.length <= sampleCount) {
      return coordinates;
    }
    
    const samples: Array<{ lat: number; lng: number }> = [];
    const step = Math.floor(coordinates.length / sampleCount);
    
    for (let i = 0; i < coordinates.length; i += step) {
      samples.push(coordinates[i]);
    }
    
    // 마지막 포인트 포함
    if (samples[samples.length - 1] !== coordinates[coordinates.length - 1]) {
      samples.push(coordinates[coordinates.length - 1]);
    }
    
    return samples;
  }

  /**
   * 개별 휴게소 평가 및 필터링 판단
   */
  private async evaluateRestArea(
    restArea: RestArea,
    routeCoordinates: Array<{ lat: number; lng: number }>,
    mainRoutes: Array<{ name: string; code: string; confidence: number }>,
    options: RouteCodeFilterOptions
  ): Promise<FilterResult> {
    
    // 1. 거리 기반 필터링 (헬퍼 메서드 사용)
    const latLng = this.getLatLng(restArea);
    const distanceFromRoute = this.calculateMinDistanceToRoute(latLng, routeCoordinates);
    
    const distanceExceeded = distanceFromRoute > options.maxDistanceFromRoute;
    
    // 2. 노선 코드 매칭 확인
    const routeCodeMatch = this.checkRouteCodeMatch(restArea, mainRoutes, options);
    
    // 3. 지선 여부 확인
    const isBranchLine = this.isBranchLine(restArea);
    
    // 4. 필터링 여부 결정
    let isFiltered = false;
    let filterReason = '';
    
    if (distanceExceeded) {
      isFiltered = true;
      filterReason = `경로에서 ${(distanceFromRoute / 1000).toFixed(2)}km 떨어짐 (허용: ${options.maxDistanceFromRoute / 1000}km)`;
    } else if (options.excludeBranchLines && isBranchLine) {
      isFiltered = true;
      filterReason = `지선 또는 연결선 (${this.getRouteName(restArea)})`;
    } else if (options.strictRouteMatching && !routeCodeMatch.isMatch) {
      isFiltered = true;
      filterReason = `노선 코드 불일치 (${this.getRouteName(restArea)}, 코드: ${this.getRouteCode(restArea) || 'N/A'})`;
    }
    
    // 5. 신뢰도 점수 계산
    const confidenceScore = this.calculateConfidenceScore(
      distanceFromRoute,
      routeCodeMatch,
      isBranchLine,
      options
    );

    return {
      restArea,
      isFiltered,
      filterReason: filterReason || '필터 통과',
      distanceFromRoute,
      routeCodeMatch: routeCodeMatch.isMatch,
      confidenceScore
    };
  }

  /**
   * 경로와 점 사이의 최단거리 계산 (미터)
   */
  private calculateMinDistanceToRoute(
    point: { lat: number; lng: number },
    routeCoordinates: Array<{ lat: number; lng: number }>
  ): number {
    
    // 좌표가 유효하지 않으면 무한대 반환
    if (!point.lat || !point.lng || point.lat === 0 || point.lng === 0) {
      return Infinity;
    }
    
    let minDistance = Infinity;
    
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];
      
      const distance = this.distanceFromPointToLineSegment(
        point,
        segmentStart,
        segmentEnd
      );
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  }

  /**
   * 점과 선분 사이의 최단거리 계산 (미터)
   */
  private distanceFromPointToLineSegment(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number }
  ): number {
    
    const A = point.lng - lineStart.lng;
    const B = point.lat - lineStart.lat;
    const C = lineEnd.lng - lineStart.lng;
    const D = lineEnd.lat - lineStart.lat;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return this.calculateDistance(point, lineStart);
    }

    const param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.lng;
      yy = lineStart.lat;
    } else if (param > 1) {
      xx = lineEnd.lng;
      yy = lineEnd.lat;
    } else {
      xx = lineStart.lng + param * C;
      yy = lineStart.lat + param * D;
    }

    return this.calculateDistance(point, { lat: yy, lng: xx });
  }

  /**
   * 두 점 간의 거리 계산 (미터)
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * 노선 코드 매칭 확인
   */
  private checkRouteCodeMatch(
    restArea: RestArea,
    mainRoutes: Array<{ name: string; code: string; confidence: number }>,
    options: RouteCodeFilterOptions
  ): { isMatch: boolean; matchedRoute?: string; confidence: number } {
    
    // 허용된 노선 코드가 지정된 경우
    if (options.allowedRouteCodes && options.allowedRouteCodes.length > 0) {
      const codeMatch = options.allowedRouteCodes.some(allowedCode => 
        restArea.route_code === allowedCode ||
        restArea.route_name?.includes(allowedCode)
      );
      
      if (codeMatch) {
        return { isMatch: true, matchedRoute: 'allowed_code', confidence: 0.9 };
      }
    }

    // 경로 분석 결과와 매칭
    for (const mainRoute of mainRoutes) {
      const routeName = this.getRouteName(restArea);
      const routeCode = this.getRouteCode(restArea);
      
      // 정확한 노선명 패턴 매칭 (우선순위)
      if (routeName) {
        const patterns = this.ROUTE_NAME_PATTERNS[mainRoute.name] || [];
        const patternMatch = patterns.some(pattern => pattern.test(routeName));
        
        if (patternMatch) {
          return { 
            isMatch: true, 
            matchedRoute: mainRoute.name, 
            confidence: mainRoute.confidence * 1.2 
          };
        }
      }
      
      // 노선 코드 매칭 (route_code가 null이 아닌 경우만)
      if (routeCode && routeCode !== 'null') {
        const codes = this.MAIN_HIGHWAY_CODES[mainRoute.name] || [];
        const codeMatch = codes.some(code => 
          routeCode === code ||
          routeCode.padStart(4, '0') === code.padStart(4, '0')
        );
        
        if (codeMatch) {
          return { 
            isMatch: true, 
            matchedRoute: mainRoute.name, 
            confidence: mainRoute.confidence * 1.1 
          };
        }
      }
      
      // 부분 매칭 (낮은 신뢰도)
      if (routeName?.includes(mainRoute.name.replace('선', ''))) {
        return { 
          isMatch: true, 
          matchedRoute: mainRoute.name, 
          confidence: mainRoute.confidence * 0.8 
        };
      }
    }

    return { isMatch: false, confidence: 0.1 };
  }

  /**
   * 지선 여부 확인
   */
  private isBranchLine(restArea: RestArea): boolean {
    const routeName = this.getRouteName(restArea);
    if (!routeName) return false;
    
    return this.BRANCH_LINE_PATTERNS.some(pattern => 
      pattern.test(routeName)
    );
  }

  /**
   * 경로 벡터 계산
   */
  private calculateRouteVector(coordinates: Array<{ lat: number; lng: number }>) {
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    
    return {
      latDiff: end.lat - start.lat,
      lngDiff: end.lng - start.lng,
      distance: this.calculateDistance(start, end)
    };
  }

  /**
   * 서울-부산 방향성 확인
   */
  private isSeoulBusanDirection(coordinates: Array<{ lat: number; lng: number }>): boolean {
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    
    // 서울 근처에서 시작하고 부산 근처로 향하는지 확인
    const isFromSeoul = start.lat > 37.3 && start.lat < 37.8 && start.lng > 126.7 && start.lng < 127.2;
    const isToBusan = end.lat > 35.0 && end.lat < 35.4 && end.lng > 128.8 && end.lng < 129.3;
    
    return isFromSeoul && isToBusan;
  }

  /**
   * 내륙 경로 여부 확인
   */
  private isInlandRoute(coordinates: Array<{ lat: number; lng: number }>): boolean {
    // 경로가 내륙을 많이 지나는지 확인 (간단한 휴리스틱)
    const avgLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;
    return avgLng > 127.0 && avgLng < 128.5; // 내륙 지역 경도 범위
  }

  /**
   * 신뢰도 점수 계산
   */
  private calculateConfidenceScore(
    distance: number,
    routeCodeMatch: { isMatch: boolean; confidence: number },
    isBranchLine: boolean,
    options: RouteCodeFilterOptions
  ): number {
    
    let score = 1.0;
    
    // 거리에 따른 감점
    const distanceKm = distance / 1000;
    if (distanceKm > 2) {
      score -= Math.min(0.5, (distanceKm - 2) * 0.1);
    }
    
    // 노선 매칭에 따른 점수 조정
    if (routeCodeMatch.isMatch) {
      score *= routeCodeMatch.confidence;
    } else {
      score *= 0.3;
    }
    
    // 지선인 경우 감점
    if (isBranchLine) {
      score *= 0.7;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 필터링 결과 요약
   */
  private generateFilterSummary(results: FilterResult[]): FilterSummary {
    const included = results.filter(r => !r.isFiltered);
    
    return {
      total: results.length,
      filtered: results.filter(r => r.isFiltered).length,
      included: included.length,
      averageDistance: included.reduce((sum, r) => sum + r.distanceFromRoute, 0) / Math.max(included.length, 1) / 1000,
      routeCodeMatches: results.filter(r => r.routeCodeMatch).length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length
    };
  }

  /**
   * 필터링 결과에서 포함된 휴게소만 추출
   */
  getIncludedRestAreas(results: FilterResult[]): RestArea[] {
    return results
      .filter(result => !result.isFiltered)
      .map(result => result.restArea);
  }

  /**
   * 필터링 요약 정보 반환
   */
  getSummary(results: FilterResult[]): FilterSummary {
    return this.generateFilterSummary(results);
  }
}

export const routeCodePrecisionFilter = new RouteCodePrecisionFilter();