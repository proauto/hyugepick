import { NextRequest, NextResponse } from 'next/server';

// 휴게소별 매장 월별 판매 상위 5 API 엔드포인트 (쿼리 파라미터 방식)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restAreaCode = searchParams.get('restAreaCode');

  if (!restAreaCode) {
    return NextResponse.json(
      { error: '휴게소 코드가 필요합니다.' },
      { status: 400 }
    );
  }

  console.log(`휴게소 ${restAreaCode} 매장정보 - 목 데이터 사용`);
  
  return NextResponse.json({
    list: [
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로",
        stdRestCd: restAreaCode,
        stdRestNm: "휴게소",
        foodNm: "불고기버거",
        cmpnNm: "맘스터치",
        foodCost: "6500",
        rn: "1"
      },
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로", 
        stdRestCd: restAreaCode,
        stdRestNm: "휴게소",
        foodNm: "김치찌개",
        cmpnNm: "백반집",
        foodCost: "8000",
        rn: "2"
      },
      {
        routeCode: restAreaCode,
        routeName: "경부고속도로",
        stdRestCd: restAreaCode,
        stdRestNm: "휴게소", 
        foodNm: "떡갈비정식",
        cmpnNm: "한식당",
        foodCost: "12000",
        rn: "3"
      }
    ]
  });
}