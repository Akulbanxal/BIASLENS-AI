import { analyzeCleanroomDataset } from './cleanroomBiasService.js'

const OUTCOME_KEYS = ['loan_approved', 'approved', 'approval', 'is_approved', 'decision', 'outcome']

const round4 = (value) => Math.round(value * 10000) / 10000

const normalizeHeader = (header) => String(header || '').trim().toLowerCase()

const toNum = (value) => {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const findCaseInsensitiveKey = (row, key) => {
  const target = normalizeHeader(key)
  return Object.keys(row || {}).find((candidate) => normalizeHeader(candidate) === target) || null
}

const detectOutcomeKey = (dataset) => {
  const first = dataset[0] || {}
  for (const key of OUTCOME_KEYS) {
    const found = findCaseInsensitiveKey(first, key)
    if (found) return found
  }
  return null
}

const resolveOutcome = (row, outcomeKey) => {
  if (outcomeKey) {
    const numeric = toNum(row[outcomeKey])
    if (numeric !== null) {
      return numeric >= 0.5 ? 1 : 0
    }
  }

  const riskKey = findCaseInsensitiveKey(row, 'risk_score')
  const riskValue = riskKey ? toNum(row[riskKey]) : null
  if (riskValue !== null) {
    return riskValue <= 0.5 ? 1 : 0
  }

  return null
}

const ensureBinaryOutcomeDataset = (dataset, outcomeKey) => {
  const safeOutcomeKey = outcomeKey || 'loan_approved'
  const prepared = dataset.map((row) => {
    const outcome = resolveOutcome(row, outcomeKey)
    return {
      ...row,
      [safeOutcomeKey]: outcome === null ? 0 : outcome,
    }
  })

  return { dataset: prepared, outcomeKey: safeOutcomeKey }
}

const collectNumericFeatureStats = (dataset, excludedKeys) => {
  const mins = {}
  const maxs = {}

  for (const row of dataset) {
    for (const key of Object.keys(row)) {
      if (excludedKeys.has(normalizeHeader(key))) continue
      const value = toNum(row[key])
      if (value === null) continue

      mins[key] = mins[key] === undefined ? value : Math.min(mins[key], value)
      maxs[key] = maxs[key] === undefined ? value : Math.max(maxs[key], value)
    }
  }

  return {
    keys: Object.keys(mins),
    mins,
    maxs,
  }
}

const buildScoreForRow = (row, numericStats) => {
  const values = []

  for (const key of numericStats.keys) {
    const raw = toNum(row[key])
    if (raw === null) continue

    const min = numericStats.mins[key]
    const max = numericStats.maxs[key]
    if (max === min) {
      values.push(0.5)
      continue
    }

    values.push((raw - min) / (max - min))
  }

  if (values.length === 0) {
    return 0.5
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const groupIndicesByFeature = (dataset, feature) => {
  const groups = new Map()

  dataset.forEach((row, index) => {
    const value = row[feature]
    const key = value === undefined || value === null || value === '' ? 'Unknown' : String(value)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(index)
  })

  return groups
}

const assignTopK = (indices, scores, k) => {
  const sorted = [...indices].sort((a, b) => scores[b] - scores[a])
  const accepted = new Set(sorted.slice(0, Math.max(0, Math.min(k, sorted.length))))

  return indices.map((index) => ({
    index,
    outcome: accepted.has(index) ? 1 : 0,
  }))
}

const withAssignedOutcomes = (dataset, outcomeKey, assignments) => {
  const next = dataset.map((row) => ({ ...row }))

  assignments.forEach(({ index, outcome }) => {
    next[index][outcomeKey] = outcome
  })

  return next
}

const evaluateForFeature = ({ dataset, schema, selectedFeature, privacySafeMode }) => {
  const analysis = analyzeCleanroomDataset({ dataset, schema, privacySafeMode })
  const featureStat = analysis.groupStats.find(
    (item) => normalizeHeader(item.attribute) === normalizeHeader(selectedFeature),
  )
  const featureBias = featureStat ? featureStat.biasScore : analysis.biasScore
  const featureFairness = round4(1 - featureBias)

  return {
    analysis,
    bias: round4(featureBias),
    fairness: featureFairness,
  }
}

const reweightSamples = ({ dataset, outcomeKey, selectedFeature, globalPositiveRate, scores }) => {
  const groups = groupIndicesByFeature(dataset, selectedFeature)
  const assignments = []

  groups.forEach((indices) => {
    const desiredApprovals = Math.round(indices.length * globalPositiveRate)
    assignments.push(...assignTopK(indices, scores, desiredApprovals))
  })

  return withAssignedOutcomes(dataset, outcomeKey, assignments)
}

const removeSensitiveFeatureStrategy = ({ dataset, outcomeKey, scores }) => {
  const positives = dataset.reduce((count, row) => count + (row[outcomeKey] >= 0.5 ? 1 : 0), 0)
  const allIndices = dataset.map((_, index) => index)
  const assignments = assignTopK(allIndices, scores, positives)
  return withAssignedOutcomes(dataset, outcomeKey, assignments)
}

const normalizeDistributions = ({ dataset, outcomeKey, selectedFeature, globalPositiveRate, scores }) => {
  const groups = groupIndicesByFeature(dataset, selectedFeature)
  const assignments = []

  groups.forEach((indices) => {
    const currentRate =
      indices.reduce((sum, index) => sum + (dataset[index][outcomeKey] >= 0.5 ? 1 : 0), 0) / indices.length
    const blendedRate = (currentRate + globalPositiveRate) / 2
    const desiredApprovals = Math.round(indices.length * blendedRate)
    assignments.push(...assignTopK(indices, scores, desiredApprovals))
  })

  return withAssignedOutcomes(dataset, outcomeKey, assignments)
}

const buildExplanation = ({ strategyUsed, selectedFeature, before, after }) => {
  const reduction = Math.max(0, before.bias - after.bias)
  const reductionPct = Math.round(reduction * 100)
  return `${strategyUsed} reduced ${selectedFeature} bias by ${reductionPct}% and improved fairness from ${Math.round(before.fairness * 100)}% to ${Math.round(after.fairness * 100)}%.`
}

export const mitigateBias = ({ dataset, schema, selectedFeature, privacySafeMode = true }) => {
  if (!Array.isArray(dataset) || dataset.length < 2) {
    throw new Error('Dataset must contain at least 2 records for mitigation.')
  }

  if (!selectedFeature || typeof selectedFeature !== 'string') {
    throw new Error('A selected sensitive feature is required.')
  }

  const selectedFeatureKey = findCaseInsensitiveKey(dataset[0], selectedFeature)
  if (!selectedFeatureKey) {
    throw new Error(`Selected sensitive feature "${selectedFeature}" was not found in dataset.`)
  }

  const detectedOutcomeKey = detectOutcomeKey(dataset)
  const prepared = ensureBinaryOutcomeDataset(dataset, detectedOutcomeKey)
  const preparedDataset = prepared.dataset
  const outcomeKey = prepared.outcomeKey

  const excluded = new Set([
    normalizeHeader(selectedFeatureKey),
    normalizeHeader(outcomeKey),
    'id',
    'uuid',
  ])
  const numericStats = collectNumericFeatureStats(preparedDataset, excluded)
  const scores = preparedDataset.map((row) => buildScoreForRow(row, numericStats))

  const globalPositiveRate =
    preparedDataset.reduce((sum, row) => sum + (row[outcomeKey] >= 0.5 ? 1 : 0), 0) / preparedDataset.length

  const beforeEval = evaluateForFeature({
    dataset: preparedDataset,
    schema,
    selectedFeature: selectedFeatureKey,
    privacySafeMode,
  })

  const strategies = [
    {
      strategyUsed: 'Reweight Samples',
      dataset: reweightSamples({
        dataset: preparedDataset,
        outcomeKey,
        selectedFeature: selectedFeatureKey,
        globalPositiveRate,
        scores,
      }),
    },
    {
      strategyUsed: `Remove ${selectedFeatureKey} Feature Influence`,
      dataset: removeSensitiveFeatureStrategy({
        dataset: preparedDataset,
        outcomeKey,
        scores,
      }),
    },
    {
      strategyUsed: 'Normalize Group Distributions',
      dataset: normalizeDistributions({
        dataset: preparedDataset,
        outcomeKey,
        selectedFeature: selectedFeatureKey,
        globalPositiveRate,
        scores,
      }),
    },
  ]

  const scoredStrategies = strategies.map((candidate) => {
    const evalResult = evaluateForFeature({
      dataset: candidate.dataset,
      schema,
      selectedFeature: selectedFeatureKey,
      privacySafeMode,
    })
    return {
      ...candidate,
      evalResult,
    }
  })

  scoredStrategies.sort((a, b) => {
    if (a.evalResult.bias !== b.evalResult.bias) {
      return a.evalResult.bias - b.evalResult.bias
    }
    return b.evalResult.fairness - a.evalResult.fairness
  })

  const best = scoredStrategies[0]
  const before = {
    bias: beforeEval.bias,
    fairness: beforeEval.fairness,
  }
  const after = {
    bias: best.evalResult.bias,
    fairness: best.evalResult.fairness,
  }

  return {
    before,
    after,
    strategyUsed: best.strategyUsed,
    explanation: buildExplanation({
      strategyUsed: best.strategyUsed,
      selectedFeature: selectedFeatureKey,
      before,
      after,
    }),
    selectedFeature: selectedFeatureKey,
    mitigatedDataset: best.dataset,
  }
}
