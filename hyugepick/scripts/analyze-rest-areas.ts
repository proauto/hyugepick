#!/usr/bin/env node

/**
 * 휴게소 방향성 데이터 분석 스크립트
 * 상행/하행 구분이 필요한 휴게소들을 찾아서 분석
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 필수 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 휴게소 방향성 데이터 분석');
console.log('═'.repeat(60));

async function main() {
  try {
    console.log('📥 데이터베이스에서 휴게소 목록 조회...');
    
    const { data: restAreas, error } = await supabase
      .from('rest_areas')
      .select('*')
      .order('name');
    
    if (error) {
      throw new Error(`데이터베이스 조회 실패: ${error.message}`);
    }
    
    if (!restAreas || restAreas.length === 0) {
      throw new Error('휴게소 데이터가 없습니다.');
    }
    
    console.log(`✅ ${restAreas.length}개 휴게소 데이터 로드 완료`);
    console.log('');
    
    // 1. 여주 휴게소들 분석
    console.log('🏪 여주 휴게소 분석');
    console.log('─'.repeat(50));
    
    const yeojuRestAreas = restAreas.filter(ra => ra.name.includes('여주'));
    yeojuRestAreas.forEach(ra => {
      console.log(`📍 ${ra.name}`);
      console.log(`   방향: ${ra.direction || '방향불명'}`);
      console.log(`   노선: ${ra.route_name || '노선불명'}`);
      console.log(`   좌표: ${ra.lat}, ${ra.lng}`);
      console.log(`   주소: ${ra.address || '주소없음'}`);
      console.log('');
    });
    
    // 2. 동일한 이름에 방향 표시가 다른 휴게소들 찾기
    console.log('🔄 상행/하행 구분이 있는 휴게소들');
    console.log('─'.repeat(50));
    
    const nameGroups = new Map<string, typeof restAreas>();
    
    restAreas.forEach(ra => {
      // 괄호 안의 방향 표시 제거한 기본 이름 추출
      const baseName = ra.name.replace(/\([^)]*\)/g, '').trim();
      
      if (!nameGroups.has(baseName)) {
        nameGroups.set(baseName, []);
      }
      nameGroups.get(baseName)!.push(ra);
    });
    
    // 같은 이름에 여러 방향이 있는 휴게소들
    const multiDirectionRestAreas = Array.from(nameGroups.entries())
      .filter(([_, areas]) => areas.length > 1)
      .slice(0, 10); // 처음 10개만 표시
    
    multiDirectionRestAreas.forEach(([baseName, areas]) => {
      console.log(`🏪 ${baseName} (${areas.length}개 방향)`);
      areas.forEach(area => {
        console.log(`   - ${area.name} | ${area.direction || '방향불명'} | ${area.route_name || '노선불명'}`);
      });
      console.log('');
    });
    
    // 3. direction 필드 분석
    console.log('📊 방향 필드 통계');
    console.log('─'.repeat(50));
    
    const directionStats = new Map<string, number>();
    
    restAreas.forEach(ra => {
      const direction = ra.direction || '방향불명';
      directionStats.set(direction, (directionStats.get(direction) || 0) + 1);
    });
    
    const sortedDirections = Array.from(directionStats.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedDirections.forEach(([direction, count]) => {
      console.log(`   ${direction}: ${count}개`);
    });
    
    console.log('');
    console.log('✅ 휴게소 방향성 분석 완료!');
    
  } catch (error) {
    console.error('❌ 분석 실패:', error);
    process.exit(1);
  }
}

main();