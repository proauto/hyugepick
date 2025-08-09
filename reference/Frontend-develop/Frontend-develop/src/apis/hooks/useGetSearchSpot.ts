import { useQuery } from '@tanstack/react-query'
import apiClient from '../apiClient'
import { Place } from '@/types'

interface Request {
  searchTerm: string | undefined
}

const useGetSearchSpot = ({ searchTerm }: Request) => {
  const getSearch = async () => {
    const response = await apiClient.get(
      `/place/naver?searchTerm=${encodeURIComponent(searchTerm!)}`,
    )

    return response.data
  }

  return useQuery<Place[], Error>({
    queryKey: ['search', searchTerm],
    queryFn: getSearch,
    enabled: !!searchTerm,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export default useGetSearchSpot
