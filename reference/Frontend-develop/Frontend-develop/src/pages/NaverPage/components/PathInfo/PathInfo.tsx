import PathInfoContent from './pathInfoContent'
import { Dispatch, SetStateAction } from 'react'
import { Route, Place } from '@/types'
import { Loading } from '../'

interface PathInfoProps {
  routeList: Route[]
  setRouteList: Dispatch<SetStateAction<Route[] | undefined>>
  selectedRoute: Route | undefined
  setSelectedRoute: Dispatch<SetStateAction<Route | undefined>>
  clickedRouteIndex: number
  setClickedRouteIndex: Dispatch<SetStateAction<number>>
  startPlace: Place | null
  goalPlace: Place | null
  clickedMorePath: boolean
  setClickedMorePath: Dispatch<SetStateAction<boolean>>
  setRestSpotModalOpen: Dispatch<SetStateAction<boolean>>
  setClickedRestSpot: Dispatch<SetStateAction<string>>
}

const PathInfo = ({
  routeList,
  // setRouteList,
  setSelectedRoute,
  clickedRouteIndex,
  setClickedRouteIndex,
  startPlace,
  goalPlace,
  clickedMorePath,
  // setClickedMorePath,
  setRestSpotModalOpen,
  setClickedRestSpot,
}: PathInfoProps) => {
  // const { refetch: routesRefetch, isLoading: isGetRoutesLoading } =
  //   useGetRoutes({
  //     start: [startPlace?.lng, startPlace?.lat].join(','),
  //     goal: [goalPlace?.lng, goalPlace?.lat].join(','),
  //     page: '2',
  //   })

  // const handleClickMorePathData = () => {
  //   routesRefetch().then(
  //     routes => routes.data && setRouteList([...routeList, ...routes.data]),
  //   )
  //   setClickedMorePath(true)
  // }

  const handleClick = (route: Route, index: number) => {
    setClickedRouteIndex(index)
    setSelectedRoute(route)
  }

  const trackRouteSelection = (index: number) => {
    gtag('event', `route_selected${index}`, {
      method: 'button_click',
      page_location: window.location.href,
    })
  }

  console.log(``)

  return (
    <div className="box-border flex h-full flex-col overflow-y-auto">
      <p className="border-b border-t border-black/10 px-4 py-3 text-[0.775rem] font-semibold tracking-[-0.1em] text-black/80">
        <span className="text-crimson text-shadow-sm text-[0.83rem]">
          더블 클릭시
        </span>{' '}
        경로상 휴게소 정보가 표시됩니다.
      </p>
      <div className="box-border flex-grow overflow-y-auto scrollbar-none">
        {routeList?.map((route, index) => {
          return (
            <div
              key={route.routeId}
              onClick={() => {
                handleClick(route, index + 1)
                setRestSpotModalOpen(true)
                setClickedRestSpot('')
                trackRouteSelection(index + 1)
              }}
            >
              <PathInfoContent
                ranking={index + 1}
                route={route}
                clickedId={clickedRouteIndex}
              />
              <hr />
            </div>
          )
        })}

        {clickedMorePath ? (
          <Loading className="bottom" />
        ) : (
          // <div
          //   className={`moreBtn  ${clickedMorePath && 'hidden'}`}
          //   onClick={handleClickMorePathData}
          // >
          //   더보기
          // </div>
          <></>
        )}
      </div>
      <p className="border-b border-t border-black/10 px-4 py-3 text-[0.775rem] font-semibold tracking-[-0.1em] text-black/80">
        {startPlace?.name} {`->`} {goalPlace?.name}
      </p>
    </div>
  )
}

export default PathInfo
