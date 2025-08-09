/**
 * 민자고속도로 휴게소 현황 분석 스크립트
 * - 현재 DB에 저장된 민자고속도로 휴게소 목록 확인
 * - 좌표 정확도 분석
 * - 구글지도 크롤링 대상 목록 생성
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://dwkwpadrpbesphtextap.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3a3dwYWRycGJlc3BodGV4dGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDM2MTEsImV4cCI6MjA3MDExOTYxMX0.UvPyWXYK5F7NygMxiRJFP3eLlfu5A1Wfr1vSHDDRiGo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzePrivateHighwayRestAreas() {
  console.log('🔍 민자고속도로 휴게소 분석 시작');
  console.log('=' .repeat(80));
  
  try {
    // 1. 전체 휴게소 데이터 조회
    const { data: allRestAreas, error } = await supabase
      .from('rest_areas')
      .select('*')
      .order('route_name');

    if (error) {
      console.error('❌ DB 조회 실패:', error);
      return;
    }

    console.log(`📊 전체 휴게소 수: ${allRestAreas?.length || 0}개`);
    
    // 2. 민자고속도로 휴게소 필터링 (일반적인 민자고속도로 패턴)
    const privateHighwayPatterns = [
      '서해안', '중부내륙', '서울외곽순환', '인천국제공항', '평택시흥', 
      '용인서울', '수도권제1순환', '수도권제2순환', '대구부산', 
      '서울춘천', '부산외곽순환', '인천대교', '영종대교'
    ];

    const privateRestAreas = allRestAreas?.filter(restArea => {
      const routeName = restArea.route_name || '';
      return privateHighwayPatterns.some(pattern => 
        routeName.includes(pattern)
      );
    }) || [];

    console.log(`\n🛣️ 민자고속도로 휴게소 수: ${privateRestAreas.length}개`);
    
    // 3. 민자고속도로별 분류
    const groupedByRoute = privateRestAreas.reduce((acc, restArea) => {
      const routeName = restArea.route_name || '미분류';
      if (!acc[routeName]) {
        acc[routeName] = [];
      }
      acc[routeName].push(restArea);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('\n📋 민자고속도로별 휴게소 분류:');
    Object.entries(groupedByRoute).forEach(([routeName, areas]) => {
      console.log(`\n🛣️ ${routeName}: ${areas.length}개`);
      areas.forEach((area, index) => {
        const coords = area.coordinates || {};
        const lat = coords.lat || area.lat || 0;
        const lng = coords.lng || area.lng || 0;
        
        // 좌표 유효성 검사
        const isValidCoord = (
          lat >= 33 && lat <= 39 &&
          lng >= 124 && lng <= 132
        );
        
        console.log(`  ${index + 1}. ${area.name}`);
        console.log(`     좌표: ${lat.toFixed(6)}, ${lng.toFixed(6)} ${isValidCoord ? '✅' : '❌'}`);
        console.log(`     주소: ${area.address || '없음'}`);
        console.log(`     방향: ${area.direction || '없음'}`);
      });
    });

    // 4. 좌표 정확도 분석
    let validCoords = 0;
    let invalidCoords = 0;
    const problematicAreas = [];

    privateRestAreas.forEach(area => {
      const coords = area.coordinates || {};
      const lat = coords.lat || area.lat || 0;
      const lng = coords.lng || area.lng || 0;
      
      const isValid = (
        lat >= 33 && lat <= 39 &&
        lng >= 124 && lng <= 132 &&
        lat !== 0 && lng !== 0
      );
      
      if (isValid) {
        validCoords++;
      } else {
        invalidCoords++;
        problematicAreas.push({
          name: area.name,
          route: area.route_name,
          lat,
          lng,
          id: area.id
        });
      }
    });

    console.log('\n📈 좌표 정확도 분석:');
    console.log(`✅ 유효한 좌표: ${validCoords}개`);
    console.log(`❌ 문제있는 좌표: ${invalidCoords}개`);
    console.log(`📊 정확도: ${((validCoords / privateRestAreas.length) * 100).toFixed(1)}%`);

    if (problematicAreas.length > 0) {
      console.log('\n⚠️ 좌표 수정이 필요한 휴게소:');
      problematicAreas.forEach((area, index) => {
        console.log(`${index + 1}. ${area.name} (${area.route})`);
        console.log(`   ID: ${area.id}, 좌표: ${area.lat}, ${area.lng}`);
      });
    }

    // 5. 구글지도 크롤링 대상 목록 생성 (방향 정보 포함)
    const targetList = privateRestAreas.map(area => {
      const baseName = area.name;
      const direction = area.direction;
      
      // direction이 있으면 이름에 포함해서 검색
      let searchQuery = `${baseName} 휴게소`;
      if (direction) {
        // direction에서 '방향' 제거하고 추가 (예: "대구방향" -> "대구")
        const cleanDirection = direction.replace('방향', '');
        searchQuery = `${baseName} ${cleanDirection}방향 휴게소`;
      }
      
      return {
        id: area.id,
        name: area.name,
        route: area.route_name,
        direction: direction || '',
        currentLat: area.coordinates?.lat || area.lat || 0,
        currentLng: area.coordinates?.lng || area.lng || 0,
        searchQuery: searchQuery
      };
    });

    console.log('\n🎯 구글지도 크롤링 대상 목록:');
    console.log('=' .repeat(80));
    targetList.forEach((target, index) => {
      console.log(`${index + 1}. 검색어: "${target.searchQuery}"`);
      console.log(`   ID: ${target.id}, 현재좌표: ${target.currentLat.toFixed(6)}, ${target.currentLng.toFixed(6)}`);
    });

    // 6. JSON 파일로 저장
    const outputPath = './scripts/private-highway-crawling-targets.json';
    
    const crawlingData = {
      totalCount: privateRestAreas.length,
      validCoords,
      invalidCoords,
      accuracy: ((validCoords / privateRestAreas.length) * 100).toFixed(1),
      targets: targetList,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(outputPath, JSON.stringify(crawlingData, null, 2), 'utf8');
    console.log(`\n💾 크롤링 대상 데이터 저장: ${outputPath}`);
    
    console.log('\n✅ 분석 완료');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
analyzePrivateHighwayRestAreas().then(() => {
  console.log('🏁 민자고속도로 휴게소 분석 완료');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});