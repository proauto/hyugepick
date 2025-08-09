'use client';

import { useEffect, useState } from 'react';

export default function AddressCallback() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      console.log('🔥 AddressCallback 페이지 로드됨');
      console.log('🔥 전체 URL:', window.location.href);

      // URL에서 직접 파라미터 추출 (useSearchParams 대신)
      const urlParams = new URLSearchParams(window.location.search);
      
      const params = {
        roadFullAddr: urlParams.get('roadFullAddr') || '',
        roadAddrPart1: urlParams.get('roadAddrPart1') || '',
        addrDetail: urlParams.get('addrDetail') || '',
        roadAddrPart2: urlParams.get('roadAddrPart2') || '',
        engAddr: urlParams.get('engAddr') || '',
        jibunAddr: urlParams.get('jibunAddr') || '',
        zipNo: urlParams.get('zipNo') || '',
        admCd: urlParams.get('admCd') || '',
        rnMgtSn: urlParams.get('rnMgtSn') || '',
        bdMgtSn: urlParams.get('bdMgtSn') || ''
      };
      
      console.log('🔥 URL 파라미터들:', params);

      console.log('🔥 부모 창 확인:', {
        hasOpener: !!window.opener,
        hasCallback: !!(window.opener && window.opener.jusoCallBack),
        roadFullAddr: params.roadFullAddr
      });

      if (params.roadFullAddr) {
        console.log('🔥 주소 정보 있음, 콜백 호출 시도...');
        
        // 부모 창의 콜백 함수 호출
        if (window.opener && window.opener.jusoCallBack) {
          console.log('🔥 콜백 함수 호출 중...', params.roadFullAddr);
          
          window.opener.jusoCallBack(
            params.roadFullAddr,
            params.roadAddrPart1, 
            params.addrDetail,
            params.roadAddrPart2,
            params.engAddr,
            params.jibunAddr,
            params.zipNo,
            params.admCd,
            params.rnMgtSn,
            params.bdMgtSn
          );
          
          console.log('🔥 콜백 호출 완료, 팝업 창 닫기...');
          
          // 팝업 창 닫기
          setTimeout(() => {
            window.close();
          }, 500);
          
        } else {
          console.error('❌ 부모 창의 콜백 함수를 찾을 수 없습니다.');
          console.log('🔥 window.opener:', window.opener);
          if (window.opener) {
            console.log('🔥 window.opener keys:', Object.keys(window.opener));
          }
          
          // 콜백이 없어도 팝업은 닫기
          setTimeout(() => {
            window.close();
          }, 3000);
        }
      } else {
        console.log('🔥 주소 정보 없음 - URL 파라미터 확인 필요');
        
        // 주소 정보가 없어도 팝업은 닫기
        setTimeout(() => {
          window.close();
        }, 3000);
      }
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('🔥 AddressCallback 오류:', error);
      setIsLoading(false);
      
      // 오류 발생시에도 팝업 닫기
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        {isLoading ? (
          <>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">주소 정보를 처리중입니다...</p>
            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
          </>
        ) : (
          <>
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <p className="text-gray-600">주소 정보 처리가 완료되었습니다.</p>
            <p className="text-sm text-gray-500 mt-2">창이 자동으로 닫힙니다.</p>
          </>
        )}
      </div>
    </div>
  );
}