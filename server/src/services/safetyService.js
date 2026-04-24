const MAX_INCIDENTS = 50

const THRESHOLDS = {
  cleanroomBias: 0.34,
  voiceBias: 0.65,
  personaToxicity: 0.42,
  fairnessDrop: 0.18,
  driftDelta: 0.18,
}

const round4 = (value) => Math.round(value * 10000) / 10000

const state = {
  armed: true,
  status: 'SAFE',
  safePolicy: 'bias-guard-local-fallback',
  lastEvaluations: [],
  incidents: [],
  activeIncident: null,
  sourceSnapshots: {},
}

const pushEvaluation = (item) => {
  state.lastEvaluations.unshift(item)
  state.lastEvaluations = state.lastEvaluations.slice(0, 20)
}

const triggerIncident = ({ source, reason, metrics, responsibleFeature }) => {
  const incident = {
    id: `incident_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    source,
    reason,
    responsibleFeature: responsibleFeature || 'multiple',
    metrics,
    actions: [
      'Freeze high-risk prediction path',
      'Switch to safer fallback policy',
      'Trigger Bias Guard auto-mitigation',
    ],
    status: 'TRIGGERED',
    timestamp: new Date().toISOString(),
  }

  state.status = 'TRIGGERED'
  state.activeIncident = incident
  state.incidents.unshift(incident)
  state.incidents = state.incidents.slice(0, MAX_INCIDENTS)

  return incident
}

const evaluateEvent = (event) => {
  const source = event.source || 'unknown'
  const biasScore = typeof event.biasScore === 'number' ? event.biasScore : null
  const fairnessScore = typeof event.fairnessScore === 'number' ? event.fairnessScore : null
  const toxicity = typeof event.toxicity === 'number' ? event.toxicity : null
  const responsibleFeature = event.responsibleFeature || event.feature || 'multiple'

  const previous = state.sourceSnapshots[source] || null
  const driftDelta =
    previous && typeof previous.biasScore === 'number' && typeof biasScore === 'number'
      ? Math.abs(biasScore - previous.biasScore)
      : 0

  const checks = []

  if (source === 'cleanroom' && typeof biasScore === 'number' && biasScore >= THRESHOLDS.cleanroomBias) {
    checks.push(`cleanroom bias ${round4(biasScore)} >= ${THRESHOLDS.cleanroomBias}`)
  }

  if (source === 'voice' && typeof biasScore === 'number' && biasScore >= THRESHOLDS.voiceBias) {
    checks.push(`voice bias ${round4(biasScore)} >= ${THRESHOLDS.voiceBias}`)
  }

  if (source === 'persona' && typeof toxicity === 'number' && toxicity >= THRESHOLDS.personaToxicity) {
    checks.push(`persona toxicity ${round4(toxicity)} >= ${THRESHOLDS.personaToxicity}`)
  }

  if (typeof fairnessScore === 'number' && fairnessScore <= THRESHOLDS.fairnessDrop) {
    checks.push(`fairness ${round4(fairnessScore)} <= ${THRESHOLDS.fairnessDrop}`)
  }

  if (driftDelta >= THRESHOLDS.driftDelta) {
    checks.push(`drift delta ${round4(driftDelta)} >= ${THRESHOLDS.driftDelta}`)
  }

  state.sourceSnapshots[source] = {
    biasScore,
    fairnessScore,
    toxicity,
    timestamp: event.timestamp || new Date().toISOString(),
  }

  const evaluation = {
    source,
    biasScore,
    fairnessScore,
    toxicity,
    driftDelta: round4(driftDelta),
    triggered: checks.length > 0,
    checks,
    timestamp: new Date().toISOString(),
  }

  pushEvaluation(evaluation)

  if (!state.armed || checks.length === 0 || state.status === 'TRIGGERED') {
    return {
      triggered: false,
      incident: null,
      evaluation,
    }
  }

  const incident = triggerIncident({
    source,
    reason: checks.join(' | '),
    responsibleFeature,
    metrics: {
      biasScore,
      fairnessScore,
      toxicity,
      driftDelta: round4(driftDelta),
    },
  })

  return {
    triggered: true,
    incident,
    evaluation,
  }
}

export const safetyService = {
  observeEvent(event) {
    return evaluateEvent(event)
  },

  setArmed(armed) {
    state.armed = Boolean(armed)
    if (!state.armed && state.status === 'TRIGGERED') {
      state.status = 'SAFE'
      state.activeIncident = null
    }
    return this.getStatus()
  },

  resumeSafeMode() {
    state.status = 'SAFE'
    state.activeIncident = null
    return this.getStatus()
  },

  getStatus() {
    return {
      armed: state.armed,
      status: state.status,
      safePolicy: state.safePolicy,
      activeIncident: state.activeIncident,
      incidents: state.incidents,
      lastEvaluations: state.lastEvaluations,
      thresholds: THRESHOLDS,
      timestamp: new Date().toISOString(),
    }
  },
}
