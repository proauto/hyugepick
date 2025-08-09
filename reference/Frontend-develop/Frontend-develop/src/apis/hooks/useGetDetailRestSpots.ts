import { useQuery } from '@tanstack/react-query'
import apiClient from '../apiClient'
import type { RestAreaDetail } from '@/types'

interface Request {
  restAreaId: number | string | undefined
}

const useGetDetailRestSpots = ({ restAreaId }: Request) => {
  const getDetailRestSpots = async () => {
    const response = await apiClient.get(`/restarea?restAreaId=${restAreaId}`)

    return response.data
  }

  return useQuery<RestAreaDetail, Error>({
    queryKey: ['detailRestSpots', restAreaId],
    queryFn: getDetailRestSpots,
    enabled: !!restAreaId,
  })
}

export default useGetDetailRestSpots
