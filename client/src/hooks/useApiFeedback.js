import { useCallback } from 'react'
import { useLoading } from '../contexts/LoadingContext'
import { useNotification } from '../contexts/NotificationContext'

export function useApiFeedback() {
  const { startLoading, stopLoading } = useLoading()
  const notifier = useNotification()

  const runWithFeedback = useCallback(
    async (fn, config = {}) => {
      const {
        loadingMessage,
        successMessage,
        errorMessage,
        useGlobalLoading = false,
      } = config

      try {
        if (useGlobalLoading) {
          startLoading(loadingMessage || 'Loading...')
        }

        const result = await fn()

        if (successMessage) {
          notifier.success(successMessage)
        }

        return result
      } catch (error) {
        notifier.error(errorMessage || error.message || 'Something went wrong.')
        throw error
      } finally {
        if (useGlobalLoading) {
          stopLoading()
        }
      }
    },
    [notifier, startLoading, stopLoading],
  )

  return { runWithFeedback }
}
