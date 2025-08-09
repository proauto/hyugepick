# GitHub 업로드 가이드

## 1. GitHub에서 새 저장소 만들기

1. [GitHub.com](https://github.com) 로그인
2. 우측 상단 `+` 버튼 → `New repository` 클릭
3. 저장소 설정:
   - Repository name: `hyugepick`
   - Description: `고속도로 휴게소 검색 서비스 - 최적경로상 휴게소 정보 제공`
   - Public 또는 Private 선택
   - **중요**: `Add a README file` 체크 해제 (이미 있음)
   - `Create repository` 클릭

## 2. 로컬 저장소를 GitHub에 연결

GitHub에서 저장소 생성 후 나오는 명령어를 따라하거나, 아래 명령어 실행:

```bash
# GitHub 저장소 연결 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/hyugepick.git

# 브랜치 이름을 main으로 변경 (GitHub 기본값)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 3. GitHub Secrets 설정 (중요!)

저장소 푸시 후 GitHub Actions가 작동하려면 Secrets 설정 필요:

1. GitHub 저장소 페이지에서 `Settings` 탭 클릭
2. 좌측 메뉴에서 `Secrets and variables` → `Actions` 클릭
3. `New repository secret` 버튼 클릭
4. 다음 시크릿들을 하나씩 추가:

### 필수 Secrets:

#### SUPABASE_URL
- Name: `SUPABASE_URL`
- Value: Supabase 프로젝트 URL (예: `https://xxxxx.supabase.co`)

#### SUPABASE_ANON_KEY
- Name: `SUPABASE_ANON_KEY`
- Value: Supabase Anonymous Key

#### HIGHWAY_API_KEY
- Name: `HIGHWAY_API_KEY`
- Value: 한국도로공사 API 키

## 4. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com) 에서 프로젝트 생성
2. SQL Editor에서 `/src/lib/database/schema.sql` 내용 실행
3. Settings → API에서 URL과 anon key 복사

## 5. 로컬 개발 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집하여 실제 값 입력
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
# NEXT_PUBLIC_HIGHWAY_API_KEY=your_highway_api_key
# NEXT_PUBLIC_KAKAO_APP_KEY=your_kakao_key

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 6. 초기 데이터 동기화

### 방법 1: 로컬에서 실행
```bash
npm run sync:full
```

### 방법 2: GitHub Actions에서 수동 실행
1. GitHub 저장소 → Actions 탭
2. `Sync Rest Areas Database` 워크플로우
3. `Run workflow` → `full` 선택 → 실행

### 방법 3: 웹 관리 페이지
1. 앱 실행 후 `/admin/db-sync` 접속
2. "전체 동기화" 버튼 클릭

## 7. 확인사항

✅ GitHub Actions 워크플로우 활성화 확인
✅ Secrets 모두 설정됨
✅ Supabase 테이블 생성됨
✅ 로컬 .env 파일 설정됨
✅ 초기 데이터 동기화 완료

## 문제 해결

### GitHub Actions 실패 시
- Actions 탭에서 로그 확인
- Secrets 설정 확인
- API 키 유효성 확인

### 로컬 실행 오류 시
- .env 파일 확인
- npm install 재실행
- 포트 3000 사용 중인지 확인

## 프로젝트 구조

```
hyugepick/
├── .github/workflows/    # GitHub Actions 설정
├── src/
│   ├── app/             # Next.js 페이지
│   ├── components/      # React 컴포넌트
│   ├── lib/             
│   │   ├── database/    # Supabase DB 연동
│   │   └── ...          # API 서비스들
│   └── types/           # TypeScript 타입
├── scripts/             # 동기화 스크립트
└── docs/                # 문서