import { useEffect, useState } from 'react'
import { apiGet } from '../services/apiClient'

const initialSnapshot = {
  analysesRun: 0,
  aiCallsProcessed: 0,
  audioDatasetsProcessed: 0,
  personasSimulated: 0,
  recordsAnalyzed: 0,
  averageResponseTime: 0,
  systemUptime: 0,
  requestsServed: 0,
  errorRate: 0,
  memoryRssMb: 0,
  memoryHeapUsedMb: 0,
  timestamp: null,
}

export function useSystemTelemetry() {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  useEffect(() => {
    let mounted = true
    let eventSource = null

    const bootstrapMetrics = async () => {
      try {
        const data = await apiGet('/api/system/metrics')
        if (mounted) {
          setSnapshot((prev) => ({ ...prev, ...data }))
        }
      } catch {
        // Best-effort bootstrap request.
      }
    }

    const connectStream = () => {
      eventSource = new EventSource('/api/system/events')

      eventSource.addEventListener('connected', () => {
        if (!mounted) return
        setConnectionStatus('connected')
      })

      eventSource.addEventListener('metrics', (event) => {
        if (!mounted) return

        try {
          const payload = JSON.parse(event.data)
          setSnapshot((prev) => ({ ...prev, ...payload }))
          setConnectionStatus('connected')
        } catch {
          // Ignore malformed SSE payloads.
        }
      })

      eventSource.onerror = () => {
        if (!mounted) return
        setConnectionStatus('reconnecting')
      }
    }

    bootstrapMetrics()
    connectStream()

    return () => {
      mounted = false
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  return { snapshot, connectionStatus }
}
