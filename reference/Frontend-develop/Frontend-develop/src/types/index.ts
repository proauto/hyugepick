// eslint-disable-next-line import/export
export interface Place {
  name?: string
  lat: string
  lng: string
  category?: string
  address?: string
}

export interface Route {
  coordinates: Place[]
  createdDate: string
  distance: string
  duration: string
  fuelPrice: string
  optionText: string
  routeId?: number
  routeOption: string
  searchId: number
  tollFare: string
}

export type PathInfoType = Omit<
  Route,
  'coordinates' | 'createdDate' | 'searchId' | 'routeOption'
>

export type RestAreaInfoType = {
  type: string
  restaurant: boolean
  gasStation: boolean
  chargingStation: boolean
  pharmacy: boolean
  toilet: boolean
  name: string
  routeName: string
  naverMapUrl: string
  hoveredRestSpot: string
}

export interface RestSpot {
  restAreaId: number
  name: string
  routeName: string
  routeDirection: '상행' | '하행' | '양방향'
  lat: number
  lng: number
  type: string
  operatingStartTime: string
  operatingEndTime: string
  parkingSpaceCount: number
  isMaintenanceAvailable: boolean
  hasGasStation: boolean
  hasLpgChargingStation: boolean
  hasElectricChargingStation: boolean
  hasRestroom: boolean
  hasPharmacy: boolean
  hasNursingRoom: boolean
  hasStore: boolean
  hasRestaurant: boolean
  otherFacilities: string
  representativeFood: string
  phoneNumber: string
  naverMapUrl: string
  nextRestAreaDistance: number
}

export interface DetailRestSpot {
  mainPngUrl: string
  name: string
  category: string
  addresss: string
  phoneNumber: string
  naverMapUrl: string
}

export interface RestAreaDetail {
  restAreaId: number
  name: string
  routeName: string
  routeDirection: string
  lat: number
  lng: number
  type: string
  operatingStartTime: string
  operatingEndTime: string
  parkingSpaceCount: number
  isMaintenanceAvailable: boolean
  hasGasStation: boolean
  hasLpgChargingStation: boolean
  hasElectricChargingStation: boolean
  hasRestroom: boolean
  hasPharmacy: boolean
  hasNursingRoom: boolean
  hasStore: boolean
  hasRestaurant: boolean
  otherFacilities: string
  representativeFood: string
  phoneNumber: string
  naverMapUrl: string
  mainImage: string
  hasFuelData: boolean
  lastFuelUpdateDate?: string
  gasolinePrice: string
  dieselPrice: string
  lpgPrice: string
}

export type RouteHistory = {
  name: string
  searchId: number
  startPlace: Place
  goalPlace: Place
}
