import { SetStateAction, useEffect, useState, Dispatch, useRef } from 'react'
import { Route, Place } from '@/types'
import InputText from './inputText.tsx'
import { debounce } from 'lodash'
import './InputSubmit.css'

interface InputSubmitProps {
  startPlace: Place | null
  setStartPlace: Dispatch<SetStateAction<Place | null>>
  goalPlace: Place | null
  setGoalPlace: Dispatch<SetStateAction<Place | null>>
  setRouteList: Dispatch<SetStateAction<Route[] | undefined>>
  handleClickSearchRoutes: () => void
  setRestSpotModalOpen: Dispatch<SetStateAction<boolean>>
  hasStartAndGoal: boolean
  setShowRouteList: Dispatch<SetStateAction<boolean>>
  showRouteList: boolean
  addPlaceHistory: (place: Place) => void
  moveToLocation?: (lat: number, lng: number, zoom?: number) => void
}

const InputSubmit = ({
  startPlace,
  setStartPlace,
  goalPlace,
  setGoalPlace,
  setRouteList,
  handleClickSearchRoutes,
  setRestSpotModalOpen,
  hasStartAndGoal,
  setShowRouteList,
  showRouteList,
  addPlaceHistory,
  moveToLocation,
}: InputSubmitProps) => {
  const [isReset, setIsReset] = useState<boolean>(false)
  useEffect(() => {
    isReset && setIsReset(false)
  }, [setIsReset, isReset])

  const handleClickReset = () => {
    setStartPlace(null)
    setGoalPlace(null)
    setIsReset(true)
    setRestSpotModalOpen(false)
    setShowRouteList(false)
    setRouteList([])
  }

  const trackSearchRoutes = () => {
    gtag('event', 'get_directions', {
      method: 'button_click',
      page_location: window.location.href,
    })

    handleClickSearchRoutes()
  }

  const startInputRef = useRef<HTMLInputElement>(null)
  const goalInputRef = useRef<HTMLInputElement>(null)

  const handleSwap = () => {
    if (!startPlace && !goalPlace) return
    if (startPlace && goalPlace) {
      setStartPlace(goalPlace)
      setGoalPlace(startPlace)
    } else if (startPlace && !goalPlace) {
      setGoalPlace(startPlace)
      setStartPlace(null)
      // 출발지 input(빈 칸)에 포커스
      setTimeout(() => startInputRef.current?.focus(), 0)
    } else if (!startPlace && goalPlace) {
      setStartPlace(goalPlace)
      setGoalPlace(null)
      // 도착지 input(빈 칸)에 포커스
      setTimeout(() => goalInputRef.current?.focus(), 0)
    }
  }

  return (
    <div className="inputSubmit">
      {/* {showRouteList && (
        <div className="slideBtn" onClick={() => handleClickReset()} />
      )} */}
      <div className="inputBox relative">
        <InputText
          place={startPlace}
          setPlace={setStartPlace}
          type={'start'}
          isReset={isReset}
          setShowRouteList={setShowRouteList}
          setRestSpotModalOpen={setRestSpotModalOpen}
          addPlaceHistory={addPlaceHistory}
          inputRef={startInputRef}
          moveToLocation={moveToLocation}
        />

        <InputText
          place={goalPlace}
          setPlace={setGoalPlace}
          type={'goal'}
          isReset={isReset}
          setShowRouteList={setShowRouteList}
          setRestSpotModalOpen={setRestSpotModalOpen}
          addPlaceHistory={addPlaceHistory}
          inputRef={goalInputRef}
          moveToLocation={moveToLocation}
        />

        {/* Swap button: 출발지 목적지 회전 버튼, PathInfo 보일 때는 숨김 */}
        {!showRouteList && (
          <div
            className="absolute z-10 flex cursor-pointer items-center justify-center"
            style={{
              left: '90%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '33.6px',
              height: '33.6px',
              borderRadius: '50%',
              pointerEvents: 'auto',
              background: '#fff',
              boxShadow: 'none',
              border: '1.5px solid #E3E3E3',
              padding: '3px',
            }}
            onClick={handleSwap}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 23, color: 'rgba(4,117,245,0.8)' }}
            >
              cached
            </span>
          </div>
        )}
      </div>

      <div className="btnBox">
        <button onClick={handleClickReset}>
          <p>다시입력</p>
        </button>
        <button onClick={debounce(trackSearchRoutes, 500)}>
          <p>길찾기</p>
        </button>
      </div>

      {!hasStartAndGoal && (
        <div className="errText">
          <p>출발지와 도착지를 모두 입력하세요!</p>
        </div>
      )}
    </div>
  )
}

export default InputSubmit
