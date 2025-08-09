import useGetAnnounces from '@/apis/hooks/useGetAnnounces'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RocketIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import './Notice.css'

const Notice = () => {
  const { data: announceList, isLoading, error, refetch } = useGetAnnounces()
  const [isExpanded, setIsExpanded] = useState(false)

  const recentAnnounce = announceList && announceList[0]

  // 로딩 중이거나 데이터가 없으면 렌더링하지 않음
  if (isLoading || error || !announceList || announceList.length === 0) {
    return null
  }

  // 헤더 클릭 시 토글과 동시에 데이터 새로고침
  const handleHeaderClick = () => {
    setIsExpanded(!isExpanded)
    refetch() // 공지사항 데이터 새로고침
  }

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString)
      .toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\. /g, '.')
      .replace(/\.$/, '')
  }

  return (
    <div className="notice-container">
      {/* 헤더 영역 */}
      <div className="notice-header" onClick={handleHeaderClick}>
        <div className="notice-header-content">
          <RocketIcon color="#0475F5" className="h-4 w-4" />
          <span className="notice-title">공지사항</span>
          {recentAnnounce?.title && (
            <span className="notice-badge">{recentAnnounce.title}</span>
          )}
          {recentAnnounce?.createdAt && (
            <span className="notice-date">
              {formatDate(recentAnnounce.createdAt)}
            </span>
          )}
        </div>
        <div className={`notice-arrow ${isExpanded ? 'expanded' : ''}`} />
      </div>

      {/* 콘텐츠 영역 */}
      <div className={`notice-content ${isExpanded ? 'expanded' : ''}`}>
        <Alert className="border-none bg-transparent m-0">
          <AlertDescription className="whitespace-pre-line">
            {recentAnnounce?.content.replace(/\. /g, '.\n')}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

export default Notice
