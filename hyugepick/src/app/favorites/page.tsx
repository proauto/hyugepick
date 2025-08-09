import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            즐겨찾기
          </h1>
          <p className="text-gray-600 mb-8">
            자주 이용하는 휴게소를 저장해보세요
          </p>
          
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              아직 즐겨찾기가 없습니다
            </h2>
            <p className="text-gray-500">
              휴게소를 검색하고 즐겨찾기에 추가해보세요
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}