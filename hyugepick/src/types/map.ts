// Kakao Map 타입 정의
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoLatLngBounds;
        Marker: new (options: KakaoMarkerOptions) => KakaoMarker;
        InfoWindow: new (options: KakaoInfoWindowOptions) => KakaoInfoWindow;
        Polyline: new (options: KakaoPolylineOptions) => KakaoPolyline;
        MarkerImage: new (src: string, size: KakaoSize, options?: KakaoMarkerImageOptions) => KakaoMarkerImage;
        Size: new (width: number, height: number) => KakaoSize;
        Point: new (x: number, y: number) => KakaoPoint;
        MapTypeControl: new () => KakaoControl;
        ZoomControl: new () => KakaoControl;
        ControlPosition: {
          TOPRIGHT: string;
          RIGHT: string;
          TOPLEFT: string;
          LEFT: string;
          BOTTOMLEFT: string;
          BOTTOM: string;
          BOTTOMRIGHT: string;
        };
        services: {
          Geocoder: new () => KakaoGeocoder;
          Places: new () => KakaoPlaces;
          Status: {
            OK: string;
            ZERO_RESULT: string;
            ERROR: string;
          };
        };
        event: {
          addListener: (target: KakaoEventTarget, type: string, handler: (...args: unknown[]) => void) => void;
          removeListener: (target: KakaoEventTarget, type: string, handler: (...args: unknown[]) => void) => void;
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
  // 추가 속성들 (데이터베이스 및 API에서 사용)
  routeName?: string;      // 노선명 (예: "경부고속도로")
  route_name?: string;     // 노선명 별칭
  route_code?: string;     // 노선 코드 별칭
  serviceType?: string;    // 서비스 타입 (예: "휴게소")
  highway_operator?: string; // 운영주체
  location?: string;       // 위치 정보
  operating_hours?: string; // 운영시간 별칭
  route_direction?: string; // 경로 방향
  distanceFromStart?: number; // 시작점으로부터 거리
  estimatedTime?: number;  // 예상 시간
  [key: string]: unknown;  // 기타 동적 속성들
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
  onMapLoad?: (map: KakaoMap) => void;
  children?: React.ReactNode;
}

export interface RouteDisplayProps {
  departure: Coordinates;
  destination: Coordinates;
  onRouteCalculated?: (route: RouteInfo) => void;
  onError?: (error: string) => void;
}

// Kakao Maps 타입 정의
export interface KakaoMapOptions {
  center: KakaoLatLng;
  level: number;
  draggable?: boolean;
  scrollwheel?: boolean;
  disableDoubleClick?: boolean;
  disableDoubleClickZoom?: boolean;
  keyboardShortcuts?: boolean;
  projectionId?: string | null;
}

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void;
}

export interface KakaoSize {
  width: number;
  height: number;
}

export interface KakaoPoint {
  x: number;
  y: number;
}

export interface KakaoMarkerImageOptions {
  offset: KakaoPoint;
}

export interface KakaoMarkerImage {
  // MarkerImage properties and methods
  [key: string]: unknown;
}

export interface KakaoMarkerOptions {
  position: KakaoLatLng;
  image?: KakaoMarkerImage | null;
}

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoInfoWindowOptions {
  content?: string;
  zIndex?: number;
}

export interface KakaoInfoWindow {
  open(map: KakaoMap, marker: KakaoMarker): void;
  close(): void;
}

export interface KakaoPolylineOptions {
  path: KakaoLatLng[];
  strokeWeight: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeStyle?: string;
}

export interface KakaoPolyline {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoMap {
  addControl(control: KakaoControl, position: string): void;
  setBounds(bounds: KakaoLatLngBounds): void;
  setDraggable(draggable: boolean): void;
  setZoomable(zoomable: boolean): void;
}

export interface KakaoControl {
  // Control properties and methods
  [key: string]: unknown;
}

export interface KakaoGeocoder {
  addressSearch(address: string, callback: (result: unknown[], status: string) => void): void;
  coord2Address(lng: number, lat: number, callback: (result: unknown[], status: string) => void): void;
}

export interface KakaoPlaces {
  keywordSearch(keyword: string, callback: (result: unknown[], status: string) => void): void;
}

export type KakaoEventTarget = KakaoMap | KakaoMarker | KakaoInfoWindow | KakaoPolyline;