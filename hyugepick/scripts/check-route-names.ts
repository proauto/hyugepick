#!/usr/bin/env node

/**
 * 휴게소 노선명 데이터 확인 스크립트
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  console.log('📊 휴게소 노선명 데이터 분석');
  console.log('═'.repeat(50));

  // 1. 샘플 데이터 확인
  const { data } = await supabase
    .from('rest_areas')
    .select('name, route_name, route_code')
    .limit(20);

  console.log('\n📋 휴게소 노선명 샘플 (상위 20개):');
  data?.forEach((ra, i) => {
    console.log(`  ${i+1}. ${ra.name}`);
    console.log(`     노선명: "${ra.route_name}"`);
    console.log(`     노선코드: "${ra.route_code}"`);
    console.log('');
  });

  // 2. 고유 노선명 확인
  const { data: uniqueRoutes } = await supabase
    .from('rest_areas')
    .select('route_name')
    .not('route_name', 'is', null);

  const routeNames = [...new Set(uniqueRoutes?.map(r => r.route_name))].sort();
  
  console.log('\n📈 고유 노선명 목록:');
  routeNames.forEach((name, i) => {
    console.log(`  ${i+1}. "${name}"`);
  });

  // 3. 경부선 관련 확인
  console.log('\n🔍 경부선 관련 휴게소 확인:');
  const { data: gyeongbuAreas } = await supabase
    .from('rest_areas')
    .select('name, route_name, route_code')
    .ilike('route_name', '%경부%');
  
  console.log(`경부선 관련: ${gyeongbuAreas?.length || 0}개`);
  gyeongbuAreas?.slice(0, 5).forEach(ra => {
    console.log(`  - ${ra.name} (${ra.route_name})`);
  });

  // 4. 중부내륙선 관련 확인 (현풍 포함)
  console.log('\n🔍 중부내륙선 관련 휴게소 확인:');
  const { data: jungbuAreas } = await supabase
    .from('rest_areas')
    .select('name, route_name, route_code')
    .ilike('route_name', '%중부%');
  
  console.log(`중부내륙선 관련: ${jungbuAreas?.length || 0}개`);
  jungbuAreas?.forEach(ra => {
    console.log(`  - ${ra.name} (${ra.route_name})`);
  });
}

main().catch(console.error);