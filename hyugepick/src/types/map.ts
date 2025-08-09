// Kakao Map 타입 정의
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: any) => any;
        LatLng: new (lat: number, lng: number) => any;
        LatLngBounds: new () => any;
        Marker: new (options: any) => any;
        InfoWindow: new (options: any) => any;
        Polyline: new (options: any) => any;
        MarkerImage: new (src: string, size: any, options?: any) => any;
        Size: new (width: number, height: number) => any;
        Point: new (x: number, y: number) => any;
        MapTypeControl: new () => any;
        ZoomControl: new () => any;
        ControlPosition: {
          TOPRIGHT: any;
          RIGHT: any;
          TOPLEFT: any;
          LEFT: any;
          BOTTOMLEFT: any;
          BOTTOM: any;
          BOTTOMRIGHT: any;
        };
        services: {
          Geocoder: new () => any;
          Places: new () => any;
          Status: {
            OK: string;
            ZERO_RESULT: string;
            ERROR: string;
          };
        };
        event: {
          addListener: (target: any, type: string, handler: (...args: any[]) => void) => void;
          removeListener: (target: any, type: string, handler: (...args: any[]) => void) => void;
        };
      };
    };
  }
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RestArea {
  id: string;
  name: string;
  coordinates: Coordinates;
  routeCode: string;
  direction: string;
  facilities: string[];
  operatingHours: string;
  phoneNumber?: string;
  address: string;
  foods?: RestFood[];
  // 경로 상 정보 추가
  routeDistance?: number;  // 출발지로부터의 거리 (km)
  routeDuration?: number;  // 출발지로부터의 소요시간 (분)
  routeIndex?: number;     // 경로상 순서
}

export interface RestFood {
  id: string;
  name: string;
  price: string;
  description?: string;
  category: string;
  shopCode?: string;
  restAreaCode?: string;
  salesRank?: number;
}

export interface RestFacility {
  id: string;
  type: string;
  name: string;
  status: string;
  description?: string;
  restAreaCode?: string;
}

export interface RestAreaDetail {
  restAreaCode: string;
  foods: RestFood[];
  facilities: RestFacility[];
  updatedAt: string;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  fare: number;
  path: Coordinates[];
  restAreas: RestArea[];
}

export interface MapProps {
  center?: Coordinates;
  level?: number;
  className?: string;
  onMapLoad?: (map: any) => void;
  children?: React.ReactNode;
}

export interface RouteDisplayProps {
  departure: Coordinates;
  destination: Coordinates;
  onRouteCalculated?: (route: RouteInfo) => void;
  onError?: (error: string) => void;
}