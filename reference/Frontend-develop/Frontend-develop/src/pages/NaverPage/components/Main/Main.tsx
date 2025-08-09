import { NaverMap } from '@/components'
import {
  InputSubmit,
  Title,
  PathInfo,
  RecentSearch,
  RestAreaInfo,
  Loading,
  RestAreaDetail,
} from '../'
import { useState, useEffect, useMemo } from 'react'
import { Place, Route, RouteHistory } from '@/types'
import { useGetRoutes, useGetRestSpots } from '@/apis/hooks'
import useGetRoutesBySearchId from '@/apis/hooks/useGetRoutesBySearchId.ts'
import Notice from '../Notice/Notice'

const Main = () => {
  const [startPlace, setStartPlace] = useState<Place | null>(null)
  const [goalPlace, setGoalPlace] = useState<Place | null>(null)
  const [routeList, setRouteList] = useState<Route[]>()
  const [selectedRoute, setSelectedRoute] = useState<Route>()
  const [selectedRouteHistory, setSelectedRouteHistory] = useState<
    RouteHistory | undefined
  >()
  const [clickedRouteIndex, setClickedRouteIndex] = useState<number>(0)
  const [clickedMorePath, setClickedMorePath] = useState<boolean>(false)
  const [hasStartAndGoal, setHasStartAndGoal] = useState<boolean>(true)
  const [restSpotModalOpen, setRestSpotModalOpen] = useState<boolean>(false)
  const [showRouteList, setShowRouteList] = useState<boolean>(false)
  const [hoveredRestSpot, setHoveredRestSpot] = useState<string>('')
  const [clickedRestSpot, setClickedRestSpot] = useState<string>('')
  const [routeHistory, setRouteHistory] = useState<RouteHistory[]>([])
  const [placeHistory, setPlaceHistory] = useState<Place[]>([])
  const [clickedPlaceHistory, setClickedPlaceHistory] = useState<boolean>(false)
  const [selectedRestArea, setSelectedRestArea] = useState<any | null>(null)
  const [mapRef, setMapRef] = useState<React.RefObject<naver.maps.Map> | null>(
    null,
  )

  // navWidthPx 계산 (px 단위)
  const navWidthPx = useMemo(() => {
    if (typeof window === 'undefined') return 0
    const fontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

    return 25.5 * fontSize
  }, [])

  // 지도 이동 함수
  const moveToLocation = (lat: number, lng: number, zoom: number = 16) => {
    if (mapRef?.current) {
      mapRef.current.setCenter(new naver.maps.LatLng(lat, lng))
      mapRef.current.setZoom(zoom)
    }
  }

  // 지도 준비 완료 시 mapRef 저장
  const handleMapReady = (mapRef: React.RefObject<naver.maps.Map>) => {
    setMapRef(mapRef)
  }

  const {
    data: restSpotList,
    isLoading: restSpotsLoading,
    isFetching: restSpotsFetching,
  } = useGetRestSpots({
    routeId: selectedRoute?.routeId,
  })

  const { refetch: routesRefetch, isLoading: isGetRoutesLoading } =
    useGetRoutes({
      start: [startPlace?.lng, startPlace?.lat].join(','),
      goal: [goalPlace?.lng, goalPlace?.lat].join(','),
      startName: startPlace?.name,
      goalName: goalPlace?.name,
      page: '1',
    })
  const { refetch: routesBySearchIdRefetch } = useGetRoutesBySearchId({
    searchId: selectedRouteHistory?.searchId,
  })

  const handleClickSearchRoutes = async () => {
    if (startPlace && goalPlace) {
      const routes = await routesRefetch()

      setShowRouteList(true)
      setClickedMorePath(false)
      setRouteList(routes.data)
      routes.data && setSelectedRoute(routes.data[0])

      const name = startPlace?.name + ' -> ' + goalPlace?.name
      const searchId = routes.data ? routes.data[0].searchId : 0
      addRouteHistory({ name, searchId, startPlace, goalPlace })
      setHasStartAndGoal(true)
      setClickedPlaceHistory(false)
      setClickedRestSpot('')
    } else {
      setHasStartAndGoal(false)
    }
  }

  const handleClickRecentSearch = async () => {
    if (selectedRouteHistory != null && selectedRouteHistory.searchId > 0) {
      const routes = await routesBySearchIdRefetch()

      setShowRouteList(true)
      setClickedMorePath(false)
      setRouteList(routes.data)
      routes.data && setSelectedRoute(routes.data[0])
      setStartPlace(selectedRouteHistory.startPlace)
      setGoalPlace(selectedRouteHistory.goalPlace)
    }
  }

  const addRouteHistory = (routeHistoryItem: RouteHistory) => {
    const history: RouteHistory[] = JSON.parse(
      localStorage.getItem('route') || '[]',
    )
    if (history.length >= 5) history.shift()

    history.push(routeHistoryItem)
    localStorage.setItem('route', JSON.stringify(history))
    setRouteHistory(history)
  }

  const addPlaceHistory = (place: Place) => {
    const history: Place[] = JSON.parse(localStorage.getItem('place') || '[]')
    if (history.length >= 5) history.shift()

    history.push(place)
    localStorage.setItem('place', JSON.stringify(history))
    setPlaceHistory(history)
  }

  const clearHistory = (type: string) => {
    if (type) {
      localStorage.removeItem(type)
      if (type === 'route') setRouteHistory([])
      if (type === 'place') setPlaceHistory([])
    }
  }

  useEffect(() => {
    setPlaceHistory(JSON.parse(localStorage.getItem('place') || '[]'))
    setRouteHistory(JSON.parse(localStorage.getItem('route') || '[]'))
  }, [])

  // 최근 검색한 경로 클릭 이벤트 처리
  useEffect(() => {
    handleClickRecentSearch()
  }, [selectedRouteHistory])

  // 최근 검색한 장소 클릭 이벤트 처리
  useEffect(() => {
    if (startPlace && goalPlace && clickedPlaceHistory) {
      handleClickSearchRoutes()
    }
  }, [startPlace, goalPlace, clickedPlaceHistory])

  // PathInfo가 보일 때 항상 첫 번째 경로가 클릭되게
  useEffect(() => {
    if (routeList && showRouteList && routeList.length > 0) {
      setClickedRouteIndex(1)
      setSelectedRoute(routeList[0])
      setRestSpotModalOpen(true)
    }
  }, [routeList, showRouteList])

  // selectedRoute가 바뀌면 상세패널 닫기
  useEffect(() => {
    setSelectedRestArea(null)
  }, [selectedRoute])

  return (
    <div className="box-border flex h-screen overflow-x-hidden">
      <div className="z-10 flex w-[25.5em] min-w-[25.5em] flex-col transition-[width] duration-300">
        <div className="box-border flex h-screen w-full flex-col overflow-hidden bg-white shadow-[2px_0_15px_rgba(0,0,0,0.2)]">
          <Title />
          <InputSubmit
            startPlace={startPlace}
            setStartPlace={setStartPlace}
            goalPlace={goalPlace}
            setGoalPlace={setGoalPlace}
            setRouteList={setRouteList}
            handleClickSearchRoutes={handleClickSearchRoutes}
            setRestSpotModalOpen={setRestSpotModalOpen}
            hasStartAndGoal={hasStartAndGoal}
            setShowRouteList={setShowRouteList}
            showRouteList={showRouteList}
            addPlaceHistory={addPlaceHistory}
            moveToLocation={moveToLocation}
          />
          {/* 공지사항은 PathInfo가 아닐 때만 노출 */}
          {!(routeList && showRouteList) && <Notice />}
          {isGetRoutesLoading ? (
            <Loading />
          ) : (
            <>
              {routeList && showRouteList ? (
                <PathInfo
                  routeList={routeList}
                  setRouteList={setRouteList}
                  selectedRoute={selectedRoute}
                  setSelectedRoute={setSelectedRoute}
                  clickedRouteIndex={clickedRouteIndex}
                  setClickedRouteIndex={setClickedRouteIndex}
                  startPlace={startPlace}
                  goalPlace={goalPlace}
                  clickedMorePath={clickedMorePath}
                  setClickedMorePath={setClickedMorePath}
                  setRestSpotModalOpen={setRestSpotModalOpen}
                  setClickedRestSpot={setClickedRestSpot}
                />
              ) : (
                <RecentSearch
                  startPlace={startPlace}
                  goalPlace={goalPlace}
                  setStartPlace={setStartPlace}
                  setGoalPlace={setGoalPlace}
                  routeHistory={routeHistory}
                  placeHistory={placeHistory}
                  clearHistory={clearHistory}
                  setSelectedRouteHistory={setSelectedRouteHistory}
                  handleClickRecentSearch={handleClickRecentSearch}
                  setClickedPlaceHistory={setClickedPlaceHistory}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="box-border h-screen flex-grow overflow-x-hidden">
        <NaverMap
          start={startPlace}
          goal={goalPlace}
          routeList={routeList}
          selectedRoute={selectedRoute}
          setSelectedRoute={setSelectedRoute}
          restSpotList={routeList && showRouteList ? restSpotList : undefined}
          restSpotModalOpen={restSpotModalOpen}
          setHoveredRestSpot={setHoveredRestSpot}
          setClickedRestSpot={setClickedRestSpot}
          clickedRestSpot={clickedRestSpot}
          onMapReady={handleMapReady}
        />
      </div>
      {/* RestAreaInfo와 RestAreaDetail을 flex row로 나란히 */}
      {selectedRoute && restSpotModalOpen && (
        <>
          <div
            className="fixed z-30 flex h-[100%] w-[28em] scale-90 flex-col backdrop-blur transition-[left,transform] duration-300 max-md:w-[72vw]"
            style={{ left: navWidthPx, top: 0 }}
          >
            <RestAreaInfo
              isActive={true}
              route={selectedRoute}
              restSpotModalOpen={restSpotModalOpen}
              setRestSpotModalOpen={setRestSpotModalOpen}
              hoveredRestSpot={hoveredRestSpot}
              setHoveredRestSpot={setHoveredRestSpot}
              clickedRestSpot={clickedRestSpot}
              setClickedRestSpot={setClickedRestSpot}
              clickedRouteIndex={clickedRouteIndex}
              restSpotList={restSpotList}
              isLoading={restSpotsLoading}
              isFetching={restSpotsFetching}
              setSelectedRestArea={setSelectedRestArea}
            />
          </div>
          {selectedRestArea && (
            <div
              className="fixed z-40 flex h-[100%] w-[28em] scale-90 flex-col transition-[left,transform] duration-300"
              style={{ left: `calc(${navWidthPx}px + 27em)`, top: 0 }}
            >
              <RestAreaDetail
                restAreaId={selectedRestArea}
                onClose={() => setSelectedRestArea(null)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Main
