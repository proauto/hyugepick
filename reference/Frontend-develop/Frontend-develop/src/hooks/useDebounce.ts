import { useEffect, useState } from 'react'

const useDebounce = (value: string, delay: number = 500) => {
  const [debounceVal, setDebounceVal] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounceVal(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debounceVal
}

export default useDebounce
