import {
  Container as MapDiv,
  NaverMap,
  useNavermaps,
  Polyline,
} from 'react-naver-maps'
import { useEffect, Dispatch, SetStateAction, useRef, useState } from 'react'
import { CustomMarker, RestSpotMarker } from '@/components'
import { Place, Route, RestSpot } from '@/types'
import InfoWindow from './InfoWindow'
import ReactDOMServer from 'react-dom/server'

interface NaverProps {
  start?: Place | null
  goal?: Place | null
  waypoints?: Place[]
  routeList?: Route[]
  selectedRoute?: Route
  setSelectedRoute: Dispatch<SetStateAction<Route | undefined>>
  restSpotList?: RestSpot[]
  restSpotModalOpen: boolean
  setHoveredRestSpot: Dispatch<SetStateAction<string>>
  setClickedRestSpot: Dispatch<SetStateAction<string>>
  clickedRestSpot: string
  onMapReady?: (mapRef: React.RefObject<naver.maps.Map>) => void
}

const Naver = ({
  start,
  goal,
  waypoints,
  routeList,
  selectedRoute,
  setSelectedRoute,
  restSpotList,
  setClickedRestSpot,
  clickedRestSpot,
  onMapReady,
}: NaverProps) => {
  const navermaps = useNavermaps()
  const mapRef = useRef<naver.maps.Map>(null)
  const [hoveredRestSpot, setHoveredRestSpotState] = useState<string>('')
  const [infoWindow, setInfoWindow] = useState<naver.maps.InfoWindow | null>(
    null,
  )

  useEffect(() => {
    if (mapRef.current && onMapReady) {
      onMapReady(mapRef)
    }
  }, [mapRef.current, onMapReady])

  useEffect(() => {
    start &&
      mapRef.current?.setCenter(
        new naver.maps.LatLng(parseFloat(start.lat), parseFloat(start.lng)),
      )
  }, [start, mapRef])

  useEffect(() => {
    goal &&
      mapRef.current?.setCenter(
        new naver.maps.LatLng(parseFloat(goal.lat), parseFloat(goal.lng)),
      )
  }, [goal, mapRef])

  useEffect(() => {
    if (selectedRoute) {
      mapRef.current?.setZoom(8)
      mapRef.current?.setCenter(new naver.maps.LatLng(36.5, 127.9))
    }
  }, [selectedRoute])

  const handleClickRoute = (routeOption: string) => {
    setSelectedRoute(
      routeList?.find(route => route.routeOption === routeOption),
    )
  }

  const handleEnterRestSpotMarker = (spot: RestSpot) => {
    setHoveredRestSpotState(spot.name)
  }

  const handleLeaveRestSpotMarker = () => {
    setHoveredRestSpotState('')
  }

  // InfoWindow 네이티브로 관리
  useEffect(() => {
    if (!mapRef.current) return
    if (!restSpotList) return
    if (hoveredRestSpot) {
      const spot = restSpotList.find(s => s.name === hoveredRestSpot)
      if (spot) {
        // 기존 InfoWindow 제거
        if (infoWindow) infoWindow.setMap(null)
        const iw = new navermaps.InfoWindow({
          content: ReactDOMServer.renderToString(
            <InfoWindow name={spot.name} />,
          ),
          position: new navermaps.LatLng(spot.lat, spot.lng),
          pixelOffset: new navermaps.Point(0, -24), // was -40, move closer to marker
          backgroundColor: 'transparent', // Remove default
          borderColor: 'transparent',
          borderWidth: 0,
          disableAnchor: true,
        })
        iw.setMap(mapRef.current)
        setInfoWindow(iw)
      }
    } else {
      if (infoWindow) {
        infoWindow.setMap(null)
        setInfoWindow(null)
      }
    }

    return () => {
      if (infoWindow) {
        infoWindow.setMap(null)
        setInfoWindow(null)
      }
    }
  }, [hoveredRestSpot, restSpotList])

  return (
    <MapDiv style={{ width: '100%', height: '100dvh' }}>
      <NaverMap
        defaultCenter={new navermaps.LatLng(37.3595704, 127.105399)}
        defaultZoom={12}
        ref={mapRef}
      >
        {start && (
          <CustomMarker
            position={{
              lat: parseFloat(start.lat),
              lng: parseFloat(start.lng),
            }}
            type="start"
          />
        )}
        {goal && (
          <CustomMarker
            position={{
              lat: parseFloat(goal.lat),
              lng: parseFloat(goal.lng),
            }}
            type="goal"
          />
        )}
        {waypoints &&
          waypoints.map((waypoint, idx) => {
            return (
              <CustomMarker
                position={{
                  lat: parseFloat(waypoint.lat),
                  lng: parseFloat(waypoint.lng),
                }}
                type="waypoints"
                key={idx}
                waypointsIndex={idx + 1}
              />
            )
          })}
        {restSpotList &&
          restSpotList.map(spot => {
            return (
              <div key={spot.restAreaId}>
                <RestSpotMarker
                  position={{
                    lat: spot.lat,
                    lng: spot.lng,
                  }}
                  onClick={() => setClickedRestSpot(spot.name)}
                  onDoubleClick={() => window.open(spot.naverMapUrl, '_blank')}
                  onMouseEnter={() => handleEnterRestSpotMarker(spot)}
                  onMouseLeave={handleLeaveRestSpotMarker}
                  clicked={clickedRestSpot == spot.name}
                />
              </div>
            )
          })}
        {start &&
          goal &&
          routeList?.map(path => (
            <Polyline
              key={path.routeId}
              path={path.coordinates.map(coordinate => {
                return new navermaps.LatLng(
                  parseFloat(coordinate.lat),
                  parseFloat(coordinate.lng),
                )
              })}
              strokeLineCap="round"
              strokeLineJoin="round"
              strokeColor={`${path.routeOption === selectedRoute?.routeOption ? '#2DB400' : '#A9A9A9'}`}
              strokeOpacity={0.8}
              strokeWeight={6}
              clickable={true}
              onClick={() => handleClickRoute(path.routeOption)}
              zIndex={selectedRoute?.routeOption === path.routeOption ? 1 : 0}
            />
          ))}
      </NaverMap>
    </MapDiv>
  )
}

export default Naver
