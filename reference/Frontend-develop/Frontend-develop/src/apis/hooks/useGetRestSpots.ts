import { useQuery } from '@tanstack/react-query'
import apiClient from '../apiClient'
import { RestSpot } from '@/types'

interface Request {
  routeId: number | undefined
}

const useGetRestSpots = ({ routeId }: Request) => {
  const getRestSpots = async () => {
    const response = await apiClient.get(`/restarea/route?routeId=${routeId}`)

    return response.data
  }

  return useQuery<RestSpot[], Error>({
    queryKey: ['restSpots', routeId], // routeId를 queryKey에 포함
    queryFn: getRestSpots,
    enabled: !!routeId,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  })
}

export default useGetRestSpots
