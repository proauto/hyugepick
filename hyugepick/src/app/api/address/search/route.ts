import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const countPerPage = searchParams.get('countPerPage') || '10';
    const currentPage = searchParams.get('currentPage') || '1';

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json({ results: { juso: [] } });
    }

    const apiKey = process.env.NEXT_PUBLIC_ADDRESS_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_ADDRESS_API_URL;

    if (!apiKey || !apiUrl) {
      console.error('도로명주소 API 설정이 누락되었습니다.');
      return NextResponse.json(
        { 
          error: '도로명주소 API 설정이 누락되었습니다. API 키를 확인하세요.',
          code: 'API_CONFIG_MISSING'
        },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      confmKey: apiKey,
      keyword: keyword.trim(),
      resultType: 'json',
      countPerPage: countPerPage,
      currentPage: currentPage,
      hstryYn: 'N',
      firstSort: 'road',
      addInfoYn: 'Y'
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // API 응답 구조 검증
    if (!data.results || !data.results.common) {
      return NextResponse.json(
        { error: '잘못된 API 응답 형식입니다.' },
        { status: 502 }
      );
    }

    const { errorCode, errorMessage, totalCount } = data.results.common;

    // 에러 코드별 처리
    if (errorCode !== '0') {
      console.error('도로명주소 API 에러:', errorCode, errorMessage);
      
      // 특정 에러 코드에 대한 사용자 친화적 메시지
      let userMessage = errorMessage;
      switch (errorCode) {
        case 'E0001':
          userMessage = 'API 키가 승인되지 않았습니다.';
          break;
        case 'E0006':
          userMessage = '주소를 더 상세히 입력해 주세요.';
          break;
        case 'E0007':
          userMessage = '검색 결과가 너무 많습니다. 더 구체적으로 입력해 주세요.';
          break;
        default:
          userMessage = errorMessage || 'API 오류가 발생했습니다.';
      }
      
      return NextResponse.json(
        { 
          error: userMessage,
          code: errorCode 
        },
        { status: 400 }
      );
    }

    // 성공 응답에서도 결과 수 로깅
    console.log(`주소 검색 성공: ${totalCount}개 결과 (키워드: ${keyword})`);
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Address search API error:', error);
    return NextResponse.json(
      { error: '주소 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}