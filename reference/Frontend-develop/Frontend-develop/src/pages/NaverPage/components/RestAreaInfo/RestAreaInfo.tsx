import PathInfoContent from '../PathInfo/pathInfoContent'
import RestAreaInfoContent from './restAreaInfoContent'
import { RestSpot, PathInfoType } from '@/types'
import { Loading } from '..'
import { Dispatch, SetStateAction } from 'react'

interface RestAreaInfoProps {
  route: PathInfoType | undefined
  restSpotModalOpen: boolean
  setRestSpotModalOpen: Dispatch<SetStateAction<boolean>>
  hoveredRestSpot: string
  setHoveredRestSpot: Dispatch<SetStateAction<string>>
  clickedRestSpot: string
  setClickedRestSpot: Dispatch<SetStateAction<string>>
  clickedRouteIndex: number
  isActive: boolean
  restSpotList: RestSpot[] | undefined
  isLoading: boolean
  isFetching: boolean
  setSelectedRestArea: (v: number | null) => void
}

const RestAreaInfo = ({
  route,
  setRestSpotModalOpen,
  hoveredRestSpot,
  setHoveredRestSpot,
  clickedRestSpot,
  setClickedRestSpot,
  clickedRouteIndex,
  isActive,
  restSpotList,
  isFetching,
  setSelectedRestArea,
}: RestAreaInfoProps) => {
  const handleOpenDetail = (value: RestSpot) => {
    setSelectedRestArea(value.restAreaId)
  }

  return (
    <div className="flex h-full flex-row">
      <div className="relative box-border flex h-full w-[100%] min-w-[20em] max-w-[28em] flex-col overflow-hidden rounded-2xl bg-white shadow-[2px_0_15px_rgba(0,0,0,0.2)]">
        {route && <PathInfoContent ranking={clickedRouteIndex} route={route} />}
        {isActive && (
          <button
            className="absolute right-4 top-4 z-10 flex h-[40px] w-[40px] items-center justify-center border border-gray-200 bg-white p-1 text-xl text-gray-400 transition-colors hover:text-gray-600"
            onClick={() => setRestSpotModalOpen(false)}
            aria-label="닫기"
            type="button"
          >
            ×
          </button>
        )}
        <p className="border-t border-black/10 px-4 py-3 text-[0.775rem] font-semibold text-black/80">
          <span className="text-crimson text-[0.83rem]">더블 클릭시 </span>
          휴게소 정보 페이지로 이동합니다.
        </p>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-[#f1f1f1] scrollbar-thumb-[#c1c1c1]">
          {isFetching ? (
            <Loading />
          ) : (
            <>
              {restSpotList?.length === 0 ? (
                <p className="border-t border-black/10 px-4 py-3 text-[0.775rem] font-semibold text-black/80">
                  <span className="text-crimson text-[0.83rem]">
                    조회 데이터
                  </span>
                  가 없습니다.
                </p>
              ) : (
                <div>
                  {restSpotList?.map(value => {
                    return (
                      <RestAreaInfoContent
                        key={value.restAreaId}
                        type={value.type}
                        restaurant={value.hasRestaurant}
                        gasStation={value.hasGasStation}
                        chargingStation={value.hasElectricChargingStation}
                        pharmacy={value.hasPharmacy}
                        toilet={value.hasRestroom}
                        name={value.name}
                        routeName={value.routeName}
                        naverMapUrl={value.naverMapUrl}
                        nextRestAreaDistance={value.nextRestAreaDistance}
                        hoveredRestSpot={hoveredRestSpot}
                        setHoveredRestSpot={setHoveredRestSpot}
                        clickedRestSpot={clickedRestSpot}
                        setClickedRestSpot={setClickedRestSpot}
                        restAreaId={value.restAreaId}
                        onDoubleClick={() => handleOpenDetail(value)}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RestAreaInfo
