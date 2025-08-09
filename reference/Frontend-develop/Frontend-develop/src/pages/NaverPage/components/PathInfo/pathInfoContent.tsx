import { PathInfoType } from '@/types'

interface PathInfoContentProps {
  ranking: number
  clickedId?: number
  route: PathInfoType
}

const PathInfoContent = ({
  route,
  ranking,
  clickedId,
}: PathInfoContentProps) => {
  const { duration, distance, tollFare, fuelPrice, optionText } = route
  const convertTimeToHoursMinutes = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / 3600000)
    const minutes = Math.floor((milliseconds % 3600000) / 60000)

    return { hours, minutes }
  }
  const convertMeterToKilometer = (meters: number) => {
    const kilometers = meters / 1000

    return Math.floor(kilometers)
  }
  const tollInfo =
    tollFare === '0' ? '무료' : `${parseFloat(tollFare).toLocaleString()}원`
  const formattedTime = convertTimeToHoursMinutes(Number(duration))
  const formattedDistance = convertMeterToKilometer(Number(distance))

  return (
    <div
      className={` cursor-pointer px-4 py-4 transition-all duration-150 ${
        clickedId === ranking ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      {/* First line: Ranking badge + optionText */}
      <div className="relative flex items-baseline gap-3 pl-7 text-[0.8em] font-extrabold tracking-tight text-blue-600">
        <span className="absolute left-0 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 align-baseline text-xs font-semibold text-white shadow-sm">
          {ranking}
        </span>
        <span className="align-baseline">{optionText}</span>
      </div>
      {/* Second line: Time, Distance */}
      <div className="mt-1 flex items-baseline gap-2">
        {formattedTime.hours !== 0 && (
          <p className="flex items-baseline gap-1 text-[0.8rem] font-bold tracking-tighter text-gray-800">
            <span className="align-baseline text-[1.5rem]">
              {formattedTime.hours}
            </span>
            <span className="align-baseline">시간</span>
          </p>
        )}
        {formattedTime.minutes !== 0 && (
          <p className="flex items-baseline gap-1 text-[0.8rem] font-bold tracking-tighter text-gray-800">
            <span className="align-baseline text-[1.5rem]">
              {formattedTime.minutes}
            </span>
            <span className="align-baseline">분</span>
          </p>
        )}
        <span className="mx-2 mb-1 h-4 w-px bg-black/10 align-baseline" />
        <span className="align-baseline text-[0.85rem] font-semibold tracking-tight text-gray-800">
          {formattedDistance}km
        </span>
      </div>
      {/* Third line: Toll, Fuel */}
      <div className="mt-1 flex items-baseline gap-2">
        <p className="align-baseline text-[0.9rem] font-medium tracking-tight text-gray-800">
          <span className="align-baseline">통행료 {tollInfo}</span>
        </p>
        <span className="mx-2 h-4 w-px bg-black/10 align-baseline" />
        <p className="align-baseline text-[0.9rem] font-medium tracking-tight text-gray-800">
          <span className="align-baseline">
            연료비 {parseFloat(fuelPrice).toLocaleString()}원
          </span>
        </p>
      </div>
    </div>
  )
}

export default PathInfoContent
