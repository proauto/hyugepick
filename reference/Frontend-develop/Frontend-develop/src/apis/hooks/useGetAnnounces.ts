import { useQuery } from '@tanstack/react-query'
import apiClient from '../apiClient'

interface Announce {
  id: number
  title: string
  content: string
  createdAt: string
}

const useGetAnnounces = () => {
  const getAnnounces = async (): Promise<Announce[]> => {
    const response = await apiClient.get<Announce[]>('/notice')

    return response.data
  }

  return useQuery({
    queryKey: ['announces'],
    queryFn: getAnnounces,
    refetchOnWindowFocus: true, // 다른 윈도우에서 돌아올 때 자동 새로고침
    refetchOnMount: true, // 컴포넌트 마운트시 자동 새로고침
    staleTime: 5 * 60 * 1000, // 5분간 데이터를 신선한 것으로 간주
    refetchInterval: 10 * 60 * 1000, // 10분마다 자동 새로고침
  })
}

export default useGetAnnounces
