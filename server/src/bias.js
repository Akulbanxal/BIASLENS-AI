import { Router } from 'express'
import { mitigateBias } from './services/biasMitigationService.js'
import { systemMetrics } from './services/systemMetrics.js'

const router = Router()

router.post('/mitigate', (req, res) => {
  const { dataset, selectedFeature, schema, privacySafeMode = true } = req.body || {}

  if (!Array.isArray(dataset) || dataset.length === 0) {
    return res.status(400).json({ error: 'Dataset is required.' })
  }

  if (!selectedFeature) {
    return res.status(400).json({ error: 'selectedFeature is required.' })
  }

  try {
    const result = mitigateBias({
      dataset,
      selectedFeature,
      schema,
      privacySafeMode,
    })

    systemMetrics.incrementAnalysesRun(1)
    systemMetrics.incrementRecordsAnalyzed(dataset.length)
    systemMetrics.emit({
      type: 'mitigation',
      payload: {
        source: 'bias-guard',
        selectedFeature: result.selectedFeature,
        beforeBias: result.before.bias,
        afterBias: result.after.bias,
        timestamp: new Date().toISOString(),
      },
    })

    return res.json(result)
  } catch (error) {
    return res.status(500).json({
      error: 'Bias mitigation failed.',
      details: error.message,
    })
  }
})

export default router
