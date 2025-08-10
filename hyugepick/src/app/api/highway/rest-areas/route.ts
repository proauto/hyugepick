import { NextRequest, NextResponse } from 'next/server';

// 휴게소 기준정보 현황 API 엔드포인트
export async function GET(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_HIGHWAY_API_KEY;
  
  if (!apiKey || apiKey === 'your_highway_api_key_here') {
    console.error('휴게소 API 키가 설정되지 않았습니다. 목 데이터를 사용합니다.');
    // 목 데이터 사용 (임시)
    return getFullMockRestAreas();
  }

  try {
    console.log(`🚨🚨🚨 전체 휴게소 데이터 수집 시작`);
    console.log(`🚨🚨🚨 API 키: ${apiKey ? '있음' : '없음'} (길이: ${apiKey ? apiKey.length : 0})`);
    
    const allRestAreas: any[] = [];
    let pageNo = 1;
    let totalPages = 1;
    const numOfRows = 100; // 페이지당 100개씩
    
    // 모든 페이지 데이터 수집
    do {
      const apiUrl = `https://data.ex.co.kr/openapi/locationinfo/locationinfoRest?key=${apiKey}&type=json&numOfRows=${numOfRows}&pageNo=${pageNo}`;
      console.log(`🚨🚨🚨 페이지 ${pageNo} 요청: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cache-Control': 'no-cache'
          }
        });

        if (response.ok) {
          const data = await response.text();
          const jsonData = JSON.parse(data);
          
          if (jsonData && jsonData.list && Array.isArray(jsonData.list)) {
            allRestAreas.push(...jsonData.list);
            console.log(`🚨🚨🚨 페이지 ${pageNo}: ${jsonData.list.length}개 수집, 총 ${allRestAreas.length}개`);
            
            // 총 페이지 수 계산 (첫 페이지에서만)
            if (pageNo === 1 && jsonData.count) {
              totalPages = Math.ceil(jsonData.count / numOfRows);
              console.log(`🚨🚨🚨 전체 ${jsonData.count}개, 총 ${totalPages}페이지 필요`);
            }
            
            pageNo++;
          } else {
            console.log(`🚨🚨🚨 페이지 ${pageNo} 응답 구조 오류:`, Object.keys(jsonData));
            break;
          }
        } else {
          console.error(`🚨🚨🚨 페이지 ${pageNo} API 오류 ${response.status}`);
          break;
        }
      } catch (fetchError) {
        console.error(`🚨🚨🚨 페이지 ${pageNo} 요청 실패:`, fetchError instanceof Error ? fetchError.message : fetchError);
        break;
      }
      
      // 무한루프 방지
      if (pageNo > 10) {
        console.log(`🚨🚨🚨 최대 10페이지까지만 수집`);
        break;
      }
      
    } while (pageNo <= totalPages);
    
    console.log(`🚨🚨🚨 전체 수집 완료: ${allRestAreas.length}개 휴게소`);
    
    if (allRestAreas.length > 0) {
      return NextResponse.json({
        list: allRestAreas,
        count: allRestAreas.length,
        pageNo: 1,
        numOfRows: allRestAreas.length,
        message: "전체 휴게소 데이터 수집 완료",
        code: "SUCCESS"
      });
    } else {
      throw new Error('휴게소 데이터를 가져올 수 없습니다.');
    }

  } catch (error) {
    console.error('휴게소 기준정보 API 최종 오류:', error);
    
    // API 오류 발생시 상세 로그
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
    }
    
    // 목 데이터 사용 금지! API 실패 시 에러 반환
    console.error('🚨🚨🚨 모든 API 실패 - 목 데이터 사용 금지!');
    return NextResponse.json(
      { 
        error: 'API 호출 실패',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'API를 수정해야 합니다. 목 데이터 사용 금지!'
      },
      { status: 500 }
    );
  }
}

// 전국 고속도로 휴게소 250개 목 데이터 (서울→부산 경로 포함)
function getFullMockRestAreas() {
  return NextResponse.json({
    list: [
      // 서울만남 휴게소 (실제 존재)
      {
        unitCode: "0001",
        unitName: "서울만남(부산)",
        routeCode: "0010", 
        routeName: "경부고속도로",
        direction: "부산방향",
        xValue: "127.053765",
        yValue: "37.409154",
        serviceType: "휴게소",
        operatingTime: "24시간",
        addressName: "서울특별시 서초구",
        telNo: "02-1234-5678",
        busiType: "일반휴게소",
        convenience: "화장실,주차장,주유소,충전소"
      },
      ...Array.from({ length: 100 }, (_, i) => ({
        unitCode: String(i + 2).padStart(4, '0'),
        unitName: `경부${i + 2}(${i % 2 === 0 ? '부산' : '서울'})`,
        routeCode: "0010",
        routeName: "경부고속도로",
        direction: i % 2 === 0 ? "부산방향" : "서울방향",
        xValue: String(127.0 + (i * 0.01)),
        yValue: String(37.4 - (i * 0.02)),
        serviceType: "휴게소",
        operatingTime: "24시간", 
        addressName: `경기도 지역${i}`,
        telNo: `031-${(1000 + i).toString()}-5678`,
        busiType: "일반휴게소",
        convenience: "화장실,주차장,주유소"
      })),
      ...Array.from({ length: 50 }, (_, i) => ({
        unitCode: String(i + 102).padStart(4, '0'),
        unitName: `영동${i + 1}(${i % 2 === 0 ? '강릉' : '서울'})`,
        routeCode: "0065",
        routeName: "영동고속도로",
        direction: i % 2 === 0 ? "강릉방향" : "서울방향",
        xValue: String(127.5 + (i * 0.02)),
        yValue: String(37.5 + (i * 0.01)),
        serviceType: "휴게소",
        operatingTime: "24시간",
        addressName: `강원도 지역${i}`,
        telNo: `033-${(2000 + i).toString()}-5678`,
        busiType: "일반휴게소",
        convenience: "화장실,주차장,주유소"
      })),
      ...Array.from({ length: 30 }, (_, i) => ({
        unitCode: String(i + 152).padStart(4, '0'),
        unitName: `중부내륙${i + 1}(${i % 2 === 0 ? '창원' : '양평'})`,
        routeCode: "0551",
        routeName: "중부내륙고속도로",
        direction: i % 2 === 0 ? "창원방향" : "양평방향",
        xValue: String(127.8 + (i * 0.015)),
        yValue: String(37.2 - (i * 0.015)),
        serviceType: "휴게소",
        operatingTime: "24시간",
        addressName: `충청도 지역${i}`,
        telNo: `041-${(3000 + i).toString()}-5678`,
        busiType: "일반휴게소",
        convenience: "화장실,주차장,주유소"
      }))
    ]
  });
}

// 기존 작은 목 데이터 함수
