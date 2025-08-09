interface LoadingProps {
  className?: string
}

const Loading = ({ className }: LoadingProps) => {
  const getPositionClass = () => {
    if (className?.includes('top')) return 'top-1/4'
    if (className?.includes('middle')) return 'top-1/2'
    if (className?.includes('bottom')) return 'top-3/4'

    return 'top-1/2'
  }

  return (
    <div
      className={`absolute ${getPositionClass()} left-1/2 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center`}
    >
      <div className="relative mb-3 h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-blue-500/20" />
      </div>

      <div className="animate-pulse text-sm font-medium text-blue-600">
        검색 중...
      </div>

      <div className="mt-2 flex space-x-1">
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-blue-500"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-blue-500"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-blue-500"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  )
}

export default Loading
