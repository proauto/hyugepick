/**
 * 경로-고속도로 매칭 서비스
 * IC 데이터를 활용하여 경로가 실제로 지나가는 고속도로를 정확하게 식별
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface RouteCoordinate {
  lat: number;
  lng: number;
}

interface InterchangeData {
  id: string;
  name: string;
  route_name: string;
  route_no: string;
  direction: string;
  weight: number;
  distance_from_start: number;
  lat: number;
  lng: number;
  prev_ic?: string;
  next_ic?: string;
}

interface DetectedHighway {
  routeName: string;
  routeNo: string;
  confidence: number;
  coveragePercentage: number;
  icCount: number;
  segments: Array<{
    startIC: string;
    endIC: string;
    distance: number;
  }>;
}

interface HighwayMatchResult {
  detectedHighways: DetectedHighway[];
  primaryHighway: DetectedHighway | null;
  routeCoverage: number;
  matchingQuality: 'high' | 'medium' | 'low';
}

export class RouteHighwayMatcher {
  private icDataCache: InterchangeData[] = [];
  private cacheExpiry = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30분
  
  /**
   * 경로가 실제로 지나가는 고속도로 식별
   */
  async matchRouteToHighways(
    routeCoordinates: RouteCoordinate[],
    options: {
      maxDistanceFromIC?: number;  // IC로부터 최대 거리 (미터)
      minCoverage?: number;        // 최소 경로 커버리지 (0-1)
      confidenceThreshold?: number; // 신뢰도 임계값
    } = {}
  ): Promise<HighwayMatchResult> {
    
    const {
      maxDistanceFromIC = 2000,    // 2km
      minCoverage = 0.3,           // 30%
      confidenceThreshold = 0.6    // 60%
    } = options;

    console.log('🛣️ 경로-고속도로 매칭 시작:', {
      routePoints: routeCoordinates.length,
      maxDistanceFromIC: `${maxDistanceFromIC}m`,
      minCoverage: `${minCoverage * 100}%`
    });

    // 1단계: IC 데이터 로드
    const icData = await this.loadICData();
    console.log(`📍 ${icData.length}개 IC 데이터 로드 완료`);

    // 2단계: 경로 근처 IC 찾기
    const nearbyICs = this.findNearbyICs(routeCoordinates, icData, maxDistanceFromIC);
    console.log(`🔍 경로 근처 IC: ${nearbyICs.length}개 발견`);

    // 3단계: 고속도로별 그룹화 및 분석
    const highwayAnalysis = this.analyzeHighwaysByICs(nearbyICs, routeCoordinates);
    console.log('📊 고속도로별 분석:', highwayAnalysis.map(h => 
      `${h.routeName}(${h.confidence.toFixed(2)}, ${h.coveragePercentage.toFixed(1)}%)`
    ).join(', '));

    // 4단계: 신뢰도 및 커버리지 필터링
    const validHighways = highwayAnalysis.filter(highway => 
      highway.confidence >= confidenceThreshold && 
      highway.coveragePercentage >= minCoverage * 100
    );

    // 5단계: 주요 고속도로 결정
    const primaryHighway = validHighways.length > 0 
      ? validHighways.reduce((prev, current) => 
          (prev.confidence * prev.coveragePercentage) > (current.confidence * current.coveragePercentage) 
            ? prev : current
        )
      : null;

    // 6단계: 매칭 품질 평가
    const routeCoverage = this.calculateRouteCoverage(routeCoordinates, nearbyICs);
    const matchingQuality = this.evaluateMatchingQuality(validHighways, routeCoverage);

    console.log('✅ 경로-고속도로 매칭 완료:', {
      detectedCount: validHighways.length,
      primaryHighway: primaryHighway?.routeName,
      routeCoverage: `${routeCoverage.toFixed(1)}%`,
      quality: matchingQuality
    });

    return {
      detectedHighways: validHighways,
      primaryHighway,
      routeCoverage,
      matchingQuality
    };
  }

  /**
   * IC 데이터 로드 (캐시 활용)
   */
  private async loadICData(): Promise<InterchangeData[]> {
    const now = Date.now();
    
    if (this.icDataCache.length > 0 && now < this.cacheExpiry) {
      return this.icDataCache;
    }

    const { data, error } = await supabase
      .from('interchanges')
      .select('*')
      .order('route_no, weight');

    if (error) {
      console.error('IC 데이터 로드 실패:', error);
      return [];
    }

    this.icDataCache = data || [];
    this.cacheExpiry = now + this.CACHE_DURATION;
    
    return this.icDataCache;
  }

  /**
   * 경로 근처 IC 찾기
   */
  private findNearbyICs(
    routeCoordinates: RouteCoordinate[],
    icData: InterchangeData[],
    maxDistance: number
  ): Array<InterchangeData & { distanceFromRoute: number; routeSegmentIndex: number }> {
    
    const nearbyICs: Array<InterchangeData & { distanceFromRoute: number; routeSegmentIndex: number }> = [];

    for (const ic of icData) {
      // 유효한 좌표인지 확인
      if (!ic.lat || !ic.lng || ic.lat < 33 || ic.lat > 39 || ic.lng < 125 || ic.lng > 132) {
        continue;
      }

      // 경로와 IC 사이의 최단거리 계산
      const { distance, segmentIndex } = this.calculateMinDistanceToRoute(
        { lat: ic.lat, lng: ic.lng },
        routeCoordinates
      );

      if (distance <= maxDistance) {
        nearbyICs.push({
          ...ic,
          distanceFromRoute: distance,
          routeSegmentIndex: segmentIndex
        });
      }
    }

    return nearbyICs.sort((a, b) => a.routeSegmentIndex - b.routeSegmentIndex);
  }

  /**
   * 고속도로별 분석
   */
  private analyzeHighwaysByICs(
    nearbyICs: Array<InterchangeData & { distanceFromRoute: number; routeSegmentIndex: number }>,
    routeCoordinates: RouteCoordinate[]
  ): DetectedHighway[] {
    
    // 노선별 그룹화
    const routeGroups = new Map<string, Array<InterchangeData & { distanceFromRoute: number; routeSegmentIndex: number }>>();
    
    nearbyICs.forEach(ic => {
      const key = `${ic.route_no}-${ic.route_name}`;
      if (!routeGroups.has(key)) {
        routeGroups.set(key, []);
      }
      routeGroups.get(key)!.push(ic);
    });

    const detectedHighways: DetectedHighway[] = [];

    routeGroups.forEach((ics, routeKey) => {
      const [routeNo, routeName] = routeKey.split('-', 2);
      
      // IC들을 경로상 순서대로 정렬
      const sortedICs = ics.sort((a, b) => a.routeSegmentIndex - b.routeSegmentIndex);
      
      // 연속성 분석
      const segments = this.analyzeICContinuity(sortedICs);
      
      // 커버리지 계산
      const coveragePercentage = this.calculateHighwayCoverage(sortedICs, routeCoordinates);
      
      // 신뢰도 계산
      const confidence = this.calculateHighwayConfidence(sortedICs, segments, coveragePercentage);

      detectedHighways.push({
        routeName,
        routeNo,
        confidence,
        coveragePercentage,
        icCount: ics.length,
        segments
      });
    });

    return detectedHighways.sort((a, b) => 
      (b.confidence * b.coveragePercentage) - (a.confidence * a.coveragePercentage)
    );
  }

  /**
   * IC 연속성 분석 - 경로상에서 연속된 IC 세그먼트 식별
   */
  private analyzeICContinuity(
    sortedICs: Array<InterchangeData & { routeSegmentIndex: number }>
  ): Array<{ startIC: string; endIC: string; distance: number }> {
    
    const segments: Array<{ startIC: string; endIC: string; distance: number }> = [];
    
    if (sortedICs.length < 2) return segments;

    let segmentStart = sortedICs[0];
    
    for (let i = 1; i < sortedICs.length; i++) {
      const current = sortedICs[i];
      const prev = sortedICs[i - 1];
      
      // 경로상 인덱스 차이가 큰 경우 새로운 세그먼트 시작
      const indexGap = current.routeSegmentIndex - prev.routeSegmentIndex;
      
      if (indexGap > 50) { // 경로 포인트 50개 이상 차이나면 분리
        // 이전 세그먼트 종료
        if (segmentStart !== prev) {
          segments.push({
            startIC: segmentStart.name,
            endIC: prev.name,
            distance: this.calculateDistance(
              { lat: segmentStart.lat, lng: segmentStart.lng },
              { lat: prev.lat, lng: prev.lng }
            )
          });
        }
        
        // 새로운 세그먼트 시작
        segmentStart = current;
      }
    }
    
    // 마지막 세그먼트 추가
    const lastIC = sortedICs[sortedICs.length - 1];
    if (segmentStart !== lastIC) {
      segments.push({
        startIC: segmentStart.name,
        endIC: lastIC.name,
        distance: this.calculateDistance(
          { lat: segmentStart.lat, lng: segmentStart.lng },
          { lat: lastIC.lat, lng: lastIC.lng }
        )
      });
    }

    return segments;
  }

  /**
   * 고속도로 커버리지 계산
   */
  private calculateHighwayCoverage(
    ics: Array<InterchangeData & { routeSegmentIndex: number }>,
    routeCoordinates: RouteCoordinate[]
  ): number {
    
    if (ics.length === 0) return 0;

    // IC가 커버하는 경로 구간 계산
    const minIndex = Math.min(...ics.map(ic => ic.routeSegmentIndex));
    const maxIndex = Math.max(...ics.map(ic => ic.routeSegmentIndex));
    
    const coveredPoints = maxIndex - minIndex + 1;
    const totalPoints = routeCoordinates.length;
    
    return (coveredPoints / totalPoints) * 100;
  }

  /**
   * 고속도로 신뢰도 계산
   */
  private calculateHighwayConfidence(
    ics: Array<InterchangeData & { distanceFromRoute: number }>,
    segments: Array<{ startIC: string; endIC: string; distance: number }>,
    coveragePercentage: number
  ): number {
    
    let confidence = 0.5; // 기본 신뢰도

    // IC 개수에 따른 보정
    if (ics.length >= 5) confidence += 0.3;
    else if (ics.length >= 3) confidence += 0.2;
    else if (ics.length >= 2) confidence += 0.1;

    // 평균 거리에 따른 보정
    const avgDistance = ics.reduce((sum, ic) => sum + ic.distanceFromRoute, 0) / ics.length;
    if (avgDistance < 1000) confidence += 0.2;      // 1km 이내
    else if (avgDistance < 1500) confidence += 0.1; // 1.5km 이내

    // 커버리지에 따른 보정
    if (coveragePercentage > 60) confidence += 0.2;
    else if (coveragePercentage > 40) confidence += 0.1;

    // 연속성에 따른 보정
    if (segments.length === 1 && ics.length >= 3) confidence += 0.1; // 단일 연속 세그먼트

    return Math.min(1.0, confidence);
  }

  /**
   * 경로 커버리지 계산
   */
  private calculateRouteCoverage(
    routeCoordinates: RouteCoordinate[],
    nearbyICs: Array<InterchangeData & { routeSegmentIndex: number }>
  ): number {
    
    if (nearbyICs.length === 0) return 0;

    const coveredIndices = new Set(nearbyICs.map(ic => ic.routeSegmentIndex));
    return (coveredIndices.size / routeCoordinates.length) * 100;
  }

  /**
   * 매칭 품질 평가
   */
  private evaluateMatchingQuality(
    validHighways: DetectedHighway[],
    routeCoverage: number
  ): 'high' | 'medium' | 'low' {
    
    if (validHighways.length === 0) return 'low';

    const bestHighway = validHighways[0];
    
    if (bestHighway.confidence > 0.8 && bestHighway.coveragePercentage > 60 && routeCoverage > 50) {
      return 'high';
    } else if (bestHighway.confidence > 0.6 && bestHighway.coveragePercentage > 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 점과 경로 사이의 최단거리 및 세그먼트 인덱스 계산
   */
  private calculateMinDistanceToRoute(
    point: RouteCoordinate,
    routeCoordinates: RouteCoordinate[]
  ): { distance: number; segmentIndex: number } {
    
    let minDistance = Infinity;
    let closestSegmentIndex = 0;

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];
      
      const distance = this.distanceFromPointToLineSegment(point, segmentStart, segmentEnd);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSegmentIndex = i;
      }
    }

    return {
      distance: minDistance,
      segmentIndex: closestSegmentIndex
    };
  }

  /**
   * 점과 선분 사이의 최단거리 계산
   */
  private distanceFromPointToLineSegment(
    point: RouteCoordinate,
    lineStart: RouteCoordinate,
    lineEnd: RouteCoordinate
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

    let param = dot / lenSq;

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
    point1: RouteCoordinate,
    point2: RouteCoordinate
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
   * 감지된 고속도로 및 실제 경로 데이터로 휴게소 필터링
   */
  async filterRestAreasByDetectedHighways(
    restAreas: any[],
    detectedHighways: DetectedHighway[],
    actualRouteHighways?: string[] // 카카오 경로 데이터의 실제 고속도로 목록
  ): Promise<any[]> {
    
    if (detectedHighways.length === 0 && (!actualRouteHighways || actualRouteHighways.length === 0)) {
      console.warn('감지된 고속도로가 없어 거리 기반 폴백');
      return restAreas; // 고속도로 매칭 실패시 거리 필터링에서 처리
    }

    const allowedRoutes = new Set<string>();
    
    // 1. IC 기반으로 감지된 고속도로 추가
    detectedHighways.forEach(highway => {
      allowedRoutes.add(highway.routeName);
      allowedRoutes.add(highway.routeNo);
      
      // 다양한 노선명 패턴 추가
      const baseName = highway.routeName.replace('선', '');
      allowedRoutes.add(baseName);
      allowedRoutes.add(`${baseName}선`);
      allowedRoutes.add(`${baseName}고속도로`);
    });

    // 2. 카카오 경로 데이터의 실제 고속도로 정보 추가 (하드코딩 제거)
    if (actualRouteHighways && actualRouteHighways.length > 0) {
      console.log('🛣️ 실제 경로 데이터의 고속도로:', actualRouteHighways.join(', '));
      
      actualRouteHighways.forEach(highway => {
        allowedRoutes.add(highway);
        
        // 패턴 매칭 개선
        const baseName = highway.replace(/(고속도로|고속화도로|선)$/, '');
        allowedRoutes.add(baseName);
        allowedRoutes.add(`${baseName}선`);
        allowedRoutes.add(`${baseName}고속도로`);
        
        // 특별 케이스 처리
        if (highway.includes('영동')) {
          allowedRoutes.add('영동');
          allowedRoutes.add('영동선');
          allowedRoutes.add('영동고속도로');
        }
        if (highway.includes('중앙')) {
          allowedRoutes.add('중앙');
          allowedRoutes.add('중앙선');  
          allowedRoutes.add('중앙고속도로');
        }
      });
    }

    console.log('🎯 허용된 고속도로 (실제 경로 기반):', Array.from(allowedRoutes).join(', '));

    const filteredRestAreas = restAreas.filter(restArea => {
      const routeName = restArea.routeName || restArea.route_name || '';
      const routeCode = restArea.routeCode || restArea.route_code || '';
      
      // 노선명 또는 노선 코드가 허용 목록에 있는지 확인
      const nameMatch = Array.from(allowedRoutes).some(allowed => 
        routeName.includes(allowed) || allowed.includes(routeName)
      );
      
      const codeMatch = allowedRoutes.has(routeCode);
      
      const isIncluded = nameMatch || codeMatch;
      
      // 디버깅: 대상 휴게소 추적
      if (restArea.name && (
        restArea.name.includes('용인') || restArea.name.includes('덕평') || 
        restArea.name.includes('여주') || restArea.name.includes('청도새마을') ||
        restArea.name.includes('청도')
      )) {
        console.log(`🎯 디버깅 대상: ${restArea.name} (도로: ${routeName}, 코드: ${routeCode}) - ${isIncluded ? '✅ 포함' : '❌ 제외'}`);
        if (!isIncluded) {
          console.log(`   허용된 고속도로와 매칭 실패: [${Array.from(allowedRoutes).join(', ')}]`);
        }
      }
      
      return isIncluded;
    });

    console.log(`✅ 실제 경로 기반 필터링: ${restAreas.length}개 → ${filteredRestAreas.length}개`);

    return filteredRestAreas;
  }
}

export const routeHighwayMatcher = new RouteHighwayMatcher();