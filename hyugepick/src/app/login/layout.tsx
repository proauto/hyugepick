import type { Metadata } from "next";
import Script from "next/script";
import "../globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "HygePick - 로그인",
  description: "HygePick 로그인 페이지",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <Script
        src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=70584fcb3fd421abefaaa5391a8831f0&libraries=services,clusterer&autoload=false"
        strategy="beforeInteractive"
      />
      <Script id="kakao-map-init" strategy="afterInteractive">
        {`
          if (window.kakao && window.kakao.maps) {
            console.log('🔥 카카오맵 수동 로드 시작');
            window.kakao.maps.load(function() {
              console.log('🔥 카카오맵 수동 로드 완료!');
            });
          }
        `}
      </Script>
      <AuthProvider>
        {children}
      </AuthProvider>
    </div>
  );
}