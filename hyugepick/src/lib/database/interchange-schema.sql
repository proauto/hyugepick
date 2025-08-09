-- ========================================
-- 인터체인지(IC) 및 방향성 관련 스키마
-- ========================================

-- 1. 인터체인지 테이블 생성
CREATE TABLE IF NOT EXISTS interchanges (
    id VARCHAR(50) PRIMARY KEY,                -- IC 코드
    name VARCHAR(100) NOT NULL,                -- IC명
    route_name VARCHAR(100) NOT NULL,          -- 노선명 (예: 경부선)
    route_no VARCHAR(20) NOT NULL,             -- 노선번호 (예: 0010)
    direction VARCHAR(10) NOT NULL,            -- 방향 (UP/DOWN/BOTH/UNKNOWN)
    weight INTEGER NOT NULL,                   -- 가중치/순서
    distance_from_start DECIMAL(10, 2),        -- 시점으로부터 거리 (km)
    coordinates GEOGRAPHY(POINT, 4326),        -- PostGIS 좌표
    lat DECIMAL(10, 8) NOT NULL,              -- 위도 (인덱싱용)
    lng DECIMAL(11, 8) NOT NULL,              -- 경도 (인덱싱용)
    prev_ic VARCHAR(50),                       -- 이전 IC ID
    next_ic VARCHAR(50),                       -- 다음 IC ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_interchanges_route ON interchanges(route_name, route_no);
CREATE INDEX idx_interchanges_direction ON interchanges(direction);
CREATE INDEX idx_interchanges_weight ON interchanges(weight);
CREATE INDEX idx_interchanges_coordinates ON interchanges USING GIST(coordinates);
CREATE INDEX idx_interchanges_lat_lng ON interchanges(lat, lng);

-- ========================================
-- 2. 휴게소 테이블에 방향 필드 추가
-- ========================================

-- route_direction 컬럼 추가 (이미 있으면 무시)
ALTER TABLE rest_areas 
ADD COLUMN IF NOT EXISTS route_direction VARCHAR(10) DEFAULT 'UNKNOWN';

-- route_direction에 대한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_rest_areas_route_direction 
ON rest_areas(route_direction);

-- direction 필드 업데이트를 위한 임시 함수
CREATE OR REPLACE FUNCTION update_rest_area_direction()
RETURNS void AS $$
BEGIN
    -- 방향 키워드로 초기 업데이트
    UPDATE rest_areas 
    SET route_direction = 'UP'
    WHERE direction ILIKE '%상행%' 
       OR direction ILIKE '%서울%' 
       OR direction ILIKE '%북%';
    
    UPDATE rest_areas 
    SET route_direction = 'DOWN'
    WHERE direction ILIKE '%하행%' 
       OR direction ILIKE '%부산%' 
       OR direction ILIKE '%남%';
    
    UPDATE rest_areas 
    SET route_direction = 'BOTH'
    WHERE direction ILIKE '%양방향%' 
       OR direction ILIKE '%양%' 
       OR direction ILIKE '%상하행%';
    
    -- 나머지는 UNKNOWN으로 유지
END;
$$ LANGUAGE plpgsql;

-- 함수 실행
SELECT update_rest_area_direction();

-- ========================================
-- 3. 방향성 계산 관련 함수
-- ========================================

-- 휴게소의 접근 가능성 확인 함수
CREATE OR REPLACE FUNCTION is_rest_area_accessible(
    rest_area_direction VARCHAR(10),
    route_direction VARCHAR(10)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- UNKNOWN이거나 BOTH면 항상 접근 가능
    IF route_direction = 'UNKNOWN' OR rest_area_direction = 'BOTH' THEN
        RETURN TRUE;
    END IF;
    
    -- 방향이 일치하면 접근 가능
    IF rest_area_direction = route_direction THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. IC 기반 방향 판단을 위한 뷰
-- ========================================

-- 노선별 IC 순서 뷰
CREATE OR REPLACE VIEW route_ic_sequence AS
SELECT 
    route_name,
    route_no,
    direction,
    id as ic_id,
    name as ic_name,
    weight,
    distance_from_start,
    lat,
    lng,
    ROW_NUMBER() OVER (
        PARTITION BY route_name, route_no, direction 
        ORDER BY weight
    ) as sequence_no
FROM interchanges
ORDER BY route_name, route_no, direction, weight;

-- ========================================
-- 5. 동기화 로그 테이블
-- ========================================

CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,            -- REST_AREA, INTERCHANGE 등
    total_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER,
    status VARCHAR(20) NOT NULL,               -- SUCCESS, FAILED, PARTIAL
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 6. 경로-휴게소 방향 매칭 함수
-- ========================================

-- 경로와 휴게소 간 방향 매칭 함수
CREATE OR REPLACE FUNCTION match_rest_area_direction(
    route_coords GEOGRAPHY(LINESTRING, 4326),
    rest_area_route_name VARCHAR(100)
)
RETURNS VARCHAR(10) AS $$
DECLARE
    start_ic RECORD;
    end_ic RECORD;
    weight_diff INTEGER;
BEGIN
    -- 경로 근처의 시작 IC 찾기
    SELECT * INTO start_ic
    FROM interchanges
    WHERE route_name = rest_area_route_name
      AND ST_DWithin(coordinates, ST_StartPoint(route_coords), 300)
    ORDER BY ST_Distance(coordinates, ST_StartPoint(route_coords))
    LIMIT 1;
    
    -- 경로 근처의 끝 IC 찾기
    SELECT * INTO end_ic
    FROM interchanges
    WHERE route_name = rest_area_route_name
      AND ST_DWithin(coordinates, ST_EndPoint(route_coords), 300)
    ORDER BY ST_Distance(coordinates, ST_EndPoint(route_coords))
    LIMIT 1;
    
    -- IC를 찾지 못한 경우
    IF start_ic IS NULL OR end_ic IS NULL THEN
        RETURN 'UNKNOWN';
    END IF;
    
    -- Weight 차이로 방향 판단
    weight_diff := start_ic.weight - end_ic.weight;
    
    IF weight_diff > 0 THEN
        RETURN 'UP';    -- 상행
    ELSIF weight_diff < 0 THEN
        RETURN 'DOWN';  -- 하행
    ELSE
        RETURN 'UNKNOWN';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. 휴게소 필터링 함수 (최종)
-- ========================================

-- IC 기반 방향성을 고려한 휴게소 필터링
CREATE OR REPLACE FUNCTION filter_rest_areas_by_direction(
    route_linestring GEOGRAPHY(LINESTRING, 4326),
    max_distance_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
    rest_area_id BIGINT,
    name VARCHAR(255),
    route_name VARCHAR(100),
    direction VARCHAR(100),
    route_direction VARCHAR(10),
    is_accessible BOOLEAN,
    confidence DECIMAL(3, 2),
    distance_from_route DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    WITH nearby_rest_areas AS (
        -- 경로 근처 휴게소 찾기
        SELECT 
            ra.id,
            ra.name,
            ra.route_name,
            ra.direction,
            ra.route_direction,
            ST_Distance(ra.coordinates, route_linestring) as distance
        FROM rest_areas ra
        WHERE ST_DWithin(ra.coordinates, route_linestring, max_distance_meters)
    ),
    direction_analysis AS (
        -- 각 휴게소의 방향 분석
        SELECT 
            nra.*,
            match_rest_area_direction(route_linestring, nra.route_name) as calculated_direction
        FROM nearby_rest_areas nra
    )
    SELECT 
        da.id as rest_area_id,
        da.name,
        da.route_name,
        da.direction,
        da.route_direction,
        is_rest_area_accessible(da.route_direction, da.calculated_direction) as is_accessible,
        CASE 
            WHEN da.route_direction = da.calculated_direction THEN 1.0
            WHEN da.route_direction = 'BOTH' THEN 0.9
            WHEN da.route_direction = 'UNKNOWN' THEN 0.5
            ELSE 0.1
        END as confidence,
        da.distance as distance_from_route
    FROM direction_analysis da
    ORDER BY da.distance;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. 통계 및 모니터링
-- ========================================

-- IC 데이터 통계 뷰
CREATE OR REPLACE VIEW ic_statistics AS
SELECT 
    route_name,
    route_no,
    COUNT(*) as total_ics,
    COUNT(CASE WHEN direction = 'UP' THEN 1 END) as up_count,
    COUNT(CASE WHEN direction = 'DOWN' THEN 1 END) as down_count,
    COUNT(CASE WHEN direction = 'BOTH' THEN 1 END) as both_count,
    COUNT(CASE WHEN direction = 'UNKNOWN' THEN 1 END) as unknown_count,
    MAX(weight) as max_weight,
    MAX(distance_from_start) as total_distance_km
FROM interchanges
GROUP BY route_name, route_no
ORDER BY route_name, route_no;

-- 휴게소 방향성 통계 뷰
CREATE OR REPLACE VIEW rest_area_direction_statistics AS
SELECT 
    route_name,
    COUNT(*) as total_rest_areas,
    COUNT(CASE WHEN route_direction = 'UP' THEN 1 END) as up_count,
    COUNT(CASE WHEN route_direction = 'DOWN' THEN 1 END) as down_count,
    COUNT(CASE WHEN route_direction = 'BOTH' THEN 1 END) as both_count,
    COUNT(CASE WHEN route_direction = 'UNKNOWN' THEN 1 END) as unknown_count,
    ROUND(
        100.0 * COUNT(CASE WHEN route_direction != 'UNKNOWN' THEN 1 END) / COUNT(*),
        2
    ) as direction_coverage_percent
FROM rest_areas
GROUP BY route_name
ORDER BY route_name;

-- ========================================
-- 9. 권한 설정
-- ========================================

-- 필요한 권한 부여 (Supabase RLS 정책에 맞게 조정)
GRANT SELECT ON interchanges TO authenticated;
GRANT SELECT ON sync_logs TO authenticated;
GRANT EXECUTE ON FUNCTION is_rest_area_accessible TO authenticated;
GRANT EXECUTE ON FUNCTION match_rest_area_direction TO authenticated;
GRANT EXECUTE ON FUNCTION filter_rest_areas_by_direction TO authenticated;

-- ========================================
-- 실행 완료 메시지
-- ========================================
-- 이 스크립트를 실행하면:
-- 1. interchanges 테이블이 생성됩니다
-- 2. rest_areas 테이블에 route_direction 필드가 추가됩니다
-- 3. IC 기반 방향 판단 함수들이 생성됩니다
-- 4. 통계 뷰가 생성됩니다
-- ========================================