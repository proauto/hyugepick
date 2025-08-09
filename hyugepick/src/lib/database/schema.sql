-- 휴게소 정보 테이블
CREATE TABLE rest_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_code VARCHAR(20) UNIQUE NOT NULL, -- 한국도로공사 고유코드
  name VARCHAR(100) NOT NULL,
  route_code VARCHAR(20),
  route_name VARCHAR(100),
  direction VARCHAR(50),
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  address VARCHAR(200),
  phone VARCHAR(50),
  service_type VARCHAR(50),
  operating_hours VARCHAR(100),
  
  -- 편의시설 정보
  has_parking BOOLEAN DEFAULT true,
  has_toilet BOOLEAN DEFAULT true,
  has_gas_station BOOLEAN DEFAULT false,
  has_lpg_station BOOLEAN DEFAULT false,
  has_electric_charger BOOLEAN DEFAULT false,
  has_convenience_store BOOLEAN DEFAULT false,
  has_atm BOOLEAN DEFAULT false,
  has_restaurant BOOLEAN DEFAULT false,
  has_pharmacy BOOLEAN DEFAULT false,
  facilities JSONB DEFAULT '[]'::jsonb, -- 기타 편의시설 JSON 배열
  
  -- 메타데이터
  source VARCHAR(50) DEFAULT 'highway_api', -- 데이터 출처 (highway_api, scraping, manual)
  is_verified BOOLEAN DEFAULT false, -- 검증된 데이터 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE, -- 마지막 API 동기화 시간
  
  -- 인덱스용 필드
  geom GEOGRAPHY(POINT, 4326) -- PostGIS 지리 데이터 타입
);

-- 인덱스 생성
CREATE INDEX idx_rest_areas_route_code ON rest_areas(route_code);
CREATE INDEX idx_rest_areas_direction ON rest_areas(direction);
CREATE INDEX idx_rest_areas_name ON rest_areas(name);
CREATE INDEX idx_rest_areas_geom ON rest_areas USING GIST(geom);
CREATE INDEX idx_rest_areas_source ON rest_areas(source);
CREATE INDEX idx_rest_areas_updated_at ON rest_areas(updated_at DESC);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rest_areas_updated_at BEFORE UPDATE
  ON rest_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 휴게소 음식점 정보 테이블
CREATE TABLE rest_area_foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rest_area_id UUID REFERENCES rest_areas(id) ON DELETE CASCADE,
  shop_code VARCHAR(50),
  shop_name VARCHAR(100),
  food_name VARCHAR(100),
  price VARCHAR(50),
  category VARCHAR(50),
  description TEXT,
  sales_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_rest_area_foods_rest_area_id ON rest_area_foods(rest_area_id);
CREATE INDEX idx_rest_area_foods_category ON rest_area_foods(category);

-- 휴게소 편의시설 상세 정보 테이블
CREATE TABLE rest_area_facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rest_area_id UUID REFERENCES rest_areas(id) ON DELETE CASCADE,
  facility_type VARCHAR(50) NOT NULL,
  facility_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'operating',
  description TEXT,
  operating_hours VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_rest_area_facilities_rest_area_id ON rest_area_facilities(rest_area_id);
CREATE INDEX idx_rest_area_facilities_type ON rest_area_facilities(facility_type);

-- API 동기화 로그 테이블
CREATE TABLE sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'scraping'
  source VARCHAR(50) NOT NULL, -- 'highway_api', 'web_scraping'
  status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
  total_fetched INTEGER DEFAULT 0,
  total_inserted INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- 경로 근처 휴게소 찾기 함수 (PostGIS 사용)
CREATE OR REPLACE FUNCTION find_rest_areas_near_route(
  route_line TEXT, -- WKT 형식의 LineString
  buffer_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  unit_code VARCHAR(20),
  name VARCHAR(100),
  route_code VARCHAR(20),
  direction VARCHAR(50),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.id,
    ra.unit_code,
    ra.name,
    ra.route_code,
    ra.direction,
    ra.lat,
    ra.lng,
    ST_Distance(ra.geom, ST_GeomFromText(route_line, 4326)::geography) as distance_meters
  FROM rest_areas ra
  WHERE ST_DWithin(
    ra.geom, 
    ST_GeomFromText(route_line, 4326)::geography, 
    buffer_meters
  )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- 좌표 기준 가까운 휴게소 찾기 함수
CREATE OR REPLACE FUNCTION find_nearest_rest_areas(
  point_lat DECIMAL(10, 6),
  point_lng DECIMAL(10, 6),
  limit_count INTEGER DEFAULT 10,
  max_distance_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  id UUID,
  unit_code VARCHAR(20),
  name VARCHAR(100),
  route_code VARCHAR(20),
  direction VARCHAR(50),
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.id,
    ra.unit_code,
    ra.name,
    ra.route_code,
    ra.direction,
    ra.lat,
    ra.lng,
    ST_Distance(
      ra.geom, 
      ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)::geography
    ) as distance_meters
  FROM rest_areas ra
  WHERE ST_DWithin(
    ra.geom, 
    ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)::geography,
    max_distance_meters
  )
  ORDER BY distance_meters ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;