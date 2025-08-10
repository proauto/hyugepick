import { Coordinates } from '@/types/map';

/**
 * 하버사인 공식을 사용하여 두 지점 간의 직선거리를 계산합니다.
 * 
 * @param point1 첫 번째 지점의 좌표
 * @param point2 두 번째 지점의 좌표
 * @returns 두 지점 간의 거리 (km)
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // 지구의 반지름 (km)
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * 개별 좌표값을 받아 거리를 계산하는 오버로드 함수
 * 
 * @param lat1 첫 번째 지점의 위도
 * @param lng1 첫 번째 지점의 경도
 * @param lat2 두 번째 지점의 위도
 * @param lng2 두 번째 지점의 경도
 * @returns 두 지점 간의 거리 (km)
 */
export function calculateDistanceFromCoords(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  return calculateDistance(
    { lat: lat1, lng: lng1 },
    { lat: lat2, lng: lng2 }
  );
}