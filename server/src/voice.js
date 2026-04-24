import { Router } from 'express'
import multer from 'multer'
import { detectAccentBias, transcribeAudio } from './services/speechService.js'
import { systemMetrics } from './services/systemMetrics.js'
import { safetyService } from './services/safetyService.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
})

router.post('/analyze', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio blob is required.' })
  }

  try {
    const transcription = await transcribeAudio(req.file.buffer, req.file.mimetype)
    const accentResult = detectAccentBias(transcription.transcript, transcription.audioSignature)

    systemMetrics.incrementAudioDatasets(1)
    systemMetrics.incrementAnalysesRun(1)
    systemMetrics.emit({
      type: 'voice',
      payload: {
        accentClassification: accentResult.accentClassification,
        biasScore: accentResult.biasScore,
        timestamp: new Date().toISOString(),
      },
    })

    const safetyResult = safetyService.observeEvent({
      source: 'voice',
      biasScore: accentResult.biasScore,
      fairnessScore: 1 - accentResult.biasScore,
      responsibleFeature: 'voice-style',
      timestamp: new Date().toISOString(),
    })

    if (safetyResult.triggered) {
      systemMetrics.emit({
        type: 'safety',
        payload: {
          mode: 'TRIGGERED',
          source: 'voice',
          incidentId: safetyResult.incident?.id,
          reason: safetyResult.incident?.reason,
          timestamp: new Date().toISOString(),
        },
      })
    }

    return res.status(200).json({
      transcript: transcription.transcript,
      accentClassification: accentResult.accentClassification,
      biasScore: accentResult.biasScore,
      explainabilityLog: accentResult.explainabilityLog,
      meta: {
        mimeType: req.file.mimetype,
        bytes: req.file.size,
        provider: transcription.provider,
        confidence: transcription.confidence,
        audioSignature: transcription.audioSignature,
      },
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Voice analysis failed.',
      details: error.message,
    })
  }
})

export default router
