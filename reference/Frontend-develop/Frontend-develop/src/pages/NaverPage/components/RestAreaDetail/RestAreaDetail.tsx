import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaCarSide,
  FaClock,
  FaUtensils,
  FaParking,
  FaChevronRight,
} from 'react-icons/fa'
import useGetDetailRestSpots from '@/apis/hooks/useGetDetailRestSpots'
import noRestarea from '@/assets/no-restarea.png'

interface Props {
  restAreaId: number
  onClose: () => void
}

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) => (
  <div className="flex items-center gap-2 text-sm text-gray-700">
    <span className="text-blue-500">{icon}</span>
    <span className="w-20 shrink-0 font-medium">{label}</span>
    <span className="truncate">{value}</span>
  </div>
)

const RestAreaDetail = ({ restAreaId, onClose }: Props) => {
  const {
    data: detail,
    isLoading,
    isError,
  } = useGetDetailRestSpots({ restAreaId })

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">로딩중...</div>
    )
  if (isError || !detail)
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        데이터를 불러올 수 없습니다.
      </div>
    )

  return (
    <div className="relative flex w-full max-w-[420px] flex-col gap-4 overflow-hidden rounded-xl bg-white p-[10px]">
      {/* X 버튼 */}
      <button
        className="absolute right-4 top-4 z-10 flex h-[30px] w-[30px] items-center justify-center border border-gray-200 bg-white p-1 text-xl text-gray-400 transition-colors hover:text-gray-600"
        onClick={onClose}
        aria-label="닫기"
        type="button"
      >
        ×
      </button>
      {/* 대표 이미지 16:9 + 오버레이 */}
      <div className="flex flex-col gap-2 pb-2">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
          <img
            src={detail.mainImage ? detail.mainImage : noRestarea}
            alt="휴게소 이미지 16:9"
            className="h-full w-full rounded-xl object-cover"
          />
          <div className="absolute left-0 top-0 flex h-full w-full flex-col justify-end gap-2 rounded-xl bg-gradient-to-t from-black/60 to-transparent p-4">
            <div className="flex items-center gap-2 text-lg font-bold text-white drop-shadow">
              <FaMapMarkerAlt className="inline-block text-pink-300" />
              {detail.name}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-white drop-shadow">
              {detail.routeName} <span className="opacity-60">|</span>{' '}
              {detail.routeDirection} <span className="opacity-60">|</span>{' '}
              {detail.type}
            </div>
          </div>
        </div>
      </div>
      {/* 주요 정보 */}
      <div className="flex flex-col gap-4 border-b border-gray-200 px-1 py-2">
        <InfoRow
          icon={<FaClock />}
          label="운영시간"
          value={`${detail.operatingStartTime} ~ ${detail.operatingEndTime}`}
        />
        <InfoRow
          icon={<FaParking />}
          label="주차면"
          value={detail.parkingSpaceCount}
        />
        <InfoRow
          icon={<FaUtensils />}
          label="대표음식"
          value={detail.representativeFood || '-'}
        />
        <InfoRow
          icon={<FaPhoneAlt />}
          label="전화번호"
          value={detail.phoneNumber}
        />
      </div>
      {/* 주유소/충전소 정보 */}
      {detail.hasFuelData && (
        <div className="flex flex-col gap-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-center gap-2 pb-1 text-[17px] font-semibold text-blue-700">
            <FaCarSide /> 주유소/충전소 가격
            <span className="ml-2 text-xs font-normal text-gray-400">
              업데이트:{' '}
              {detail.lastFuelUpdateDate
                ? detail.lastFuelUpdateDate.slice(0, 10)
                : new Date().toISOString().slice(0, 10)}
            </span>
          </div>
          <table className="w-full border-separate border-spacing-0 text-[15px]">
            <thead>
              <tr className="bg-blue-100">
                <th className="px-2.5 py-1.5 text-left font-semibold">유종</th>
                <th className="px-2.5 py-1.5 text-left font-semibold">
                  가격 (원)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2.5 py-1.5">휘발유</td>
                <td className="px-2.5 py-1.5">{detail.gasolinePrice}</td>
              </tr>
              <tr>
                <td className="px-2.5 py-1.5">경유</td>
                <td className="px-2.5 py-1.5">{detail.dieselPrice}</td>
              </tr>
              <tr>
                <td className="px-2.5 py-1.5">LPG</td>
                <td className="px-2.5 py-1.5">{detail.lpgPrice}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {/* 기타 정보/링크 */}
      <div className="flex flex-col gap-4 px-1 pt-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FaChevronRight className="text-gray-400" />
          <a
            href={detail.naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline hover:text-blue-800"
          >
            네이버지도에서 보기
          </a>
        </div>
        {detail.otherFacilities && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaChevronRight className="text-gray-400" />
            <span>기타: {detail.otherFacilities}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default RestAreaDetail
