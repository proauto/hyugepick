#!/usr/bin/env node

/**
 * IC 테이블 데이터 완전 삭제 스크립트
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 환경변수 로드
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearICData() {
  console.log('🗑️ IC 테이블 데이터 완전 삭제 시작...');
  console.log(`📅 ${new Date().toLocaleString('ko-KR')}`);
  console.log('═'.repeat(50));

  try {
    // 1. 현재 IC 데이터 수 확인
    const { count: currentCount, error: countError } = await supabase
      .from('interchanges')
      .select('*', { count: 'exact', head: true });

    if (countError && countError.code !== '42P01') {
      console.error('❌ IC 테이블 접근 실패:', countError.message);
      return;
    }

    console.log(`📊 현재 IC 데이터: ${currentCount || 0}개`);

    if (currentCount === 0) {
      console.log('✅ IC 테이블이 이미 비어있습니다.');
      return;
    }

    // 2. 모든 데이터 삭제 (테이블 자체는 유지)
    console.log('🗑️ 모든 IC 데이터 삭제 중...');
    
    const { error: deleteError } = await supabase
      .from('interchanges')
      .delete()
      .neq('id', ''); // 모든 행 삭제 (빈 문자열과 다른 모든 id)

    if (deleteError) {
      console.error('❌ IC 데이터 삭제 실패:', deleteError.message);
      throw deleteError;
    }

    // 3. 삭제 확인
    const { count: afterCount, error: afterCountError } = await supabase
      .from('interchanges')
      .select('*', { count: 'exact', head: true });

    if (afterCountError) {
      console.warn('⚠️ 삭제 후 카운트 확인 실패:', afterCountError.message);
    } else {
      console.log(`📊 삭제 후 IC 데이터: ${afterCount || 0}개`);
    }

    // 4. 테이블 정보 재설정 (필요시)
    console.log('🔄 테이블 시퀀스 재설정...');
    
    // PostgreSQL 시퀀스 재설정 (AUTO INCREMENT 초기화)
    const { error: resetError } = await supabase.rpc('reset_ic_sequence');
    
    if (resetError && !resetError.message.includes('does not exist')) {
      console.warn('⚠️ 시퀀스 재설정 실패 (무시 가능):', resetError.message);
    }

    console.log('✅ IC 테이블 데이터 완전 삭제 완료');
    console.log('💡 이제 새로운 IC 데이터를 안전하게 삽입할 수 있습니다.');

  } catch (error) {
    console.error('❌ IC 데이터 삭제 중 오류:', error);
    process.exit(1);
  }
}

clearICData().catch(console.error);