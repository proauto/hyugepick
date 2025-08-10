/**
 * 환경변수 중앙 관리 모듈
 * 모든 환경변수를 이 파일에서 관리하고 타입 안전성을 보장합니다.
 */

export const env = {
  // Supabase 설정
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  },
  
  // Kakao API 설정  
  kakao: {
    jsKey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY as string,
    restApiKey: process.env.KAKAO_REST_API_KEY as string,
  },
  
  // 기타 API 설정
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  },
  
  // Node.js 환경 설정
  node: {
    env: process.env.NODE_ENV as 'development' | 'production' | 'test',
  }
} as const;

/**
 * 필수 환경변수가 설정되어 있는지 검사하는 함수
 */
export function validateEnvConfig(): void {
  const required = [
    ['NEXT_PUBLIC_SUPABASE_URL', env.supabase.url],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', env.supabase.anonKey],
  ] as const;

  const missing = required.filter(([key, value]) => !value).map(([key]) => key);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// 개발 환경에서는 즉시 검증 실행 - 일시적으로 비활성화
// if (env.node.env === 'development') {
//   validateEnvConfig();
// }