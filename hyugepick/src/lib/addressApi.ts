// 주소기반산업지원서비스 API 연동

interface AddressSearchParams {
  keyword: string;
  countPerPage?: number;
  currentPage?: number;
}

export interface AddressResult {
  roadAddr: string;      // 도로명주소
  jibunAddr: string;     // 지번주소
  zipNo: string;         // 우편번호
  admCd: string;         // 행정구역코드
  rnMgtSn: string;       // 도로명코드
  bdMgtSn: string;       // 건물관리번호
  detBdNmList: string;   // 상세건물명
  bdNm: string;          // 건물명
  bdKdcd: string;        // 공동주택여부
  siNm: string;          // 시도명
  sggNm: string;         // 시군구명
  emdNm: string;         // 읍면동명
  liNm: string;          // 리명
  rn: string;            // 도로명
  udrtYn: string;        // 지하여부
  buldMnnm: string;      // 건물본번
  buldSlno: string;      // 건물부번
  mtYn: string;          // 산여부
  lnbrMnnm: string;      // 지번본번
  lnbrSlno: string;      // 지번부번
  emdNo: string;         // 읍면동일련번호
}

interface AddressApiResponse {
  results: {
    common: {
      totalCount: string;
      currentPage: string;
      countPerPage: string;
      errorCode: string;
      errorMessage: string;
    };
    juso: AddressResult[];
  };
}

export class AddressAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ADDRESS_API_URL || '';
    this.apiKey = process.env.NEXT_PUBLIC_ADDRESS_API_KEY || '';
  }

  async searchAddress({ 
    keyword, 
    countPerPage = 10, 
    currentPage = 1 
  }: AddressSearchParams): Promise<AddressResult[]> {
    if (!keyword || keyword.trim().length === 0) {
      return [];
    }

    try {
      // Next.js API 라우트를 통해 도로명주소 API 호출
      const params = new URLSearchParams({
        keyword: keyword.trim(),
        countPerPage: countPerPage.toString(),
        currentPage: currentPage.toString()
      });

      const response = await fetch(`/api/address/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: AddressApiResponse = await response.json();
      
      // API 응답이 성공이고 결과가 있는 경우
      if (data.results?.juso && data.results.juso.length > 0) {
        console.log(`주소 검색 성공: ${data.results.juso.length}개 결과 반환`);
        return data.results.juso;
      }
      
      // API는 성공했지만 결과가 없는 경우 빈 배열 반환 (실제 API 동작)
      console.log('주소 API: 검색 결과가 없습니다.');
      return [];
    } catch (error) {
      console.error('Address search error:', error);
      
      // 팝업 API 사용으로 검색 API는 사용하지 않음
      return [];
    }
  }


  // 주소 문자열 정리 함수
  formatAddress(address: AddressResult): string {
    return address.roadAddr || address.jibunAddr;
  }

  // 간단한 주소 표시용 (시군구 + 도로명/지번)
  getShortAddress(address: AddressResult): string {
    const siGunGu = `${address.siNm} ${address.sggNm}`.trim();
    const detail = address.rn || `${address.emdNm} ${address.lnbrMnnm}`;
    return `${siGunGu} ${detail}`.trim();
  }
}

// 기본 인스턴스 export
export const addressAPI = new AddressAPI();