#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  console.log('📊 휴게소 데이터 구조 확인\n');

  const { data, error } = await supabase
    .from('rest_areas')
    .select('*')
    .limit(3);

  if (error) {
    console.error('❌ 조회 오류:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ 데이터가 없습니다.');
    return;
  }

  // 첫 번째 휴게소 전체 구조
  console.log('🔍 첫 번째 휴게소 데이터:');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('');

  // 필드 타입 정보
  console.log('📋 필드 목록 및 타입:');
  Object.keys(data[0]).forEach(key => {
    const value = data[0][key];
    console.log(`  - ${key}: ${typeof value} (${value})`);
  });
  console.log('');

  // 좌표 관련 필드 확인
  console.log('🗺️ 좌표 관련 필드 확인:');
  data.slice(0, 3).forEach((ra, i) => {
    console.log(`  ${i+1}. ${ra.name || 'Unknown'}`);
    console.log(`     lat: ${ra.lat} (${typeof ra.lat})`);
    console.log(`     lng: ${ra.lng} (${typeof ra.lng})`);
    console.log(`     latitude: ${ra.latitude} (${typeof ra.latitude})`);
    console.log(`     longitude: ${ra.longitude} (${typeof ra.longitude})`);
    console.log(`     route_name: ${ra.route_name} (${typeof ra.route_name})`);
    console.log('');
  });
}

main().catch(console.error);