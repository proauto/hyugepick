#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkDBStructure() {
  console.log('🔍 DB 구조 및 데이터 확인');
  console.log('═'.repeat(50));

  // 첫 번째 휴게소 데이터 구조 확인
  const { data: firstRestArea } = await supabase
    .from('rest_areas')
    .select('*')
    .limit(1)
    .single();

  if (firstRestArea) {
    console.log('📊 첫 번째 휴게소 데이터 구조:');
    console.log('컬럼명들:', Object.keys(firstRestArea));
    console.log('샘플 데이터:', JSON.stringify(firstRestArea, null, 2));
  }

  // 문제가 되는 휴게소들 다시 검색 (올바른 컬럼명 사용)
  const problematicNames = ['서여주', '기흥', '상주'];
  
  for (const name of problematicNames) {
    console.log(`\n🔍 ${name} 관련 휴게소들:`);
    
    const { data: restAreas } = await supabase
      .from('rest_areas')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(5);

    if (restAreas && restAreas.length > 0) {
      restAreas.forEach((area, i) => {
        console.log(`  ${i+1}. ${area.name}`);
        console.log(`     노선: ${area.route_name || area.routeName || '정보없음'}`);
        console.log(`     좌표: ${area.lat}, ${area.lng}`);
      });
    } else {
      console.log('  ❌ 해당 휴게소를 찾을 수 없습니다.');
    }
  }

  // 경부고속도로 휴게소들 확인
  console.log('\n✅ 경부고속도로 휴게소들 (서울-부산 올바른 경로):');
  console.log('─'.repeat(50));
  
  const { data: gyeongbuAreas } = await supabase
    .from('rest_areas')
    .select('name, route_name, route_code, lat, lng')
    .ilike('route_name', '%경부%')
    .order('name')
    .limit(10);

  gyeongbuAreas?.forEach((area, i) => {
    console.log(`  ${i+1}. ${area.name} (${area.route_name})`);
    console.log(`     좌표: ${area.lat}, ${area.lng}`);
  });
}

checkDBStructure().catch(console.error);