import { useQuery } from '@tanstack/react-query'
import apiClient from '../apiClient'
import { Route } from '@/types'

interface Request {
  searchId?: number
}

const useGetRoutesBySearchId = ({ searchId }: Request) => {
  const getRoutes = async () => {
    const response = await apiClient.get(`/route/search?searchId=${searchId}`)

    return response.data
  }

  const queryKey = ['routes']

  return useQuery<Route[], Error>({
    queryKey,
    queryFn: getRoutes,
    enabled: false,
  })
}

export default useGetRoutesBySearchId
