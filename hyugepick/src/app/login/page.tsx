'use client';

import { signInWithGoogle, signInWithKakao } from '@/lib/auth';
import { useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading('google');
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      setIsLoading('kakao');
      await signInWithKakao();
    } catch (error) {
      console.error('Kakao login error:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleNaverLogin = async () => {
    alert('네이버 로그인은 준비 중입니다.');
  };

  return (
    <>
      {/* 데스크톱 버전 (768px 이상) - 1920x1080 기준 정확한 좌표 */}
      <div className="hidden md:flex min-h-screen justify-center items-center relative">
        {/* 전체 화면 배경 */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/firstpage_web.png')`,
          }}
        />
        
        <div className="relative z-10" style={{ width: '1920px', height: '1080px' }}>
          
          {/* 컨텐츠 */}
          <div className="relative z-10 w-full h-full">
            {/* 로고 - X457 Y454, 72x72 */}
            <div className="absolute" style={{ left: '457px', top: '454px' }}>
              <Image 
                src="/logo_web.png" 
                alt="Hyuge Pick Logo" 
                width={72} 
                height={72}
                className="object-contain"
              />
            </div>
            
            {/* 브랜드 텍스트 - X401 Y542, 185x39 */}
            <div className="absolute" style={{ left: '401px', top: '542px', width: '185px', height: '39px' }}>
              <h1 className="text-white leading-none" style={{ fontFamily: 'Montserrat', fontSize: '32px' }}>
                <span className="font-light">Hyuge </span>
                <span className="font-semibold">PICK</span>
              </h1>
            </div>
            
            {/* 서브 텍스트 - X320 Y597, 345x29 */}
            <div className="absolute" style={{ left: '320px', top: '597px', width: '345px', height: '29px' }}>
              <p className="text-white text-[24px] font-light whitespace-nowrap" style={{ fontFamily: 'Montserrat' }}>
                지금 나에게 딱 맞는 휴게소, 휴게픽
              </p>
            </div>
            
            {/* 흰색 로그인 배경 - X968 Y366, 512x348, 모서리 반경 12 */}
            <div 
              className="absolute bg-white shadow-lg"
              style={{ 
                left: '968px', 
                top: '366px', 
                width: '512px', 
                height: '348px', 
                borderRadius: '12px' 
              }}
            >
              {/* 간편 로그인 타이틀 - X1000 Y398 */}
              <div className="absolute" style={{ left: '32px', top: '32px' }}>
                <h2 className="text-[24px] font-bold text-gray-900" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                  간편 로그인
                </h2>
              </div>
              
              {/* 카카오 로그인 박스 - X1000 Y466, 448x56, 모서리 반경 40 */}
              <button
                onClick={handleKakaoLogin}
                disabled={isLoading !== null}
                className="absolute bg-[#FEE500] hover:bg-[#FFD700] transition-colors disabled:opacity-50 flex items-center justify-center"
                style={{ 
                  left: '32px', 
                  top: '100px', 
                  width: '448px', 
                  height: '56px', 
                  borderRadius: '40px' 
                }}
              >
                <div className="absolute" style={{ left: '64px' }}>
                  <Image 
                    src="/kakao_web.png" 
                    alt="Kakao" 
                    width={36} 
                    height={36}
                    className="object-contain"
                  />
                </div>
                <span className="text-black text-[20px] font-medium" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                  카카오 로그인
                </span>
              </button>

              {/* 구글 로그인 박스 - X1000 Y546, 448x56, 모서리 반경 40 */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading !== null}
                className="absolute bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                style={{ 
                  left: '32px', 
                  top: '180px', 
                  width: '448px', 
                  height: '56px', 
                  borderRadius: '40px' 
                }}
              >
                <div className="absolute" style={{ left: '64px' }}>
                  <Image 
                    src="/google_web.png" 
                    alt="Google" 
                    width={36} 
                    height={36}
                    className="object-contain"
                  />
                </div>
                <span className="text-gray-700 text-[20px] font-medium" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                  구글 로그인
                </span>
              </button>

              {/* 네이버 로그인 박스 - X1000 Y626, 448x56, 모서리 반경 40 */}
              <button
                onClick={handleNaverLogin}
                disabled={isLoading !== null}
                className="absolute bg-[#00BF18] hover:bg-[#00A614] transition-colors disabled:opacity-50 flex items-center justify-center"
                style={{ 
                  left: '32px', 
                  top: '260px', 
                  width: '448px', 
                  height: '56px', 
                  borderRadius: '40px' 
                }}
              >
                <div className="absolute" style={{ left: '64px' }}>
                  <Image 
                    src="/naver_web.png" 
                    alt="Naver" 
                    width={36} 
                    height={36}
                    className="object-contain"
                  />
                </div>
                <span className="text-white text-[20px] font-medium" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                  네이버 로그인
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 버전 (768px 미만) - 720x1480 기준 정확한 좌표 */}
      <div className="md:hidden min-h-screen flex justify-center items-center relative">
        {/* 전체 화면 배경 */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/firstpage_app.png')`,
          }}
        />
        
        <div className="relative z-10" style={{ width: '720px', height: '1480px' }}>
          
          {/* 컨텐츠 */}
          <div className="relative z-10 w-full h-full">
            {/* 로고 - 가로 중앙정렬 Y120, 120x120 */}
            <div className="absolute left-1/2 transform -translate-x-1/2" style={{ top: '120px' }}>
              <Image 
                src="/logo_app.png" 
                alt="Hyuge Pick Logo" 
                width={120} 
                height={120}
                className="object-contain"
              />
            </div>
            
            {/* 브랜드 텍스트 - 가로 중앙정렬 Y256, 185x136, Hyuge와 PICK이 다른 줄 */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center" style={{ top: '256px', width: '185px', height: '136px' }}>
              <h1 className="text-white text-[56px] font-light leading-none" style={{ fontFamily: 'Montserrat' }}>
                Hyuge
              </h1>
              <h1 className="text-white text-[56px] font-semibold leading-none" style={{ fontFamily: 'Montserrat' }}>
                PICK
              </h1>
            </div>
            
            {/* 카카오 로그인 - 가로 중앙정렬 Y981, 592x72 */}
            <button
              onClick={handleKakaoLogin}
              disabled={isLoading !== null}
              className="absolute left-1/2 transform -translate-x-1/2 bg-[#FEE500] hover:bg-[#FFD700] transition-colors disabled:opacity-50 flex items-center justify-center"
              style={{ 
                top: '981px', 
                width: '592px', 
                height: '72px', 
                borderRadius: '40px' 
              }}
            >
              <div className="absolute flex items-center" style={{ left: '96px', height: '72px' }}>
                <Image 
                  src="/kakao_app.png" 
                  alt="Kakao" 
                  width={48} 
                  height={48}
                  className="object-contain"
                />
              </div>
              <span className="text-black text-[24px] font-medium" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                카카오 로그인
              </span>
            </button>

            {/* 구글 로그인 - 가로 중앙정렬 Y1085, 592x72 */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading !== null}
              className="absolute left-1/2 transform -translate-x-1/2 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center"
              style={{ 
                top: '1085px', 
                width: '592px', 
                height: '72px', 
                borderRadius: '40px' 
              }}
            >
              <div className="absolute flex items-center" style={{ left: '96px', height: '72px' }}>
                <Image 
                  src="/google_app.png" 
                  alt="Google" 
                  width={48} 
                  height={48}
                  className="object-contain"
                />
              </div>
              <span className="text-gray-700 text-[24px] font-medium" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                구글 로그인
              </span>
            </button>

            {/* 네이버 로그인 - 가로 중앙정렬 Y1189, 592x72 */}
            <button
              onClick={handleNaverLogin}
              disabled={isLoading !== null}
              className="absolute left-1/2 transform -translate-x-1/2 bg-[#00BF18] hover:bg-[#00A614] transition-colors disabled:opacity-50 flex items-center justify-center"
              style={{ 
                top: '1189px', 
                width: '592px', 
                height: '72px', 
                borderRadius: '40px' 
              }}
            >
              <div className="absolute flex items-center" style={{ left: '96px', height: '72px' }}>
                <Image 
                  src="/naver_app.png" 
                  alt="Naver" 
                  width={48} 
                  height={48}
                  className="object-contain"
                />
              </div>
              <span className="text-white text-[24px] font-medium" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                네이버 로그인
              </span>
            </button>

            {/* 애플 로그인 - 가로 중앙정렬 Y1293, 592x72 */}
            <button
              onClick={() => alert('애플 로그인은 준비 중입니다.')}
              disabled={isLoading !== null}
              className="absolute left-1/2 transform -translate-x-1/2 bg-black hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center"
              style={{ 
                top: '1293px', 
                width: '592px', 
                height: '72px', 
                borderRadius: '40px' 
              }}
            >
              <div className="absolute flex items-center" style={{ left: '96px', height: '72px' }}>
                <Image 
                  src="/apple_app.png" 
                  alt="Apple" 
                  width={48} 
                  height={48}
                  className="object-contain"
                />
              </div>
              <span className="text-white text-[24px] font-medium" style={{ fontFamily: 'Noto Sans CJK KR' }}>
                애플 로그인
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}