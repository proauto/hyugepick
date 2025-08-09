'use client';

import { useState } from 'react';
import { Coordinates } from '@/types/map';

interface RestAreaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  restAreaId?: string;
  restAreaName?: string;
  coordinates?: Coordinates;
}

interface ReportData {
  reportType: string;
  description: string;
  newName?: string;
  newCoordinates?: Coordinates;
  newFacilities?: string[];
  removedFacilities?: string[];
}

export default function RestAreaReportModal({
  isOpen,
  onClose,
  restAreaId,
  restAreaName,
  coordinates
}: RestAreaReportModalProps) {
  const [reportData, setReportData] = useState<ReportData>({
    reportType: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    reportId?: string;
  } | null>(null);

  const reportTypes = [
    { value: 'missing_rest_area', label: '누락된 휴게소 신고', needsCoordinates: true },
    { value: 'wrong_location', label: '위치 정보 오류', needsCoordinates: true },
    { value: 'wrong_name', label: '휴게소명 오류' },
    { value: 'wrong_info', label: '기타 정보 오류' },
    { value: 'closed_permanently', label: '영구 폐점' },
    { value: 'temporarily_closed', label: '임시 휴업' },
    { value: 'new_facility', label: '새로운 편의시설 추가' },
    { value: 'removed_facility', label: '편의시설 제거' }
  ];

  const facilities = [
    '주유소', 'LPG충전소', '전기충전소', '편의점', '음식점', 'ATM', 
    '약국', '세차장', '수유실', '장애인편의시설', '반려동물휴게시설'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportData.reportType) {
      alert('제보 유형을 선택해주세요.');
      return;
    }

    if (!reportData.description.trim()) {
      alert('상세 설명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const payload = {
        reportType: reportData.reportType,
        restAreaId: restAreaId,
        reportedData: {
          description: reportData.description,
          newName: reportData.newName,
          newFacilities: reportData.newFacilities,
          removedFacilities: reportData.removedFacilities,
          existingRestAreaName: restAreaName
        },
        coordinates: reportData.newCoordinates || coordinates
      };

      const response = await fetch('/api/rest-areas/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        setSubmitResult({
          success: true,
          message: result.message,
          reportId: result.reportId
        });
        
        // 폼 초기화
        setReportData({
          reportType: '',
          description: ''
        });
      } else {
        setSubmitResult({
          success: false,
          message: result.error || '제보 제출에 실패했습니다.'
        });
      }

    } catch (error) {
      setSubmitResult({
        success: false,
        message: '네트워크 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReportType = reportTypes.find(type => type.value === reportData.reportType);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">휴게소 정보 제보</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {restAreaName && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>대상 휴게소:</strong> {restAreaName}
              </p>
            </div>
          )}

          {submitResult ? (
            <div className={`p-4 rounded-lg mb-4 ${
              submitResult.success 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <p className="font-medium">
                {submitResult.success ? '✅ 제보 완료' : '❌ 제보 실패'}
              </p>
              <p className="text-sm mt-1">{submitResult.message}</p>
              {submitResult.reportId && (
                <p className="text-xs mt-2">
                  제보 번호: {submitResult.reportId.substring(0, 8)}...
                </p>
              )}
              {submitResult.success && (
                <button
                  onClick={onClose}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  확인
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 제보 유형 선택 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  제보 유형 *
                </label>
                <select
                  value={reportData.reportType}
                  onChange={(e) => setReportData({
                    ...reportData,
                    reportType: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">선택해주세요</option>
                  {reportTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 휴게소명 수정 (wrong_name인 경우) */}
              {reportData.reportType === 'wrong_name' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    올바른 휴게소명
                  </label>
                  <input
                    type="text"
                    value={reportData.newName || ''}
                    onChange={(e) => setReportData({
                      ...reportData,
                      newName: e.target.value
                    })}
                    placeholder="정확한 휴게소명을 입력하세요"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* 좌표 입력 (필요한 경우) */}
              {selectedReportType?.needsCoordinates && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      위도 *
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={reportData.newCoordinates?.lat || coordinates?.lat || ''}
                      onChange={(e) => setReportData({
                        ...reportData,
                        newCoordinates: {
                          lat: parseFloat(e.target.value) || 0,
                          lng: reportData.newCoordinates?.lng || coordinates?.lng || 0
                        }
                      })}
                      placeholder="37.123456"
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      경도 *
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={reportData.newCoordinates?.lng || coordinates?.lng || ''}
                      onChange={(e) => setReportData({
                        ...reportData,
                        newCoordinates: {
                          lat: reportData.newCoordinates?.lat || coordinates?.lat || 0,
                          lng: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="127.123456"
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 편의시설 선택 */}
              {reportData.reportType === 'new_facility' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    추가된 편의시설
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {facilities.map(facility => (
                      <label key={facility} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportData.newFacilities?.includes(facility) || false}
                          onChange={(e) => {
                            const currentFacilities = reportData.newFacilities || [];
                            if (e.target.checked) {
                              setReportData({
                                ...reportData,
                                newFacilities: [...currentFacilities, facility]
                              });
                            } else {
                              setReportData({
                                ...reportData,
                                newFacilities: currentFacilities.filter(f => f !== facility)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{facility}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {reportData.reportType === 'removed_facility' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    제거된 편의시설
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {facilities.map(facility => (
                      <label key={facility} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportData.removedFacilities?.includes(facility) || false}
                          onChange={(e) => {
                            const currentFacilities = reportData.removedFacilities || [];
                            if (e.target.checked) {
                              setReportData({
                                ...reportData,
                                removedFacilities: [...currentFacilities, facility]
                              });
                            } else {
                              setReportData({
                                ...reportData,
                                removedFacilities: currentFacilities.filter(f => f !== facility)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{facility}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 상세 설명 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  상세 설명 *
                </label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData({
                    ...reportData,
                    description: e.target.value
                  })}
                  placeholder="구체적인 내용을 작성해주세요. (예: 휴게소 위치, 변경된 사항, 확인한 날짜 등)"
                  rows={4}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  정확한 정보 제공을 위해 가능한 한 자세히 작성해주세요.
                </p>
              </div>

              {/* 제출 버튼 */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded text-white font-medium ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? '제출 중...' : '제보하기'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
            <p>• 제보해주신 내용은 검토 후 1-3일 내에 반영됩니다.</p>
            <p>• 허위 정보 제보시 서비스 이용에 제한이 있을 수 있습니다.</p>
            <p>• 개인정보는 수집하지 않으며, IP 주소는 스팸 방지용으로만 사용됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}