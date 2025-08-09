/**
 * 휴게소 운영상태 다층 검증 시스템
 * 웹사이트, 전화, 지도 POI, 리뷰 등을 통한 종합적 검증
 */

import { RestArea } from '@/types/map';

// 검증 결과 타입
export interface VerificationResult {
  restAreaId: string;
  restAreaName: string;
  overallStatus: 'active' | 'inactive' | 'uncertain' | 'new';
  confidence: number; // 0-1 점수
  lastVerified: Date;
  verificationMethods: VerificationMethodResult[];
  changes: ChangeDetection[];
  recommendations: string[];
}

export interface VerificationMethodResult {
  method: VerificationMethod;
  status: 'active' | 'inactive' | 'error' | 'no_data';
  confidence: number;
  data?: any;
  executionTime: number;
  error?: string;
  lastChecked: Date;
}

export interface ChangeDetection {
  type: 'name' | 'location' | 'facilities' | 'hours' | 'status' | 'new' | 'closed';
  oldValue?: any;
  newValue?: any;
  detectedAt: Date;
  source: string;
  confidence: number;
}

export type VerificationMethod = 
  | 'website_check'
  | 'phone_verification' 
  | 'kakao_poi'
  | 'naver_poi'
  | 'google_poi'
  | 'review_analysis'
  | 'social_media'
  | 'traffic_data'
  | 'satellite_imagery';

export class RestAreaVerificationSystem {
  
  // 휴게소 종합 검증
  async verifyRestArea(restArea: RestArea): Promise<VerificationResult> {
    console.log(`🔍 ${restArea.name} 검증 시작`);
    
    const verificationMethods: VerificationMethodResult[] = [];
    const changes: ChangeDetection[] = [];
    const recommendations: string[] = [];
    
    // 1. 웹사이트 확인
    try {
      const websiteResult = await this.verifyViaWebsite(restArea);
      verificationMethods.push(websiteResult);
    } catch (error) {
      console.warn(`웹사이트 검증 실패: ${error}`);
    }
    
    // 2. 카카오 지도 POI 확인
    try {
      const kakaoResult = await this.verifyViaKakaoPOI(restArea);
      verificationMethods.push(kakaoResult);
    } catch (error) {
      console.warn(`카카오 POI 검증 실패: ${error}`);
    }
    
    // 3. 네이버 지도 POI 확인
    try {
      const naverResult = await this.verifyViaNaverPOI(restArea);
      verificationMethods.push(naverResult);
    } catch (error) {
      console.warn(`네이버 POI 검증 실패: ${error}`);
    }
    
    // 4. 리뷰 분석
    try {
      const reviewResult = await this.verifyViaReviews(restArea);
      verificationMethods.push(reviewResult);
    } catch (error) {
      console.warn(`리뷰 분석 실패: ${error}`);
    }
    
    // 5. 트래픽 데이터 분석
    try {
      const trafficResult = await this.verifyViaTrafficData(restArea);
      verificationMethods.push(trafficResult);
    } catch (error) {
      console.warn(`트래픽 데이터 분석 실패: ${error}`);
    }
    
    // 6. 종합 판정
    const overallStatus = this.calculateOverallStatus(verificationMethods);
    const confidence = this.calculateConfidence(verificationMethods);
    
    // 7. 변경사항 감지
    const detectedChanges = await this.detectChanges(restArea, verificationMethods);
    changes.push(...detectedChanges);
    
    // 8. 권장사항 생성
    const generatedRecommendations = this.generateRecommendations(verificationMethods, changes);
    recommendations.push(...generatedRecommendations);
    
    return {
      restAreaId: restArea.id,
      restAreaName: restArea.name,
      overallStatus,
      confidence,
      lastVerified: new Date(),
      verificationMethods,
      changes,
      recommendations
    };
  }
  
  // 웹사이트를 통한 검증
  private async verifyViaWebsite(restArea: RestArea): Promise<VerificationMethodResult> {
    const startTime = Date.now();
    
    try {
      // 운영사 웹사이트에서 휴게소 정보 확인
      const websiteData = await this.checkOfficialWebsite(restArea);
      
      return {
        method: 'website_check',
        status: websiteData.found ? 'active' : 'no_data',
        confidence: websiteData.found ? 0.9 : 0.1,
        data: websiteData,
        executionTime: Date.now() - startTime,
        lastChecked: new Date()
      };
      
    } catch (error) {
      return {
        method: 'website_check',
        status: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '웹사이트 확인 실패',
        lastChecked: new Date()
      };
    }
  }
  
