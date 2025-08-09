import { useQuery } from '@tanstack/react-query'
import apiClient from '../apiClient'
import { Route } from '@/types'

interface Request {
  start: string
  goal: string
  startName?: string
  goalName?: string
  waypoints?: string[]
  page: string
}

const useGetRoutes = ({
  start,
  goal,
  startName,
  goalName,
  waypoints,
  page,
}: Request) => {
  const getRoutes = async () => {
    const response = await apiClient.get(
      `/route?start=${start}&goal=${goal}&startName=${startName}&goalName=${goalName}&page=${page}
      ${waypoints ? `&waypoints=${waypoints.join('%7c')}` : ''}`,
    )

    return response.data
  }

  const queryKey = ['routes', start, goal, startName, goalName, waypoints, page]

  return useQuery<Route[], Error>({
    queryKey,
    queryFn: getRoutes,
    enabled: false,
  })
}

export default useGetRoutes
