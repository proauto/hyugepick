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