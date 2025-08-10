# 🚗 HygePick - 고속도로 휴게소 서비스

실시간 경로 기반 고속도로 휴게소 찾기 서비스 (Next.js 14.2.31 + TypeScript)

출발지와 목적지를 설정하면 최적경로를 알려주고 그 최적경로 상의 휴게소 정보를 가져와 보여주는 서비스

## 📈 최근 프로젝트 최적화 완료 (2025-08-09)

### ✅ **모듈 통합 리팩토링 완료**
프로젝트에서 발생한 전역변수 충돌과 함수명 중복 문제를 체계적으로 해결했습니다.

#### **해결된 주요 문제점**
- **함수명 중복**: `calculateDistance`, `isValidCoordinate` 함수가 여러 파일에 중복 구현
- **Supabase 인스턴스 분산**: 5개 파일에서 각각 클라이언트 생성으로 메모리 낭비
- **환경변수 중복 선언**: 3개 파일에서 동일한 환경변수 반복 선언

#### **새로운 모듈 구조**
```
src/lib/utils/
├── distanceCalculator.ts    # 거리 계산 통합 모듈 (하버사인 공식)
├── coordinateValidator.ts   # 좌표 검증 통합 모듈 (타입 가드)
├── envConfig.ts            # 환경변수 중앙 관리
└── index.ts                # 배럴 export
```

#### **성능 개선 지표**
- **코드 중복**: 5개 → 0개 중복 함수
- **Supabase 인스턴스**: 5개 → 1개 통일
- **환경변수 관리**: 분산 → 중앙 집중화
- **타입 안전성**: 향상 (공통 타입 가드 사용)

#### **사용법**
```typescript
// Before (중복된 코드)
function calculateDistance(pos1: Coordinates, pos2: Coordinates) { ... }
const supabase = createClient(url, key);

// After (통합된 모듈)
import { calculateDistance, isValidCoordinate, env } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
```

### 🔧 **기술적 개선사항**
- **환경변수 검증 시스템**: 필수 환경변수 자동 검증
- **타입 안전성 강화**: 공통 타입 가드 함수로 런타임 안전성 보장
- **메모리 효율성**: 단일 Supabase 인스턴스로 메모리 사용량 최적화
- **코드 재사용성**: 공통 유틸리티 모듈로 중복 코드 제거

---

## 🔥 CLAUDE CODE 절대 규칙 (절대 어기지 말 것!)

### 📍 API & 데이터 규칙
1. **절대 목 데이터(mock data) 사용 금지** - 반드시 실제 한국도로공사 API 사용

### 🔧 기술 규칙
1. **포트**: 반드시 3000번 포트 사용 (OAuth 설정 때문)
OAuth 설정이 3000번 포트에 맞춰져 있으므로 포트 변경 금지입니다.

만약 3000번 포트가 사용 중이라면 다음 명령어로 먼저 종료하세요:

```bash
# 3000번 포트 사용 중인 프로세스 종료 (Windows)
npx kill-port 3000
```

### ⚠️ 디버깅 & 개발
- **CSS 안되면**: 브라우저 캐시 삭제 또는 시크릿 모드
- **서버 재시작**: `npx kill-port 3000` 후 `npm run dev`
- **로그 확인**: 브라우저 콘솔에서 🔥 이모지로 시작하는 로그 체크
- **CSS 완전 깨짐**: PostCSS autoprefixer 의존성 문제 → postcss.config.mjs에서 autoprefixer 제거
- **빌드 에러**: `rm -rf .next` 후 서버 재시작으로 캐시 클리어


**📋 디버깅 가이드:**
- **서버 터미널**: `npm run dev` 명령어를 실행한 터미널 창을 의미합니다
- **Claude는 서버 터미널입니다** - 서버 터미널 확인 요청 시 Claude가 직접 확인합니다
- 에러 발생 시 서버 터미널에서 상세한 로그를 확인하세요

## 🚀 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작 (반드시 3000번 포트)
npm run dev
```

서버 실행 후 브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📁 프로젝트 구조

```
hyugepick/
├── src/
│   ├── app/                    # App Router 페이지
│   │   ├── route/             # 경로 검색 페이지
│   │   └── api/               # API 라우트
│   ├── components/            # React 컴포넌트
│   │   ├── map/              # 지도 관련 컴포넌트
│   │   └── location/         # 위치 관련 컴포넌트
│   ├── lib/                   # 핵심 비즈니스 로직
│   │   ├── utils/            # 공통 유틸리티 (2025-08-09 신규)
│   │   ├── routing/          # 경로 분석 모듈
│   │   └── database/         # DB 관련 모듈
│   └── types/                 # TypeScript 타입 정의
├── public/                    # 정적 파일
└── scripts/                   # 데이터 동기화 스크립트
```

## 🔧 핵심 기능

### 📍 실시간 경로 분석
- 카카오맵 API를 통한 정확한 경로 계산
- 고속도로 구간별 휴게소 매칭
- GPS 기반 현재 위치 자동 설정

### 🏪 휴게소 데이터
- 한국도로공사 공식 API 연동 (실시간 데이터)
- 211개 휴게소 정보 (시설, 음식, 운영시간 등)
- 주간 자동 동기화 시스템

### 🗺️ 지도 서비스
- 카카오맵 기반 인터랙티브 지도
- 경로상 휴게소 마커 표시
- 상세 정보 팝업

## 🛠️ 기술 스택

- **Frontend**: Next.js 14.2.31, TypeScript, Tailwind CSS
- **Map**: Kakao Maps API
- **Database**: Supabase (PostgreSQL)
- **Data**: 한국도로공사 휴게소 API
- **Deployment**: Vercel

## 📊 데이터 소스

- **휴게소 정보**: [한국도로공사 휴게소 정보 API](https://data.ex.co.kr)
- **지도 서비스**: [카카오맵 API](https://apis.map.kakao.com)
- **경로 계산**: 카카오 모빌리티 API

## 🔐 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Kakao Maps
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key
KAKAO_REST_API_KEY=your_kakao_rest_key

# 한국도로공사 API
EX_API_KEY=your_ex_api_key
```
