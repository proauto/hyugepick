# 🚗 HygePick - 고속도로 휴게소 서비스

실시간 경로 기반 고속도로 휴게소 찾기 서비스 (Next.js 14.2.31 + TypeScript)

출발지와 목적지를 설정하면 최적경로를 알려주고 그 최적경로 상의 휴게소 정보를 가져와 보여주는 서비스
하드 코딩은 절대 하지 말것

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
- CSS 안되면: 브라우저 캐시 삭제 또는 시크릿 모드
- 서버 재시작: `npx kill-port 3000` 후 `npm run dev`
- 로그 확인: 브라우저 콘솔에서 🔥 이모지로 시작하는 로그 체크


**📋 디버깅 가이드:**
- **서버 터미널**: `npm run dev` 명령어를 실행한 터미널 창을 의미합니다
- **Claude는 서버 터미널입니다** - 서버 터미널 확인 요청 시 Claude가 직접 확인합니다
- 에러 발생 시 서버 터미널에서 상세한 로그를 확인하세요

그 다음 개발 서버를 실행하세요:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
