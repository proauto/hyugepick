-- 추가 데이터 소스를 위한 스키마 확장

-- 휴게소 테이블에 추가 필드 (각각 개별적으로 추가)
ALTER TABLE rest_areas ADD COLUMN IF NOT EXISTS highway_operator VARCHAR(100);
ALTER TABLE rest_areas ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE rest_areas ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE rest_areas ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE rest_areas ADD COLUMN IF NOT EXISTS user_reports_count INTEGER DEFAULT 0;
ALTER TABLE rest_areas ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.5;

-- 데이터 소스 추가
UPDATE rest_areas SET data_sources = '["highway_api"]'::jsonb WHERE data_sources = '[]'::jsonb;

-- 추가 휴게소 데이터 소스 테이블
CREATE TABLE IF NOT EXISTS rest_area_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL, -- 'web_scraping', 'kakao_api', 'user_report', 'public_data'
  source_name VARCHAR(100) NOT NULL,
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5, -- 1(highest) - 10(lowest)
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  success_rate DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 기본 데이터 소스 등록
INSERT INTO rest_area_sources (source_type, source_name, source_url, priority) VALUES
('highway_api', '한국도로공사 API', 'https://data.ex.co.kr/openapi', 1),
('public_data', '공공데이터포털 표준데이터', 'https://www.data.go.kr', 2),
('web_scraping', '천안논산고속도로', 'https://www.cneway.co.kr', 3),
('web_scraping', '서울양양고속도로', 'https://seoulyang.co.kr', 3),
('kakao_api', '카카오 지도 검색', 'https://dapi.kakao.com', 4),
('user_report', '사용자 제보', null, 5);

-- 휴게소 검증 로그 테이블
CREATE TABLE IF NOT EXISTS rest_area_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rest_area_id UUID REFERENCES rest_areas(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'coordinates', 'existence', 'facilities', 'name'
  old_value JSONB,
  new_value JSONB,
  source VARCHAR(50) NOT NULL,
  verified_by VARCHAR(100), -- 사용자 ID 또는 시스템
  verification_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' -- verified, rejected, pending
);

-- 사용자 제보 테이블
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL, -- 'missing_rest_area', 'wrong_info', 'closed', 'new_facility'
  rest_area_id UUID REFERENCES rest_areas(id) ON DELETE SET NULL,
  reported_data JSONB NOT NULL,
  reporter_ip VARCHAR(45),
  reporter_session VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 스크래핑 실행 로그
CREATE TABLE IF NOT EXISTS scraping_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES rest_area_sources(id) ON DELETE CASCADE,
  scraping_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  items_found INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_rest_areas_highway_operator ON rest_areas(highway_operator);
CREATE INDEX IF NOT EXISTS idx_rest_areas_verification_status ON rest_areas(verification_status);
CREATE INDEX IF NOT EXISTS idx_rest_areas_confidence_score ON rest_areas(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_type ON user_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_source_id ON scraping_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_started_at ON scraping_logs(started_at DESC);

-- 휴게소 중복 검사 함수
CREATE OR REPLACE FUNCTION find_duplicate_rest_areas(
  name_to_check VARCHAR(100),
  lat_to_check DECIMAL(10, 6),
  lng_to_check DECIMAL(10, 6),
  distance_threshold_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  distance_meters DOUBLE PRECISION,
  confidence_score DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.id,
    ra.name,
    ra.lat,
    ra.lng,
    ST_Distance(
      ra.geom,
      ST_SetSRID(ST_MakePoint(lng_to_check, lat_to_check), 4326)::geography
    ) as distance_meters,
    ra.confidence_score
  FROM rest_areas ra
  WHERE 
    (
      similarity(ra.name, name_to_check) > 0.6 OR -- 이름 유사도
      ST_DWithin(
        ra.geom,
        ST_SetSRID(ST_MakePoint(lng_to_check, lat_to_check), 4326)::geography,
        distance_threshold_meters
      ) -- 거리 기준
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;