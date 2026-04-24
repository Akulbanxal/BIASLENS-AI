import { Router } from 'express'
import logger from './services/cloudLogger.js'
import { systemMetrics } from './services/systemMetrics.js'
import { getEnvStatus } from './services/envAvailability.js'

const router = Router()

router.get('/health', (req, res) => {
  const snapshot = systemMetrics.getSnapshot()

  res.json({
    status: 'healthy',
    uptime: snapshot.systemUptime,
    requestsServed: snapshot.requestsServed,
    errorRate: snapshot.errorRate,
    timestamp: new Date().toISOString(),
  })
})

router.get('/metrics', (req, res) => {
  logger.info('Metrics endpoint accessed', { query: req.query })
  res.json(systemMetrics.getSnapshot())
})

router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit || 100, 10)
  const logs = logger.getLogs(Math.min(limit, 500))
  res.json({ logs, total: logs.length })
})

router.get('/env-status', (_req, res) => {
  res.json(getEnvStatus())
})

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const writeEvent = (eventName, payload) => {
    res.write(`event: ${eventName}\n`)
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  writeEvent('connected', {
    ok: true,
    timestamp: new Date().toISOString(),
  })
  writeEvent('metrics', systemMetrics.getSnapshot())

  const unsubscribe = systemMetrics.subscribe((event) => {
    writeEvent(event.type || 'update', event.payload ?? event)
  })

  const pulseInterval = setInterval(() => {
    writeEvent('metrics', systemMetrics.getSnapshot())
  }, 5000)

  req.on('close', () => {
    clearInterval(pulseInterval)
    unsubscribe()
    res.end()
  })
})

export default router
