import { Coordinates } from '@/types/map';

/**
 * 좌표 객체의 유효성을 검사하는 타입 가드 함수
 * 
 * @param coord 검사할 좌표 객체
 * @returns 유효한 좌표인지 여부
 */
export function isValidCoordinate(coord: any): coord is Coordinates {
  return coord && 
         typeof coord.lat === 'number' && 
         typeof coord.lng === 'number' &&
         coord.lat >= -90 && coord.lat <= 90 &&
         coord.lng >= -180 && coord.lng <= 180;
}

/**
 * 좌표 배열의 유효성을 검사하는 함수
 * 
 * @param coords 검사할 좌표 배열
 * @returns 모든 좌표가 유효한지 여부
 */
export function areValidCoordinates(coords: any[]): coords is Coordinates[] {
  return Array.isArray(coords) && coords.length > 0 && coords.every(isValidCoordinate);
}

/**
 * 위도/경도 값의 개별 유효성을 검사하는 함수
 * 
 * @param lat 위도
 * @param lng 경도
 * @returns 유효한 좌표값인지 여부
 */
export function isValidLatLng(lat: number, lng: number): boolean {
  return typeof lat === 'number' && 
         typeof lng === 'number' &&
         lat >= -90 && lat <= 90 &&
         lng >= -180 && lng <= 180;
}

/**
 * 다양한 형태의 좌표 객체에서 안전하게 좌표를 추출합니다
 * RestAreaDB (lat, lng 직접) 및 RestArea (coordinates.lat, coordinates.lng) 모두 지원
 */
export function extractCoordinates(data: any): Coordinates | null {
  if (!data) {
    console.warn('extractCoordinates: data가 null 또는 undefined입니다', data);
    return null;
  }

  // 이미 올바른 형태인 경우 (lat, lng 직접 존재)
  if (isValidCoordinate(data)) {
    return { lat: data.lat, lng: data.lng };
  }

  // coordinates 속성이 있는 경우 (RestArea 타입)
  if (data?.coordinates && isValidCoordinate(data.coordinates)) {
    return { lat: data.coordinates.lat, lng: data.coordinates.lng };
  }

  // latitude/longitude 형태인 경우
  if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
    return { lat: data.latitude, lng: data.longitude };
  }

  // x, y 형태인 경우 (일부 API에서 사용)
  if (typeof data?.x === 'number' && typeof data?.y === 'number') {
    return { lat: data.y, lng: data.x };
  }

  console.warn('extractCoordinates: 유효한 좌표를 찾을 수 없습니다', {
    data,
    hasLat: 'lat' in (data || {}),
    hasLng: 'lng' in (data || {}),
    hasCoordinates: 'coordinates' in (data || {}),
    coordinatesType: typeof data?.coordinates
  });
  
  return null;
}

/**
 * 휴게소 데이터에서 안전하게 좌표를 추출하고 유효성을 검사합니다
 */
export function getRestAreaCoordinates(restArea: any): Coordinates | null {
  const coords = extractCoordinates(restArea);
  
  if (!coords) {
    console.error('getRestAreaCoordinates: 휴게소 좌표 추출 실패', {
      restAreaId: restArea?.id || restArea?.unit_code,
      restAreaName: restArea?.name,
      restAreaData: restArea
    });
  }
  
  return coords;
}