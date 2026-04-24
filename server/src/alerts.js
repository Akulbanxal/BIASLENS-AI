import { Router } from 'express'
import { alertService } from './services/alertService.js'

const router = Router()

router.get('/', (_req, res) => {
  const alerts = alertService.getAlerts()
  const summary = alertService.getSummary()

  res.json({
    alerts,
    summary,
    timestamp: new Date().toISOString(),
  })
})

export default router
