const MAX_HISTORY = 80
const MAX_ALERTS = 40
const HIGH_BIAS_THRESHOLD = 0.3
const DRIFT_THRESHOLD = 0.12

const analysisHistory = []
const alerts = []

const round4 = (value) => Math.round(value * 10000) / 10000

const formatPercent = (value) => `${Math.round(value * 100)}%`

const toSeverity = (score) => {
  if (score >= 0.45) return 'critical'
  if (score >= HIGH_BIAS_THRESHOLD) return 'high'
  return 'medium'
}

const getDominantGap = (stat) => {
  if (!stat?.groups?.length) {
    return null
  }

  const sorted = [...stat.groups].sort((a, b) => b.approvalRate - a.approvalRate)
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]

  return {
    highest,
    lowest,
    gap: round4((highest?.approvalRate ?? 0) - (lowest?.approvalRate ?? 0)),
  }
}

const createAlert = ({ type, severity, title, message, feature, score, explainability }) => ({
  id: `${type}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
  type,
  severity,
  title,
  message,
  feature,
  score: round4(score ?? 0),
  explainability,
  timestamp: new Date().toISOString(),
})

const detectHighBiasAlerts = (analysis) => {
  const generated = []

  for (const stat of analysis.groupStats || []) {
    if ((stat.biasScore ?? 0) <= HIGH_BIAS_THRESHOLD) {
      continue
    }

    const dominantGap = getDominantGap(stat)
    const message =
      stat.attribute === 'gender'
        ? '⚠ High gender bias detected in loan approvals'
        : `⚠ High ${stat.attribute} bias detected in loan approvals`

    generated.push(
      createAlert({
        type: 'high_bias',
        severity: toSeverity(stat.biasScore),
        title: 'High Bias Alert',
        message,
        feature: stat.attribute,
        score: stat.biasScore,
        explainability: {
          why: dominantGap
            ? `Approval rate gap is ${formatPercent(dominantGap.gap)} between ${dominantGap.highest.group} and ${dominantGap.lowest.group}.`
            : 'Group approval rates diverged above the configured threshold.',
          responsibleFeature: stat.attribute,
        },
      }),
    )
  }

  if ((analysis.biasScore ?? 0) > HIGH_BIAS_THRESHOLD) {
    generated.push(
      createAlert({
        type: 'high_bias_overall',
        severity: toSeverity(analysis.biasScore),
        title: 'Overall Fairness Risk',
        message: `⚠ Overall model bias is elevated at ${formatPercent(analysis.biasScore)}.`,
        feature: analysis.primaryFeature ?? 'multiple',
        score: analysis.biasScore,
        explainability: {
          why: 'One or more sensitive groups have materially different approval rates.',
          responsibleFeature: analysis.primaryFeature ?? 'multiple',
        },
      }),
    )
  }

  return generated
}

const detectDriftAlerts = (current, previous) => {
  if (!previous) {
    return []
  }

  const delta = round4(Math.abs((current.biasScore ?? 0) - (previous.biasScore ?? 0)))
  if (delta < DRIFT_THRESHOLD) {
    return []
  }

  const previousByFeature = new Map((previous.groupStats || []).map((item) => [item.attribute, item.biasScore]))
  let responsibleFeature = 'multiple'
  let largestFeatureDelta = 0

  for (const stat of current.groupStats || []) {
    const prev = previousByFeature.get(stat.attribute)
    if (typeof prev !== 'number') continue
    const featureDelta = Math.abs((stat.biasScore ?? 0) - prev)
    if (featureDelta > largestFeatureDelta) {
      largestFeatureDelta = featureDelta
      responsibleFeature = stat.attribute
    }
  }

  return [
    createAlert({
      type: 'sudden_drift',
      severity: delta > 0.2 ? 'critical' : 'high',
      title: 'Sudden Drift Detected',
      message: `⚠ Sudden drift detected: bias changed by ${formatPercent(delta)} since the previous run.`,
      feature: responsibleFeature,
      score: delta,
      explainability: {
        why: `Bias moved from ${formatPercent(previous.biasScore ?? 0)} to ${formatPercent(current.biasScore ?? 0)} in one analysis step.`,
        responsibleFeature,
      },
    }),
  ]
}

export const alertService = {
  recordAnalysis(analysis) {
    const snapshot = {
      timestamp: new Date().toISOString(),
      biasScore: round4(analysis?.biasScore ?? 0),
      fairnessScore: round4(analysis?.fairnessScore ?? 0),
      groupStats: Array.isArray(analysis?.groupStats) ? analysis.groupStats : [],
      primaryFeature: analysis?.primaryFeature,
    }

    const previous = analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1] : null
    analysisHistory.push(snapshot)
    if (analysisHistory.length > MAX_HISTORY) {
      analysisHistory.shift()
    }

    const generated = [
      ...detectHighBiasAlerts(snapshot),
      ...detectDriftAlerts(snapshot, previous),
    ]

    alerts.push(...generated)
    if (alerts.length > MAX_ALERTS) {
      alerts.splice(0, alerts.length - MAX_ALERTS)
    }

    return generated
  },

  getAlerts() {
    return [...alerts].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  },

  getSummary() {
    const all = alertService.getAlerts()
    const active = all.filter((alert) => ['high', 'critical'].includes(alert.severity))

    return {
      total: all.length,
      active: active.length,
      latest: all[0] ?? null,
      thresholds: {
        highBias: HIGH_BIAS_THRESHOLD,
        suddenDrift: DRIFT_THRESHOLD,
      },
    }
  },
}
