import { createContext, useContext, useState, useCallback } from 'react'

const LoadingContext = createContext()

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  const startLoading = useCallback((message = 'Loading...') => {
    setLoadingMessage(message)
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
    setLoadingMessage('')
  }, [])

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider')
  }
  return context
}
