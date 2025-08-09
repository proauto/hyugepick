import { Marker } from 'react-naver-maps'

interface RestSpotMarkerProps {
  position: { lat: number; lng: number }
  clicked?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const RestSpotMarker = ({
  position,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  clicked,
}: RestSpotMarkerProps) => {
  const baseStyle =
    'flex items-center justify-center rounded-full border-2 cursor-pointer transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2'

  const getMarkerStyle = () => {
    if (clicked) {
      return `${baseStyle} w-8 h-8 bg-pink-500 border-white shadow-lg`
    }

    return `${baseStyle} w-6 h-6 bg-blue-500 border-blue-600 hover:w-7 hover:h-7 hover:bg-blue-600 hover:shadow-md`
  }

  const getIconSize = () => {
    return clicked ? 16 : 12
  }

  return (
    <Marker
      onClick={onClick}
      onDblclick={onDoubleClick}
      onMouseover={onMouseEnter}
      onMouseout={onMouseLeave}
      defaultPosition={position}
      icon={{
        content: `<div class="${getMarkerStyle()}"><svg width="${getIconSize()}" height="${getIconSize()}" fill="white" viewBox="0 0 576 512"><path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32.1-14-32.1-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/></svg></div>`,
      }}
    />
  )
}

export default RestSpotMarker
