#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkICData() {
  console.log('🔍 IC 테이블 데이터 확인');
  console.log('═'.repeat(50));

  // 1. IC 테이블 존재 및 데이터 확인
  const { data: icCount, error: countError } = await supabase
    .from('interchanges')
    .select('count', { count: 'exact' });

  if (countError) {
    console.log('❌ IC 테이블 접근 실패:', countError.message);
    return;
  }

  console.log(`📊 IC 테이블 총 데이터: ${icCount?.length || 0}개`);

  // 2. 샘플 IC 데이터 확인
  const { data: sampleICs } = await supabase
    .from('interchanges')
    .select('*')
    .limit(5);

  if (sampleICs && sampleICs.length > 0) {
    console.log('\n📋 샘플 IC 데이터:');
    sampleICs.forEach((ic, i) => {
      console.log(`  ${i+1}. ${ic.name} (${ic.route_name})`);
      console.log(`     방향: ${ic.direction}, Weight: ${ic.weight}`);
      console.log(`     좌표: ${ic.lat}, ${ic.lng}`);
    });
  } else {
    console.log('❌ IC 데이터가 없습니다!');
  }

  // 3. 경부선 IC 확인 (서울-부산 경로용)
  console.log('\n🛣️ 경부선 IC 데이터 확인:');
  console.log('─'.repeat(30));
  
  const routeVariants = ['경부선', '경부고속도로', '경부고속국도', '경부'];
  
  for (const routeName of routeVariants) {
    const { data: gyeongbuICs } = await supabase
      .from('interchanges')
      .select('name, route_name, weight, direction')
      .ilike('route_name', `%${routeName}%`)
      .order('weight')
      .limit(5);

    console.log(`\n"${routeName}" 검색 결과: ${gyeongbuICs?.length || 0}개`);
    gyeongbuICs?.forEach((ic, i) => {
      console.log(`  ${i+1}. ${ic.name} (${ic.route_name})`);
    });
  }

  // 4. 실제 경로 좌표로 IC 검색 테스트
  console.log('\n🧪 실제 경로 근처 IC 검색 테스트:');
  console.log('─'.repeat(40));
  
  // 서울역 근처 (37.5665, 126.9780)
  const seoulPoint = { lat: 37.5665, lng: 126.9780 };
  const radius = 0.01; // 약 1km
  
  const { data: nearSeoulICs } = await supabase
    .from('interchanges')
    .select('*')
    .gte('lat', seoulPoint.lat - radius)
    .lte('lat', seoulPoint.lat + radius)
    .gte('lng', seoulPoint.lng - radius)
    .lte('lng', seoulPoint.lng + radius);

  console.log(`서울역 근처 IC: ${nearSeoulICs?.length || 0}개`);
  nearSeoulICs?.forEach((ic, i) => {
    console.log(`  ${i+1}. ${ic.name} (${ic.route_name})`);
  });

  // 5. IC 동기화 상태 확인
  console.log('\n📅 IC 동기화 상태 확인:');
  const { data: recentICs } = await supabase
    .from('interchanges')
    .select('created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentICs && recentICs.length > 0) {
    console.log(`최근 동기화: ${recentICs[0].created_at}`);
  } else {
    console.log('❌ IC 동기화가 필요합니다!');
  }
}

checkICData().catch(console.error);