  // 카카오 지도 POI 검증
  private async verifyViaKakaoPOI(restArea: RestArea): Promise<VerificationMethodResult> {
    const startTime = Date.now();
    
    try {
      const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
      if (!kakaoApiKey) {
        throw new Error('카카오 API 키가 설정되지 않았습니다');
      }
      
      // 카카오 지도에서 POI 검색
      const searchQuery = `${restArea.name} ${restArea.routeName || ''}`;
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchQuery)}&category_group_code=OL7`,
        {
          headers: {
            'Authorization': `KakaoAK ${kakaoApiKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`카카오 API 호출 실패: ${response.status}`);
      }
      
      const data = await response.json();
      const found = data.documents && data.documents.length > 0;
      
      let confidence = 0.5;
      if (found) {
        // 위치 유사성 체크
        const nearbyMatches = data.documents.filter((doc: any) => {
          const distance = this.calculateDistance(
            { lat: parseFloat(doc.y), lng: parseFloat(doc.x) },
            restArea.coordinates
          );
          return distance < 5; // 5km 이내
        });
        
        confidence = nearbyMatches.length > 0 ? 0.8 : 0.3;
      }
      
      return {
        method: 'kakao_poi',
        status: found ? 'active' : 'no_data',
        confidence,
        data: { documents: data.documents, matchCount: data.documents?.length || 0 },
        executionTime: Date.now() - startTime,
        lastChecked: new Date()
      };
      
    } catch (error) {
      return {
        method: 'kakao_poi',
        status: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '카카오 POI 검증 실패',
        lastChecked: new Date()
      };
    }
  }
  
  // 네이버 지도 POI 검증 (시뮬레이션)
  private async verifyViaNaverPOI(restArea: RestArea): Promise<VerificationMethodResult> {
    const startTime = Date.now();
    
    // 네이버 지도 API는 별도 신청이 필요하므로 시뮬레이션
    await this.delay(1000);
    
    return {
      method: 'naver_poi',
      status: 'no_data',
      confidence: 0.5,
      data: { message: '네이버 지도 API 연동 필요' },
      executionTime: Date.now() - startTime,
      lastChecked: new Date()
    };
  }
  
  // 리뷰 분석을 통한 검증
  private async verifyViaReviews(restArea: RestArea): Promise<VerificationMethodResult> {
    const startTime = Date.now();
    
    try {
      // 리뷰 데이터 수집 및 분석 (시뮬레이션)
      const reviewAnalysis = await this.analyzeReviews(restArea);
      
      return {
        method: 'review_analysis',
        status: reviewAnalysis.activeIndicators > reviewAnalysis.inactiveIndicators ? 'active' : 'inactive',
        confidence: Math.min(reviewAnalysis.confidence, 0.7), // 리뷰는 최대 70% 신뢰도
        data: reviewAnalysis,
        executionTime: Date.now() - startTime,
        lastChecked: new Date()
      };
      
    } catch (error) {
      return {
        method: 'review_analysis',
        status: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '리뷰 분석 실패',
        lastChecked: new Date()
      };
    }
  }
  
  // 트래픽 데이터를 통한 검증
  private async verifyViaTrafficData(restArea: RestArea): Promise<VerificationMethodResult> {
    const startTime = Date.now();
    
    try {
      // 교통량 데이터 분석 (시뮬레이션)
      const trafficData = await this.analyzeTrafficData(restArea);
      
      return {
        method: 'traffic_data',
        status: trafficData.hasTraffic ? 'active' : 'inactive',
        confidence: 0.6,
        data: trafficData,
        executionTime: Date.now() - startTime,
        lastChecked: new Date()
      };
      
    } catch (error) {
      return {
        method: 'traffic_data',
        status: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '트래픽 데이터 분석 실패',
        lastChecked: new Date()
      };
    }
  }
  
  // 운영사 공식 웹사이트 확인
  private async checkOfficialWebsite(restArea: RestArea): Promise<{ found: boolean; data?: any }> {
    // 실제 구현에서는 각 운영사 웹사이트를 크롤링
    await this.delay(1500);
    
    // 시뮬레이션: 90% 확률로 찾음
    const found = Math.random() > 0.1;
    
    return {
      found,
      data: found ? {
        lastUpdate: new Date().toISOString(),
        status: '정상운영',
        facilities: ['편의점', '화장실', '주유소'],
        hours: '24시간'
      } : null
    };
  }
  
  // 리뷰 분석
  private async analyzeReviews(restArea: RestArea): Promise<{
    activeIndicators: number;
    inactiveIndicators: number;
    confidence: number;
    recentReviews: number;
  }> {
    await this.delay(2000);
    
    // 시뮬레이션 데이터
    const recentReviews = Math.floor(Math.random() * 50);
    const activeIndicators = Math.floor(Math.random() * 10);
    const inactiveIndicators = Math.floor(Math.random() * 3);
    
    return {
      activeIndicators,
      inactiveIndicators,
      confidence: Math.min((recentReviews + activeIndicators) / 20, 1),
      recentReviews
    };
  }
  
  // 트래픽 데이터 분석
  private async analyzeTrafficData(restArea: RestArea): Promise<{
    hasTraffic: boolean;
    averageDaily: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }> {
    await this.delay(1000);
    
    // 시뮬레이션
    return {
      hasTraffic: Math.random() > 0.2,
      averageDaily: Math.floor(Math.random() * 10000),
      trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)] as any
    };
  }
  
  // 종합 상태 계산
  private calculateOverallStatus(methods: VerificationMethodResult[]): 'active' | 'inactive' | 'uncertain' | 'new' {
    const activeCount = methods.filter(m => m.status === 'active').length;
    const inactiveCount = methods.filter(m => m.status === 'inactive').length;
    const totalChecked = methods.filter(m => m.status !== 'error' && m.status !== 'no_data').length;
    
    if (totalChecked === 0) return 'uncertain';
    
    const activeRatio = activeCount / totalChecked;
    
    if (activeRatio >= 0.7) return 'active';
    if (activeRatio <= 0.3) return 'inactive';
    return 'uncertain';
  }
  
  // 신뢰도 계산
  private calculateConfidence(methods: VerificationMethodResult[]): number {
    const validMethods = methods.filter(m => m.status !== 'error');
    
    if (validMethods.length === 0) return 0;
    
    const weightedSum = validMethods.reduce((sum, method) => {
      const weight = this.getMethodWeight(method.method);
      return sum + (method.confidence * weight);
    }, 0);
    
    const totalWeight = validMethods.reduce((sum, method) => {
      return sum + this.getMethodWeight(method.method);
    }, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  // 검증 방법별 가중치
  private getMethodWeight(method: VerificationMethod): number {
    const weights: Record<VerificationMethod, number> = {
      'website_check': 1.0,
      'phone_verification': 0.9,
      'kakao_poi': 0.8,
      'naver_poi': 0.8,
      'google_poi': 0.8,
      'review_analysis': 0.6,
      'social_media': 0.5,
      'traffic_data': 0.7,
      'satellite_imagery': 0.9
    };
    
    return weights[method] || 0.5;
  }
  
  // 변경사항 감지
  private async detectChanges(
    restArea: RestArea, 
    verificationResults: VerificationMethodResult[]
  ): Promise<ChangeDetection[]> {
    const changes: ChangeDetection[] = [];
    
    // 실제 구현에서는 이전 검증 결과와 비교
    // 현재는 시뮬레이션
    
    if (Math.random() < 0.1) { // 10% 확률로 변경사항 감지
      changes.push({
        type: 'facilities',
        oldValue: ['편의점', '화장실'],
        newValue: ['편의점', '화장실', '주유소'],
        detectedAt: new Date(),
        source: 'website_check',
        confidence: 0.8
      });
    }
    
    return changes;
  }
  
  // 권장사항 생성
  private generateRecommendations(
    methods: VerificationMethodResult[], 
    changes: ChangeDetection[]
  ): string[] {
    const recommendations: string[] = [];
    
    const errorMethods = methods.filter(m => m.status === 'error');
    if (errorMethods.length > 0) {
      recommendations.push(`${errorMethods.length}개 검증 방법에서 오류 발생. 재시도 필요.`);
    }
    
    const lowConfidenceMethods = methods.filter(m => m.confidence < 0.5);
    if (lowConfidenceMethods.length > methods.length / 2) {
      recommendations.push('검증 신뢰도가 낮습니다. 수동 확인 권장.');
    }
    
    if (changes.length > 0) {
      recommendations.push(`${changes.length}개 변경사항 감지. 데이터 업데이트 필요.`);
    }
    
    return recommendations;
  }
  
  // 거리 계산
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // 지연 함수
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const verificationSystem = new RestAreaVerificationSystem();