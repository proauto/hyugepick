#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function debugICResponse() {
  const API_URL = 'https://data.ex.co.kr/openapi/locationinfo/locationinfoIc';
  const apiKey = process.env.NEXT_PUBLIC_HIGHWAY_API_KEY || '';
  
  console.log('🔍 IC API 응답 구조 디버깅');
  console.log('═'.repeat(50));
  console.log(`API 키: ${apiKey ? '설정됨' : '없음'}`);

  if (!apiKey) {
    console.log('❌ API 키가 설정되지 않았습니다.');
    return;
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      type: 'json',
      numOfRows: '5',  // 5개만 가져와서 구조 확인
      pageNo: '1'
    });
    
    const apiUrl = `${API_URL}?${params.toString()}`;
    console.log(`🌐 API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('\n📄 원시 응답 (처음 500자):');
    console.log(responseText.substring(0, 500));
    
    const result = JSON.parse(responseText);
    
    console.log('\n📊 응답 메타데이터:');
    console.log(`  - code: ${result.code}`);
    console.log(`  - count: ${result.count}`);
    console.log(`  - message: ${result.message}`);
    console.log(`  - list 길이: ${result.list?.length || 0}`);

    if (result.list && result.list.length > 0) {
      console.log('\n🔍 첫 번째 IC 데이터:');
      const firstIC = result.list[0];
      console.log('필드 목록:', Object.keys(firstIC));
      console.log('전체 데이터:');
      console.log(JSON.stringify(firstIC, null, 2));

      console.log('\n📋 중요 필드 확인:');
      console.log(`  - unitCode: "${firstIC.unitCode}"`);
      console.log(`  - unitName: "${firstIC.unitName}"`);
      console.log(`  - routeCode: "${firstIC.routeCode}"`);
      console.log(`  - routeName: "${firstIC.routeName}"`);
      console.log(`  - xValue: "${firstIC.xValue}"`);
      console.log(`  - yValue: "${firstIC.yValue}"`);
      console.log(`  - startValue: "${firstIC.startValue}"`);
    } else {
      console.log('❌ list 데이터가 비어있습니다.');
    }

  } catch (error) {
    console.error('❌ 디버깅 실패:', error);
  }
}

debugICResponse();