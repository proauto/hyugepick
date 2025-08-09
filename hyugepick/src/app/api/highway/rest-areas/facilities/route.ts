import { NextRequest, NextResponse } from 'next/server';

// 휴게소 편의시설 정보 API 엔드포인트 (쿼리 파라미터 방식)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restAreaCode = searchParams.get('restAreaCode');

  if (!restAreaCode) {
    return NextResponse.json(
      { error: '휴게소 코드가 필요합니다.' },
      { status: 400 }
    );
  }

  console.log(`휴게소 ${restAreaCode} 편의시설 정보 - 목 데이터 사용`);
  
  return NextResponse.json({
    list: [
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로",
        stdRestCd: restAreaCode,
        stdRestNm: "휴게소",
        psName: "화장실",
        psCode: "01"
      },
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로",
        stdRestCd: restAreaCode, 
        stdRestNm: "휴게소",
        psName: "주차장",
        psCode: "02"
      },
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로",
        stdRestCd: restAreaCode,
        stdRestNm: "휴게소", 
        psName: "주유소",
        psCode: "03"
      },
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로",
        stdRestCd: restAreaCode,
        stdRestNm: "휴게소",
        psName: "전기충전소",
        psCode: "04"
      },
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로",
        stdRestCd: restAreaCode,
        stdRestNm: "휴게소",
        psName: "편의점",
        psCode: "05"
      }
    ]
  });
}