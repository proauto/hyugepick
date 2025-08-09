'use client';

import { useEffect, useState } from 'react';

export default function KakaoDebugger() {
  const [status, setStatus] = useState<string>('체크 중...');

  useEffect(() => {
    let hasCalledLoad = false;
    
    const checkKakao = () => {
      console.log('=== Kakao Debug ===');
      console.log('window.kakao:', !!window.kakao);
      
      if (window.kakao) {
        console.log('window.kakao.maps:', !!window.kakao.maps);
        
        if (window.kakao.maps) {
          console.log('window.kakao.maps.Map:', !!window.kakao.maps.Map);
          console.log('window.kakao.maps.LatLng:', !!window.kakao.maps.LatLng);
          console.log('window.kakao.maps.Marker:', !!window.kakao.maps.Marker);
          console.log('window.kakao.maps.services:', !!window.kakao.maps.services);
          
          if (window.kakao.maps.services) {
            console.log('window.kakao.maps.services.Geocoder:', !!window.kakao.maps.services.Geocoder);
            setStatus('✅ Kakao Maps 완전히 사용 가능');
          } else if (window.kakao.maps.Map) {
            setStatus('✅ Kakao Maps 기본 기능 사용 가능');
          } else {
            setStatus('⚠️ Kakao Maps 있지만 클래스들 로드 안됨');
            
            // 자동으로 load 호출
            if (!hasCalledLoad) {
              hasCalledLoad = true;
              console.log('Auto calling kakao.maps.load()...');
              window.kakao.maps.load(() => {
                console.log('Maps loaded successfully via auto-call');
                setStatus('✅ Maps 로드 완료!');
              });
            }
          }
        } else {
          setStatus('⚠️ Kakao 객체만 있음, maps 없음');
        }
      } else {
        setStatus('❌ Kakao 객체 없음');
      }
    };

    // 주기적으로 체크
    const interval = setInterval(checkKakao, 1000);
    checkKakao();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
      <h3 className="font-bold text-lg mb-2">Kakao Maps 디버그</h3>
      <p className="text-sm">{status}</p>
      <button 
        onClick={() => {
          console.log('Manual check...');
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              console.log('Maps loaded successfully');
            });
          }
        }}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
      >
        수동 로드 시도
      </button>
    </div>
  );
}