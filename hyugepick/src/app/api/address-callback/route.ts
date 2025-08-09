import { NextRequest, NextResponse } from 'next/server';

// 주소기반산업지원서비스 POST 콜백 처리
export async function POST(request: NextRequest) {
  try {
    console.log('🔥 POST /api/address-callback 호출됨');
    
    // Form data 파싱
    const formData = await request.formData();
    
    const params = {
      roadFullAddr: formData.get('roadFullAddr') as string || '',
      roadAddrPart1: formData.get('roadAddrPart1') as string || '',
      addrDetail: formData.get('addrDetail') as string || '',
      roadAddrPart2: formData.get('roadAddrPart2') as string || '',
      engAddr: formData.get('engAddr') as string || '',
      jibunAddr: formData.get('jibunAddr') as string || '',
      zipNo: formData.get('zipNo') as string || '',
      admCd: formData.get('admCd') as string || '',
      rnMgtSn: formData.get('rnMgtSn') as string || '',
      bdMgtSn: formData.get('bdMgtSn') as string || ''
    };
    
    console.log('🔥 받은 주소 데이터:', params);
    
    // 주소 선택 완료 페이지 HTML 반환
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>주소 선택 완료</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .success-icon {
      font-size: 3rem;
      color: #10b981;
      margin-bottom: 1rem;
    }
    .title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #6b7280;
      margin-bottom: 1rem;
    }
    .address {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      font-size: 0.875rem;
      color: #374151;
      margin-bottom: 1rem;
      word-break: keep-all;
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #e5e7eb;
      border-radius: 50%;
      border-top: 2px solid #3b82f6;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✓</div>
    <div class="title">주소 선택이 완료되었습니다</div>
    <div class="subtitle">선택하신 주소를 입력 필드에 적용중입니다</div>
    ${params.roadFullAddr ? `<div class="address">${params.roadFullAddr}</div>` : ''}
    <div class="subtitle">
      <span class="loading"></span>
      잠시만 기다려주세요...
    </div>
  </div>

  <script>
    console.log('🔥 POST 콜백 페이지 로드됨');
    console.log('🔥 받은 주소 데이터:', ${JSON.stringify(params)});
    
    // 부모 창에 주소 전달
    try {
      if (window.opener && window.opener.jusoCallBack) {
        console.log('🔥 부모 창 콜백 호출:', '${params.roadFullAddr}');
        window.opener.jusoCallBack(
          '${params.roadFullAddr}',
          '${params.roadAddrPart1}', 
          '${params.addrDetail}',
          '${params.roadAddrPart2}',
          '${params.engAddr}',
          '${params.jibunAddr}',
          '${params.zipNo}',
          '${params.admCd}',
          '${params.rnMgtSn}',
          '${params.bdMgtSn}'
        );
        console.log('🔥 콜백 호출 성공');
        
        // 1초 후 팝업 닫기
        setTimeout(function() {
          console.log('🔥 팝업 창 닫기');
          window.close();
        }, 1000);
      } else {
        console.error('❌ 부모 창의 콜백 함수를 찾을 수 없습니다');
        console.log('🔥 window.opener:', window.opener);
        
        // 콜백 실패시에도 3초 후 팝업 닫기
        setTimeout(function() {
          window.close();
        }, 3000);
      }
    } catch (error) {
      console.error('🔥 콜백 처리 오류:', error);
      setTimeout(function() {
        window.close();
      }, 3000);
    }
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('🔥 POST 콜백 처리 오류:', error);
    
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>오류 발생</title>
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
    <h2>주소 처리 중 오류가 발생했습니다</h2>
    <p>잠시 후 창이 닫힙니다.</p>
  </div>
  <script>
    console.error('🔥 콜백 처리 오류:', '${error}');
    setTimeout(function() {
      window.close();
    }, 3000);
  </script>
</body>
</html>`;

    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

// GET 요청도 처리 (기존 페이지 라우트와의 호환성)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const params = {
    roadFullAddr: searchParams.get('roadFullAddr') || '',
    roadAddrPart1: searchParams.get('roadAddrPart1') || '',
    addrDetail: searchParams.get('addrDetail') || '',
    roadAddrPart2: searchParams.get('roadAddrPart2') || '',
    engAddr: searchParams.get('engAddr') || '',
    jibunAddr: searchParams.get('jibunAddr') || '',
    zipNo: searchParams.get('zipNo') || '',
    admCd: searchParams.get('admCd') || '',
    rnMgtSn: searchParams.get('rnMgtSn') || '',
    bdMgtSn: searchParams.get('bdMgtSn') || ''
  };
  
  console.log('🔥 GET /api/address-callback 호출됨:', params);
  
  // GET 요청인 경우 기존 페이지로 리다이렉트
  return NextResponse.redirect(new URL(`/address-callback?${searchParams.toString()}`, request.url));
}