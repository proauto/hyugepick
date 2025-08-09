'use client';

import { useEffect, useState } from 'react';

export default function DebugInfo() {
  const [kakaoStatus, setKakaoStatus] = useState<string>('확인 중...');
  const [consoleLog, setConsoleLog] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 실행되도록 설정
    setIsClient(true);
    
    // 시간 업데이트
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    
    updateTime();
    const timeInterval = setInterval(updateTime, 1000);
    
    // Kakao 상태 확인
    const checkKakao = () => {
      const script = document.querySelector('script[src*="dapi.kakao.com"]');
      
      if (window.kakao) {
        if (window.kakao.maps) {
          if (window.kakao.maps.Map) {
            setKakaoStatus('✅ Kakao Maps 완전히 사용 가능');
          } else {
            setKakaoStatus('⚠️ Kakao Maps 객체만 있음 (Map 클래스 없음)');
          }
        } else {
          setKakaoStatus('⚠️ Kakao 객체는 있지만 maps가 없음');
        }
      } else {
        if (script) {
          setKakaoStatus('🔄 스크립트는 있지만 Kakao 객체 로딩 중...');
        } else {
          setKakaoStatus('❌ Kakao 스크립트 및 객체 없음');
        }
      }
    };

    // 주기적으로 상태 체크
    const interval = setInterval(checkKakao, 1000);
    checkKakao();

    // 콘솔 로그 캐치
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      setConsoleLog(prev => [...prev.slice(-4), `[LOG] ${args.join(' ')}`]);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      setConsoleLog(prev => [...prev.slice(-4), `[ERROR] ${args.join(' ')}`]);
      originalError.apply(console, args);
    };

    return () => {
      clearInterval(timeInterval);
      clearInterval(interval);
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-md z-50">
      <div className="mb-2 font-bold">디버그 정보</div>
      <div className="mb-2">Kakao: {kakaoStatus}</div>
      <div className="space-y-1">
        {consoleLog.map((log, index) => (
          <div key={index} className="font-mono">{log}</div>
        ))}
      </div>
      {isClient && (
        <div className="mt-2 text-gray-400">
          현재 시간: {currentTime}
        </div>
      )}
    </div>
  );
}