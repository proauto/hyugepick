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
          onLoad={() => {
            console.log('🔥 카카오맵 스크립트 로드 완료');
            if (window.kakao && window.kakao.maps) {
              window.kakao.maps.load(() => {
                console.log('🔥 카카오맵 API 초기화 완료!');
                window.kakaoMapsLoaded = true;
              });
            }
          }}
          onError={() => {
            console.error('🔥 카카오맵 스크립트 로드 실패');
          }}
        />
        <AuthProvider>
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
