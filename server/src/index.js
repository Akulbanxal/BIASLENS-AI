import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import cleanroomRoutes from './cleanroom.js'
import personaRoutes from './persona.js'
import voiceRoutes from './voice.js'
import monitoringRoutes from './monitoring.js'
import alertsRoutes from './alerts.js'
import biasRoutes from './bias.js'
import safetyRoutes from './safety.js'
import logger from './services/cloudLogger.js'
import { systemMetrics } from './services/systemMetrics.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT || 5001)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please retry shortly.',
  },
})

const BASE_GRAPH = {
  nodes: [
    {
      id: 'gender',
      label: 'Gender',
      color: '#f472b6',
      impactScore: 0.78,
      biasContribution: 0.36,
    },
    {
      id: 'income',
      label: 'Income',
      color: '#22d3ee',
      impactScore: 0.64,
      biasContribution: 0.27,
    },
    {
      id: 'education',
      label: 'Education',
      color: '#818cf8',
      impactScore: 0.71,
      biasContribution: 0.31,
    },
  ],
  links: [
    { source: 'gender', target: 'income', weight: 0.68 },
    { source: 'income', target: 'education', weight: 0.61 },
    { source: 'gender', target: 'education', weight: 0.57 },
  ],
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const round3 = (value) => Math.round(value * 1000) / 1000

const toNumberOr = (value, fallback) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

const normalize01 = (value, min, max) => clamp((value - min) / (max - min), 0, 1)

const getScenarioVector = (profile = {}) => {
  const age = toNumberOr(profile.age, 36)
  const income = toNumberOr(profile.income, 72000)
  const educationYears = toNumberOr(profile.educationYears, 14)
  const creditScore = toNumberOr(profile.creditScore, 690)
  const region = String(profile.region || 'urban').toLowerCase()

  const regionBiasOffset = region === 'rural' ? 0.06 : region === 'suburban' ? 0.02 : -0.02

  return {
    ageNorm: normalize01(age, 18, 80),
    incomeNorm: normalize01(income, 20000, 200000),
    educationNorm: normalize01(educationYears, 0, 20),
    creditNorm: normalize01(creditScore, 300, 850),
    regionBiasOffset,
    region,
  }
}

const featureInfluence = (nodeId, vector) => {
  if (nodeId === 'income') {
    return (vector.incomeNorm - 0.5) * 0.28 + (vector.creditNorm - 0.5) * 0.16
  }
  if (nodeId === 'education') {
    return (vector.educationNorm - 0.5) * 0.3 + (vector.ageNorm - 0.5) * 0.1
  }
  if (nodeId === 'gender') {
    return vector.regionBiasOffset + (0.5 - vector.creditNorm) * 0.06
  }
  return (vector.creditNorm - 0.5) * 0.14
}

const computeSimulation = (feature, intervention, profile = {}) => {
  const normalized = (intervention - 50) / 50
  const scenario = getScenarioVector(profile)

  const nodes = BASE_GRAPH.nodes.map((node) => {
    const isTarget = node.id === feature
    const scenarioShift = featureInfluence(node.id, scenario)
    const impactMultiplier = isTarget ? 1 + normalized * 0.35 : 1 + normalized * 0.12
    const biasMultiplier = isTarget ? 1 - normalized * 0.42 : 1 - normalized * 0.17

    return {
      ...node,
      impactScore: round3(clamp(node.impactScore * impactMultiplier + scenarioShift * 0.45, 0.1, 0.99)),
      biasContribution: round3(
        clamp(node.biasContribution * biasMultiplier + scenarioShift * 0.35 + scenario.regionBiasOffset * 0.2, 0.05, 0.95),
      ),
    }
  })

  const links = BASE_GRAPH.links.map((link) => {
    const touchesTarget = link.source === feature || link.target === feature
    const scenarioLinkShift = (scenario.creditNorm - 0.5) * 0.08 + (scenario.educationNorm - 0.5) * 0.06
    const shiftedWeight = touchesTarget
      ? link.weight * (1 + normalized * 0.3)
      : link.weight * (1 + normalized * 0.08)

    return {
      ...link,
      weight: round3(clamp(shiftedWeight + scenarioLinkShift, 0.2, 0.95)),
    }
  })

  const predictedBias = round3(
    clamp(nodes.reduce((sum, node) => sum + node.biasContribution, 0) / Math.max(1, nodes.length), 0.05, 0.95),
  )
  const predictedFairness = round3(clamp(1 - predictedBias, 0.05, 0.99))

  const scenarioInsights = [
    `Region profile (${scenario.region}) contributes ${(scenario.regionBiasOffset * 100).toFixed(1)}% directional shift.`,
    `Credit and income profile shifts applied to causal edges and node impacts.`,
    `Intervention targeted on ${feature} with intensity ${Math.round(intervention)}%.`,
  ]

  return { nodes, links, predictedBias, predictedFairness, scenarioInsights }
}

app.use(cors())
app.use(express.json())
app.use(helmet())
app.use('/api', apiLimiter)

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now()

  logger.info(`${req.method} ${req.path}`, { ip: req.ip })

  res.on('finish', () => {
    const durationMs = Date.now() - start

    systemMetrics.recordRequest({
      durationMs,
      statusCode: res.statusCode,
    })

    if (req.path.startsWith('/api')) {
      systemMetrics.emit({
        type: 'request',
        payload: {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          durationMs,
          timestamp: new Date().toISOString(),
        },
      })
    }
  })

  next()
})

app.use('/api/cleanroom', cleanroomRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/voice', voiceRoutes)
app.use('/api/system', monitoringRoutes)
app.use('/api/alerts', alertsRoutes)
app.use('/api/bias', biasRoutes)
app.use('/api/safety', safetyRoutes)

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'biaslens-ai-backend',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/causal-graph', (_req, res) => {
  res.status(200).json(BASE_GRAPH)
})

app.post('/api/simulate-intervention', (req, res) => {
  const feature = req.body?.feature ?? 'gender'
  const intervention = Number(req.body?.intervention ?? 50)
  const profile = req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : {}

  const safeIntervention = clamp(Number.isNaN(intervention) ? 50 : intervention, 0, 100)
  const nodeExists = BASE_GRAPH.nodes.some((node) => node.id === feature)
  const safeFeature = nodeExists ? feature : 'gender'

  const result = computeSimulation(safeFeature, safeIntervention, profile)

  res.status(200).json({
    ...result,
    meta: {
      feature: safeFeature,
      intervention: safeIntervention,
      profileUsed: profile,
      predictedBias: result.predictedBias,
      predictedFairness: result.predictedFairness,
      scenarioInsights: result.scenarioInsights,
    },
  })
})

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const clientDistPath = path.resolve(__dirname, '../../client/dist')

  app.use(express.static(clientDistPath))

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename

if (isDirectRun && !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`BiasLens AI backend started`, {
      port: PORT,
      nodeEnv: process.env.NODE_ENV,
    })
    console.log(`BiasLens AI backend running on http://localhost:${PORT}`)
  })
}

export default app
