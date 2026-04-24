const SENSITIVE_ATTRIBUTES = ['gender', 'age', 'income']
const OUTCOME_KEYS = ['loan_approved', 'approved', 'approval', 'is_approved', 'decision', 'outcome']

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNum = (value) => {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const normalizeHeader = (header) => String(header || '').trim().toLowerCase()

const findValueByKey = (row, key) => {
  const target = normalizeHeader(key)
  const foundKey = Object.keys(row).find((candidate) => normalizeHeader(candidate) === target)
  return foundKey ? row[foundKey] : undefined
}

const resolveOutcome = (row) => {
  for (const key of OUTCOME_KEYS) {
    const raw = findValueByKey(row, key)
    if (raw === undefined) continue

    const numeric = toNum(raw)
    if (numeric === null) continue

    return numeric >= 0.5 ? 1 : 0
  }

  const riskScore = toNum(findValueByKey(row, 'risk_score'))
  if (riskScore !== null) {
    return riskScore <= 0.5 ? 1 : 0
  }

  return null
}

const groupAge = (value) => {
  const age = toNum(value)
  if (age === null) return 'Unknown'
  if (age < 30) return '<30'
  if (age < 45) return '30-44'
  if (age < 60) return '45-59'
  return '60+'
}

const groupIncome = (value) => {
  const income = toNum(value)
  if (income === null) return 'Unknown'
  if (income < 50000) return '<50k'
  if (income < 80000) return '50k-79k'
  if (income < 120000) return '80k-119k'
  return '120k+'
}

const groupGender = (value) => {
  if (value === undefined || value === null || value === '') return 'Unknown'
  const text = String(value).trim().toLowerCase()
  if (!text) return 'Unknown'
  if (text.startsWith('m')) return 'Male'
  if (text.startsWith('f')) return 'Female'
  if (text.includes('non')) return 'Non-binary'
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const buildGroupKey = (attribute, rawValue) => {
  if (attribute === 'age') return groupAge(rawValue)
  if (attribute === 'income') return groupIncome(rawValue)
  return groupGender(rawValue)
}

const collapseSmallGroups = (groups, minSize) => {
  const largeGroups = []
  let otherTotal = 0
  let otherApproved = 0

  groups.forEach((group) => {
    if (group.total < minSize) {
      otherTotal += group.total
      otherApproved += group.approved
    } else {
      largeGroups.push(group)
    }
  })

  if (otherTotal > 0) {
    largeGroups.push({
      group: 'Other',
      total: otherTotal,
      approved: otherApproved,
      approvalRate: otherApproved / otherTotal,
    })
  }

  return largeGroups
}

const detectSensitiveColumns = (dataset, schema) => {
  const schemaColumns = (schema || []).map((field) => normalizeHeader(field.name))
  const rowColumns = dataset.length > 0 ? Object.keys(dataset[0]).map(normalizeHeader) : []
  const available = new Set([...schemaColumns, ...rowColumns])

  return SENSITIVE_ATTRIBUTES.filter((attribute) => available.has(attribute))
}

const computeAttributeStats = (dataset, attribute, privacySafeMode) => {
  const rawGroups = new Map()
  let validRows = 0

  dataset.forEach((row) => {
    const outcome = resolveOutcome(row)
    if (outcome === null) return

    const rawValue = findValueByKey(row, attribute)
    const key = buildGroupKey(attribute, rawValue)
    const current = rawGroups.get(key) || { group: key, total: 0, approved: 0 }

    current.total += 1
    current.approved += outcome
    rawGroups.set(key, current)
    validRows += 1
  })

  if (validRows === 0) {
    return null
  }

  let groups = Array.from(rawGroups.values()).map((group) => ({
    ...group,
    approvalRate: group.total > 0 ? group.approved / group.total : 0,
  }))

  if (privacySafeMode) {
    groups = collapseSmallGroups(groups, 2)
  }

  groups.sort((a, b) => b.approvalRate - a.approvalRate)

  const approvalRates = groups.map((group) => group.approvalRate)
  const maxRate = Math.max(...approvalRates)
  const minRate = Math.min(...approvalRates)
  const biasScore = Number((maxRate - minRate).toFixed(4))

  return {
    attribute,
    biasScore,
    groups: groups.map((group) => ({
      group: group.group,
      total: group.total,
      approved: group.approved,
      approvalRate: Number(group.approvalRate.toFixed(4)),
    })),
  }
}

export function analyzeCleanroomDataset({ dataset, schema, privacySafeMode = true }) {
  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw new Error('Dataset is required and must contain at least one row.')
  }

  const sensitiveColumns = detectSensitiveColumns(dataset, schema)

  const groupStats = sensitiveColumns
    .map((attribute) => computeAttributeStats(dataset, attribute, privacySafeMode))
    .filter(Boolean)

  if (groupStats.length === 0) {
    throw new Error('No valid sensitive attributes or outcome columns found for analysis.')
  }

  const overallBias = Number(
    clamp(
      Math.max(...groupStats.map((item) => item.biasScore)),
      0,
      1,
    ).toFixed(4),
  )

  const fairnessScore = Number((1 - overallBias).toFixed(4))
  const flaggedAttributes = groupStats
    .filter((item) => item.biasScore >= 0.15)
    .map((item) => item.attribute)

  return {
    biasScore: overallBias,
    fairnessScore,
    groupStats,
    flaggedAttributes,
    recordsAnalyzed: dataset.length,
  }
}
