(function() {
  // Kakao Maps API 로더
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=70584fcb3fd421abefaaa5391a8831f0&libraries=services,clusterer&autoload=false';
  script.onload = function() {
    console.log('Kakao Maps script loaded');
    window.kakaoMapsLoaded = true;
  };
  script.onerror = function() {
    console.error('Failed to load Kakao Maps script');
    window.kakaoMapsError = true;
  };
  document.head.appendChild(script);
})();