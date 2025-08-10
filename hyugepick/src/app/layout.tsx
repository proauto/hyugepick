import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "고속도로 휴게소 정보",
  description: "고속도로 휴게소 정보를 확인할 수 있는 서비스입니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Script
          src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=70584fcb3fd421abefaaa5391a8831f0&libraries=services,clusterer&autoload=false"
          strategy="beforeInteractive"
        />
        <Script id="kakao-map-init" strategy="afterInteractive">
          {`
            (function() {
              const initKakaoMaps = () => {
                if (window.kakao && window.kakao.maps) {
                  console.log('🔥 카카오맵 수동 로드 시작');
                  window.kakao.maps.load(function() {
                    console.log('🔥 카카오맵 수동 로드 완료!');
                    window.kakaoMapsLoaded = true;
                  });
                } else {
                  // 스크립트가 아직 로드되지 않았으면 재시도
                  setTimeout(initKakaoMaps, 100);
                }
              };
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initKakaoMaps);
              } else {
                initKakaoMaps();
              }
            })();
          `}
        </Script>
        <AuthProvider>
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
