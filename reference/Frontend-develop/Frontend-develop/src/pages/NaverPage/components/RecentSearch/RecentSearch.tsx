import { Place, RouteHistory } from '@/types'
import { Dispatch, SetStateAction } from 'react'

interface RecentSearchProps {
  startPlace: Place | null
  goalPlace: Place | null
  setStartPlace: Dispatch<SetStateAction<Place | null>>
  setGoalPlace: Dispatch<SetStateAction<Place | null>>
  routeHistory: RouteHistory[]
  placeHistory: Place[]
  clearHistory: (type: string) => void
  setSelectedRouteHistory: Dispatch<SetStateAction<RouteHistory | undefined>>
  handleClickRecentSearch: () => void
  setClickedPlaceHistory: Dispatch<SetStateAction<boolean>>
}

const RecentSearch = ({
  startPlace,
  goalPlace,
  setStartPlace,
  setGoalPlace,
  clearHistory,
  routeHistory,
  placeHistory,
  setSelectedRouteHistory,
  handleClickRecentSearch,
  setClickedPlaceHistory,
}: RecentSearchProps) => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white px-6">
      <div className="mt-2 flex flex-row justify-between border-b border-black/10 pb-2 pl-2 text-[0.8em] font-semibold">
        <p>최근 검색한 장소</p>
        <span
          className="text-crimson hover:text-shadow -mr-[10px] flex cursor-pointer items-center justify-center px-[10px] text-[0.7em]"
          onClick={() => clearHistory('place')}
        >
          검색 기록 삭제
        </span>
      </div>
      <div className="place-list my-1 max-h-[150px] overflow-y-auto rounded-md pr-2 text-[0.8em] font-semibold text-[#333] scrollbar-thin scrollbar-track-[#f8fbff] scrollbar-thumb-[#b3c6e2]">
        {placeHistory.length > 0 ? (
          placeHistory
            .slice()
            .reverse()
            .map((place, index) => (
              <p
                key={`${place.name}-${place.lat}-${place.lng}-${index}`}
                className="text-shadow hover:text-shadow-blue mx-[0.6em] my-4 flex cursor-pointer items-center text-[1.1em] font-medium leading-[1.1em] tracking-[-0.05em] hover:text-blue-500"
                onClick={() => {
                  setClickedPlaceHistory(true)
                  if (startPlace == null) setStartPlace(place)
                  else if (goalPlace == null) setGoalPlace(place)
                }}
              >
                <i className="fas fa-map-marker-alt mr-2 text-[1em] font-semibold text-[#333]/50" />
                {place.name}
              </p>
            ))
        ) : (
          <span className="text-shadow mx-[0.6em] my-4 text-[1.1em] font-medium leading-[1.1em] tracking-[-0.05em]">
            검색 기록이 없습니다.
          </span>
        )}
      </div>

      <div className="mt-8 flex flex-row justify-between border-b border-black/10 pb-2 pl-2 text-[0.8em] font-semibold">
        <p>최근 검색한 경로</p>
        <span
          className="text-crimson hover:text-shadow -mr-[10px] flex cursor-pointer items-center justify-center px-[10px] text-[0.7em]"
          onClick={() => clearHistory('route')}
        >
          검색 기록 삭제
        </span>
      </div>
      <div className="route-list my-1 max-h-[150px] overflow-y-auto rounded-md pr-2 text-[0.8em] font-semibold text-[#333] scrollbar-thin scrollbar-track-[#f8fbff] scrollbar-thumb-[#b3c6e2]">
        {routeHistory.length > 0 ? (
          routeHistory
            .slice()
            .reverse()
            .map(routeHistory => (
              <p
                key={routeHistory.searchId}
                className="text-shadow hover:text-shadow-blue mx-[0.6em] my-4 flex cursor-pointer items-center text-[1.1em] font-medium leading-[1.1em] tracking-[-0.05em] hover:text-blue-500"
                onClick={() => {
                  setSelectedRouteHistory(routeHistory)
                  handleClickRecentSearch()
                }}
              >
                <i className="fas fa-car mr-2 text-[1em] font-semibold text-[#333]/50" />
                {routeHistory.name}
              </p>
            ))
        ) : (
          <span className="text-shadow mx-[0.6em] my-4 text-[1.1em] font-medium leading-[1.1em] tracking-[-0.05em]">
            검색 기록이 없습니다.
          </span>
        )}
      </div>
    </div>
  )
}
export default RecentSearch
