# 추가 스키마 설정 가이드

## ⚠️ 중요: Supabase에서 추가 스키마 실행 필요

추가 휴게소 수집 기능을 사용하려면 Supabase SQL Editor에서 다음 스키마를 실행해야 합니다.

### 1. Supabase 콘솔 접속
1. [Supabase Dashboard](https://app.supabase.com) 로그인
2. 프로젝트 선택
3. **SQL Editor** 클릭

### 2. 추가 스키마 실행
`src/lib/database/additional-schema.sql` 파일의 내용을 복사해서 실행하거나, 아래 SQL을 직접 실행:

```sql
-- 휴게소 테이블에 추가 필드
ALTER TABLE rest_areas ADD COLUMN IF NOT EXISTS 
  highway_operator VARCHAR(100),
  data_sources JSONB DEFAULT '[]'::jsonb,
  verification_status VARCHAR(20) DEFAULT 'pending',
  last_verified_at TIMESTAMP WITH TIME ZONE,
  user_reports_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2) DEFAULT 0.5;

-- 기존 데이터 업데이트
UPDATE rest_areas SET data_sources = '["highway_api"]'::jsonb WHERE data_sources = '[]'::jsonb;
UPDATE rest_areas SET highway_operator = '한국도로공사' WHERE highway_operator IS NULL;
UPDATE rest_areas SET verification_status = 'verified' WHERE source = 'highway_api';
UPDATE rest_areas SET confidence_score = 0.9 WHERE source = 'highway_api';

-- 추가 테이블들
CREATE TABLE IF NOT EXISTS rest_area_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  success_rate DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 사용자 제보 테이블
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  rest_area_id UUID REFERENCES rest_areas(id) ON DELETE SET NULL,
  reported_data JSONB NOT NULL,
  reporter_ip VARCHAR(45),
  reporter_session VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 중복 검사 함수 (단순화 버전)
CREATE OR REPLACE FUNCTION simple_duplicate_check(
  name_to_check VARCHAR(100),
  lat_to_check DECIMAL(10, 6),
  lng_to_check DECIMAL(10, 6)
)
RETURNS BOOLEAN AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM rest_areas
  WHERE 
    name = name_to_check OR
    (ABS(lat - lat_to_check) < 0.01 AND ABS(lng - lng_to_check) < 0.01);
  
  RETURN duplicate_count > 0;
END;
$$ LANGUAGE plpgsql;
```

### 3. 환경변수 확인
`.env.local` 파일에 다음 키들이 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_KAKAO_REST_KEY=your_kakao_rest_api_key
```

### 4. 카카오 REST API 키 발급
1. [Kakao Developers](https://developers.kakao.com) 로그인
2. 앱 생성
3. 플랫폼 설정에서 Web 추가 (`http://localhost:3000`)
4. **REST API 키** 복사
5. `.env.local`에 `NEXT_PUBLIC_KAKAO_REST_KEY` 설정

### 5. 테스트 실행
```bash
# 추가 휴게소 수집
npm run sync:additional

# 또는 전체 동기화
npm run sync:all
```

## 🛠️ 트러블슈팅

### 스키마 오류가 계속 발생하는 경우
1. Supabase SQL Editor에서 테이블 구조 확인:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rest_areas';
```

2. 함수 존재 확인:
```sql
SELECT proname 
FROM pg_proc 
WHERE proname LIKE '%duplicate%';
```

### 카카오 API 401 오류
- REST API 키가 올바른지 확인
- 웹 플랫폼 도메인이 등록되어 있는지 확인
- 키에 공백이나 특수문자가 포함되지 않았는지 확인

## 🎯 완료 후 기대 효과

- ✅ 한국도로공사 API: ~203개 휴게소
- ✅ 추가 수집: ~8개 누락 휴게소 (청도새마을, 정안알밤, 가평, 고양)
- ✅ 사용자 제보 시스템 활성화
- ✅ 데이터 품질 관리 시스템