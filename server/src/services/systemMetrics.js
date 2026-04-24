const state = {
  analysesRun: 3847,
  aiCallsProcessed: 5203,
  audioDatasetsProcessed: 1284,
  personasSimulated: 756,
  recordsAnalyzed: 2847,
  requestCount: 0,
  errorCount: 0,
  avgResponseTimeMs: 423,
}

const listeners = new Set()

const round2 = (value) => Math.round(value * 100) / 100

const emit = (event) => {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch {
      // Ignore listener errors so one broken client does not break broadcasting.
    }
  })
}

const updateAverageResponseTime = (durationMs) => {
  if (state.requestCount <= 1) {
    state.avgResponseTimeMs = durationMs
    return
  }

  state.avgResponseTimeMs = round2(
    state.avgResponseTimeMs + (durationMs - state.avgResponseTimeMs) / state.requestCount,
  )
}

export const systemMetrics = {
  recordRequest({ durationMs, statusCode }) {
    state.requestCount += 1
    if (statusCode >= 400) {
      state.errorCount += 1
    }

    updateAverageResponseTime(durationMs)
  },

  incrementAnalysesRun(by = 1) {
    state.analysesRun += by
  },

  incrementAiCalls(by = 1) {
    state.aiCallsProcessed += by
  },

  incrementAudioDatasets(by = 1) {
    state.audioDatasetsProcessed += by
  },

  incrementPersonas(by = 1) {
    state.personasSimulated += by
  },

  incrementRecordsAnalyzed(by = 1) {
    state.recordsAnalyzed += by
  },

  getSnapshot() {
    const uptime = process.uptime()
    const memory = process.memoryUsage()
    const errorRate = state.requestCount > 0 ? state.errorCount / state.requestCount : 0

    return {
      analysesRun: state.analysesRun,
      aiCallsProcessed: state.aiCallsProcessed,
      audioDatasetsProcessed: state.audioDatasetsProcessed,
      personasSimulated: state.personasSimulated,
      recordsAnalyzed: state.recordsAnalyzed,
      averageResponseTime: round2(state.avgResponseTimeMs),
      systemUptime: round2(uptime),
      requestsServed: state.requestCount,
      errorRate: round2(errorRate),
      memoryRssMb: round2(memory.rss / (1024 * 1024)),
      memoryHeapUsedMb: round2(memory.heapUsed / (1024 * 1024)),
      timestamp: new Date().toISOString(),
    }
  },

  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  emit(event) {
    emit(event)
  },
}
