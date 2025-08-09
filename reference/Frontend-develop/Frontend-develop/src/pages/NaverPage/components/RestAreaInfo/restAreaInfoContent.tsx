import { Dispatch, SetStateAction } from 'react'

interface RestAreaInfoContentProps {
  type: string
  restaurant: boolean
  gasStation: boolean
  chargingStation: boolean
  pharmacy: boolean
  toilet: boolean
  name: string
  routeName: string
  naverMapUrl: string
  nextRestAreaDistance: number
  hoveredRestSpot: string
  setHoveredRestSpot: Dispatch<SetStateAction<string>>
  clickedRestSpot: string
  setClickedRestSpot: Dispatch<SetStateAction<string>>
  restAreaId: number
  onDoubleClick?: () => void
}

const RestAreaInfoContent = ({
  type,
  gasStation,
  chargingStation,
  pharmacy,
  toilet,
  name,
  routeName,
  nextRestAreaDistance,
  hoveredRestSpot,
  clickedRestSpot,
  setClickedRestSpot,
  onDoubleClick,
}: RestAreaInfoContentProps) => {
  const trackClickRestSpotArea = () => {
    setClickedRestSpot(name)
    gtag('event', 'rest_spot_area_clicked', {
      method: 'single_click',
      rest_area_name: name,
      route_name: routeName,
      page_location: window.location.href,
    })
  }

  return (
    <div
      className={
        'flex cursor-pointer items-center gap-3 px-4 py-3 transition ' +
        (clickedRestSpot === name
          ? 'bg-pink-100/50'
          : '' +
            (hoveredRestSpot === name ? 'bg-black/2' : 'hover:bg-black/5 '))
      }
      onClick={trackClickRestSpotArea}
      onDoubleClick={onDoubleClick}
    >
      <header className="relative mr-8 flex h-12 w-12 items-center justify-center pb-4">
        <span className="text-2xl font-bold text-gray-800">
          {type === '일반휴게소' && '🅿️'}
          {type === '화물차휴게소' && '🚚'}
          {type === '간이휴게소' && '🏠'}
        </span>
        <span className="absolute left-1/2 top-[70%] w-full -translate-x-1/2 text-center text-[0.525rem] font-bold text-black">
          {type}
        </span>
      </header>
      <section className="-ml-4 flex h-12 w-full flex-1 flex-row items-center justify-between">
        <div className="flex flex-col gap-1 text-[0.9rem] font-bold text-black/80">
          <span className="">
            {name} - {routeName}
          </span>
          <span className="text-[0.85rem] text-[#666]">{`다음 휴게소 간 거리: ${nextRestAreaDistance} km`}</span>
        </div>
        <aside className="ml-2 flex">
          {gasStation && (
            <span className="relative ml-2 flex h-6 w-6 items-center justify-center rounded-full border border-black/20 text-[0.75rem] font-semibold text-gray-700">
              ⛽
            </span>
          )}
          {pharmacy && (
            <span className="relative ml-2 flex h-6 w-6 items-center justify-center rounded-full border border-black/20 text-[0.75rem] font-semibold text-gray-700">
              💊
            </span>
          )}
          {toilet && (
            <span className="relative ml-2 flex h-6 w-6 items-center justify-center rounded-full border border-black/20 text-[0.75rem] font-semibold text-gray-700">
              🚻
            </span>
          )}
          {chargingStation && (
            <span className="relative ml-2 flex h-6 w-6 items-center justify-center rounded-full border border-black/20 text-[0.75rem] font-semibold text-gray-700">
              ⚡
            </span>
          )}
        </aside>
      </section>
    </div>
  )
}

export default RestAreaInfoContent
