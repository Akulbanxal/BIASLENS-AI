import { Router } from 'express'
import { safetyService } from './services/safetyService.js'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(safetyService.getStatus())
})

router.post('/arm', (req, res) => {
  const { armed = true } = req.body || {}
  res.json(safetyService.setArmed(Boolean(armed)))
})

router.post('/resume', (_req, res) => {
  res.json(safetyService.resumeSafeMode())
})

router.post('/auto-trigger', (req, res) => {
  const payload = req.body || {}
  const result = safetyService.observeEvent(payload)
  res.json({
    ...result,
    status: safetyService.getStatus(),
  })
})

export default router
