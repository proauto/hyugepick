# GitHub Actions를 이용한 휴게소 데이터 자동 동기화 설정

## 📋 개요
Vercel 대신 GitHub Actions를 사용하여 휴게소 데이터를 주기적으로 동기화합니다.

## 🚀 설정 방법

### 1. GitHub Secrets 설정
GitHub 저장소에서 다음 시크릿들을 설정해야 합니다:

1. 저장소 페이지에서 **Settings** → **Secrets and variables** → **Actions** 이동
2. **New repository secret** 클릭
3. 다음 시크릿들을 추가:

```
SUPABASE_URL         : Supabase 프로젝트 URL
SUPABASE_ANON_KEY    : Supabase Anonymous Key  
HIGHWAY_API_KEY      : 한국도로공사 API 키
```

### 2. 의존성 설치
```bash
npm install
# 또는
npm install dotenv tsx
```

### 3. 로컬 테스트
동기화 스크립트를 로컬에서 테스트할 수 있습니다:

```bash
# .env 파일 생성
cp .env.example .env
# .env 파일에 실제 값 입력

# 증분 동기화 실행
npm run sync:incremental

# 전체 동기화 실행  
npm run sync:full
```

## ⏰ 자동 실행 스케줄

GitHub Actions는 다음 일정으로 자동 실행됩니다:
- **매주 월요일 새벽 3시 (한국시간)** 자동 실행
- UTC 기준: 일요일 18시

### 스케줄 변경 방법
`.github/workflows/sync-rest-areas.yml` 파일의 cron 표현식을 수정:

```yaml
schedule:
  - cron: '0 18 * * 0'  # 현재: 매주 일요일 18시 UTC
```

#### Cron 표현식 예시:
- `'0 18 * * *'` : 매일 새벽 3시 (KST)
- `'0 18 * * 1,4'` : 매주 월,목 새벽 3시 (KST)
- `'0 18 1 * *'` : 매월 1일 새벽 3시 (KST)

## 🔧 수동 실행

### GitHub에서 수동 실행
1. GitHub 저장소에서 **Actions** 탭 이동
2. **Sync Rest Areas Database** 워크플로우 선택
3. **Run workflow** 클릭
4. Sync Type 선택:
   - `incremental`: 증분 동기화 (빠름)
   - `full`: 전체 동기화 (느림)
5. **Run workflow** 버튼 클릭

### 로컬에서 수동 실행
```bash
# 증분 동기화
npm run sync:incremental

# 전체 동기화
npm run sync:full

# 또는 직접 실행
npx tsx scripts/sync-rest-areas.ts incremental
npx tsx scripts/sync-rest-areas.ts full
```

## 📊 동기화 로그 확인

### GitHub Actions 로그
1. **Actions** 탭에서 실행된 워크플로우 클릭
2. 상세 로그 확인 가능

### Supabase 데이터베이스
`sync_logs` 테이블에서 동기화 기록 확인:

```sql
SELECT * FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 10;
```

### 웹 관리 페이지
`/admin/db-sync` 페이지에서 동기화 상태 확인 및 수동 실행 가능

## 🚨 알림 설정

동기화 실패 시 자동으로 GitHub Issue가 생성됩니다.

### 추가 알림 설정 (선택사항)

#### Slack 알림 추가
`.github/workflows/sync-rest-areas.yml`에 다음 추가:

```yaml
- name: Slack Notification
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: '휴게소 데이터 동기화 실패!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

#### 이메일 알림
GitHub 저장소 Settings → Notifications에서 이메일 알림 설정

## 🔒 보안 고려사항

1. **API 키 보호**: 절대 코드에 직접 API 키를 입력하지 마세요
2. **GitHub Secrets 사용**: 모든 민감한 정보는 Secrets로 관리
3. **최소 권한**: Supabase 키는 필요한 최소 권한만 부여
4. **로그 검토**: 정기적으로 sync_logs 테이블 검토

## 📈 성능 최적화

### 동기화 전략
- **증분 동기화**: 일반적인 경우 사용 (빠름)
- **전체 동기화**: 데이터 불일치 의심 시 사용

### 데이터베이스 인덱스
PostGIS 인덱스가 자동 생성되어 위치 기반 쿼리 성능 최적화

## 🛠️ 문제 해결

### 동기화 실패 시
1. GitHub Actions 로그 확인
2. API 키 유효성 확인
3. Supabase 연결 상태 확인
4. 한국도로공사 API 상태 확인

### 수동 복구
```bash
# 로컬에서 직접 실행하여 상세 로그 확인
npm run sync:full
```

## 📝 참고사항

- GitHub Actions는 무료 계정 기준 월 2,000분 무료 제공
- 동기화 작업은 보통 1-2분 소요
- 주 1회 실행 시 월 4-8분 사용 (충분한 여유)
- Private 저장소는 월 2,000분, Public 저장소는 무제한 무료