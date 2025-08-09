import { Marker } from 'react-naver-maps'

interface CustomMarkerProps {
  type?: 'start' | 'goal' | 'waypoints'
  waypointsIndex?: number
  position: { lat: number; lng: number }
}

const CustomMarker = ({
  type,
  position,
  waypointsIndex,
}: CustomMarkerProps) => {
  const getMarkerStyle = () => {
    switch (type) {
      case 'start':
        return 'bg-green-500 border-green-600'
      case 'goal':
        return 'bg-red-500 border-red-600'
      case 'waypoints':
        return 'bg-blue-500 border-blue-600'
      default:
        return 'bg-gray-500 border-gray-600'
    }
  }

  const getMarkerText = () => {
    if (type === 'start') return '출발'
    if (type === 'goal') return '도착'
    if (type === 'waypoints') return waypointsIndex

    return ''
  }

  return (
    <Marker
      position={position}
      icon={{
        content: [
          `<div class="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-full">`,
          `  <div class="relative ${getMarkerStyle()} rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white">`,
          `    <span class="text-xs font-bold text-white">${getMarkerText()}</span>`,
          `  </div>`,
          `  <div class="absolute top-6 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-current ${getMarkerStyle().split(' ')[0]}"></div>`,
          '</div>',
        ].join(''),
      }}
    />
  )
}

export default CustomMarker
