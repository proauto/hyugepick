export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              고속도로 휴게소 정보
            </h3>
            <p className="text-sm text-gray-600">
              편리하고 빠른 고속도로 휴게소 정보 서비스
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">서비스</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  휴게소 찾기
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  실시간 정보
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">정보</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  이용안내
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  문의하기
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2024 고속도로 휴게소 정보. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}