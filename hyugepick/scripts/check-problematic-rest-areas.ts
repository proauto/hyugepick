#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkProblematicRestAreas() {
  console.log('🔍 문제가 되는 휴게소들 분석');
  console.log('═'.repeat(50));

  // 문제가 되는 휴게소들
  const problematicNames = [
    '서여주(양평)',
    '기흥(부산)', 
    '상주(청원)'
  ];

  for (const name of problematicNames) {
    console.log(`\n🚨 분석 대상: ${name}`);
    console.log('─'.repeat(30));

    // 정확한 이름으로 검색
    let { data: restAreas } = await supabase
      .from('rest_areas')
      .select('*')
      .eq('name', name);

    if (!restAreas || restAreas.length === 0) {
      // 부분 매칭으로 재시도
      const baseName = name.split('(')[0]; // '서여주', '기흥', '상주'
      ({ data: restAreas } = await supabase
        .from('rest_areas')
        .select('*')
        .ilike('name', `%${baseName}%`));
    }

    if (restAreas && restAreas.length > 0) {
      restAreas.forEach((area, i) => {
        console.log(`  ${i+1}. ${area.name}`);
        console.log(`     📍 좌표: ${area.coordinates?.lat}, ${area.coordinates?.lng}`);
        console.log(`     🛣️ 노선명: ${area.routeName}`);
        console.log(`     🔢 노선코드: ${area.routeCode}`);
        console.log(`     ➡️ 방향: ${area.direction}`);
        console.log(`     📍 주소: ${area.address}`);
      });
    } else {
      console.log('  ❌ 해당 휴게소를 찾을 수 없습니다.');
    }
  }

  // 서울-부산 경로에서 올바른 휴게소들도 확인
  console.log('\n✅ 경부고속도로 휴게소들 (비교용)');
  console.log('═'.repeat(50));
  
  const { data: gyeongbuRestAreas } = await supabase
    .from('rest_areas')
    .select('name, routeName, routeCode, direction, coordinates')
    .ilike('routeName', '%경부%')
    .order('name')
    .limit(10);

  gyeongbuRestAreas?.forEach((area, i) => {
    console.log(`  ${i+1}. ${area.name} (${area.routeName})`);
    console.log(`     방향: ${area.direction}, 코드: ${area.routeCode}`);
  });
}

checkProblematicRestAreas().catch(console.error);