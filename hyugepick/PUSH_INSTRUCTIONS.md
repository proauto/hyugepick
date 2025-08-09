# GitHub 푸시 방법

## 현재 상황
- ✅ Git 저장소 초기화됨
- ✅ 모든 파일 커밋됨
- ✅ remote origin 설정됨 (placeholder URL)
- ✅ main 브랜치로 설정됨

## 방법 1: 기존 remote URL 변경 후 푸시

### 1-1. 실제 GitHub 저장소 생성
1. [GitHub.com](https://github.com) 로그인
2. 우측 상단 `+` → `New repository`
3. 저장소명: `hyugepick` 
4. **중요**: `Add a README file` 체크 해제
5. `Create repository` 클릭

### 1-2. Remote URL 변경 및 푸시
```bash
# 터미널에서 실행 (실제 GitHub 사용자명으로 변경)
cd hyugepick

# 기존 remote 제거
git remote remove origin

# 새 remote 추가
git remote add origin https://github.com/실제사용자명/hyugepick.git

# 푸시
git push -u origin main
```

## 방법 2: 기존 GitHub 저장소가 이미 있다면

혹시 이미 `hyugepick` 저장소가 GitHub에 있다면:

```bash
# 바로 푸시 시도
cd hyugepick
git push -u origin main

# 만약 충돌이 있다면 강제 푸시 (주의!)
git push -f origin main
```

## 방법 3: 다른 저장소명으로 생성

```bash
cd hyugepick

# remote 변경 (예: hyugepick-v2)
git remote set-url origin https://github.com/실제사용자명/hyugepick-v2.git

# 푸시
git push -u origin main
```

## 푸시 성공 후 해야 할 일

1. **GitHub Secrets 설정** (필수!)
   - 저장소 Settings → Secrets and variables → Actions
   - 추가할 시크릿:
     - `SUPABASE_URL`: Supabase 프로젝트 URL
     - `SUPABASE_ANON_KEY`: Supabase Anonymous 키
     - `HIGHWAY_API_KEY`: 한국도로공사 API 키

2. **GitHub Actions 확인**
   - Actions 탭에서 워크플로우 활성화 확인
   - 아직 실행하지 말고 Secrets 먼저 설정

3. **Supabase 데이터베이스 설정**
   - Supabase 프로젝트 생성
   - `src/lib/database/schema.sql` 실행

## 문제 해결

### Permission denied (publickey) 오류
SSH 키 문제. HTTPS URL 사용 권장:
```bash
git remote set-url origin https://github.com/사용자명/hyugepick.git
```

### 403 Forbidden 오류
GitHub 토큰 또는 권한 문제. GitHub 로그인 상태 확인.

### Everything up-to-date
이미 푸시되어 있다는 뜻. GitHub에서 확인해보세요.