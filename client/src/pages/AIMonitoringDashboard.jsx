import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { apiGet, apiPost } from '../services/apiClient'
import { TrendingUp, Brain, AlertCircle, Activity, ShieldAlert, Power, RotateCcw } from 'lucide-react'

const accentColors = ['#f472b6', '#22d3ee', '#818cf8', '#34d399']

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function AIMonitoringDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [cleanroomLatest, setCleanroomLatest] = useState(null)
  const [personaHistory, setPersonaHistory] = useState([])
  const [voiceHistory, setVoiceHistory] = useState([])
  const [safetyStatus, setSafetyStatus] = useState(null)
  const [isSafetyUpdating, setIsSafetyUpdating] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshLocalRuns = () => {
    setCleanroomLatest(readJson('biaslens_cleanroom_latest', null))
    setPersonaHistory(readJson('biaslens_persona_history', []).slice(0, 4))
    setVoiceHistory(readJson('biaslens_voice_history', []).slice(0, 8).reverse())
  }

  const refreshSafetyStatus = async () => {
    try {
      const safetyPayload = await apiGet('/api/safety/status')
      setSafetyStatus(safetyPayload || null)
      setLastUpdatedAt(new Date().toISOString())
    } catch {
      setSafetyStatus(null)
    }
  }

  useEffect(() => {
    const syncDashboardData = async () => {
      try {
        const [metricsResult, alertsResult, safetyResult] = await Promise.allSettled([
          apiGet('/api/system/metrics'),
          apiGet('/api/alerts'),
          apiGet('/api/safety/status'),
        ])

        const anySuccess = [metricsResult, alertsResult, safetyResult].some((result) => result.status === 'fulfilled')

        if (metricsResult.status === 'fulfilled') {
          setMetrics(metricsResult.value || null)
        }
        if (alertsResult.status === 'fulfilled') {
          setAlerts(alertsResult.value?.alerts?.slice(0, 4) || [])
        }
        if (safetyResult.status === 'fulfilled') {
          setSafetyStatus(safetyResult.value || null)
        }

        if (anySuccess) {
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch {
        // Keep existing dashboard data; fallback polling retries automatically.
      } finally {
        refreshLocalRuns()
        setLoading(false)
      }
    }

    syncDashboardData()
    const interval = setInterval(syncDashboardData, 8000)

    let eventSource
    if (typeof window !== 'undefined' && window.EventSource) {
      eventSource = new EventSource('/api/system/events')

      eventSource.addEventListener('connected', () => {
        setLiveConnected(true)
        setLastUpdatedAt(new Date().toISOString())
      })

      eventSource.addEventListener('metrics', (event) => {
        try {
          setMetrics(JSON.parse(event.data))
          setLiveConnected(true)
          setLastUpdatedAt(new Date().toISOString())
        } catch {
          // Ignore malformed SSE payloads.
        }
      })

      eventSource.addEventListener('analysis', () => {
        refreshLocalRuns()
        setLastUpdatedAt(new Date().toISOString())
      })

      eventSource.addEventListener('safety', async () => {
        await refreshSafetyStatus()
        setLiveConnected(true)
        setLastUpdatedAt(new Date().toISOString())
      })

      eventSource.onerror = () => {
        setLiveConnected(false)
      }
    }

    const onStorage = () => {
      refreshLocalRuns()
      setLastUpdatedAt(new Date().toISOString())
    }

    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(interval)
      eventSource?.close()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const handleArmToggle = async () => {
    if (!safetyStatus) return
    setIsSafetyUpdating(true)
    try {
      const payload = await apiPost('/api/safety/arm', { armed: !safetyStatus.armed })
      setSafetyStatus(payload)
    } finally {
      setIsSafetyUpdating(false)
    }
  }

  const handleResumeSafe = async () => {
    setIsSafetyUpdating(true)
    try {
      const payload = await apiPost('/api/safety/resume', {})
      setSafetyStatus(payload)
    } finally {
      setIsSafetyUpdating(false)
    }
  }

  const biasData = useMemo(() => {
    if (cleanroomLatest?.groupStats?.length) {
      return cleanroomLatest.groupStats.slice(0, 5).map((item, index) => ({
        feature: String(item.attribute || 'feature').replace(/(^\w|_\w)/g, (match) => match.replace('_', '').toUpperCase()),
        bias: Number(item.biasScore || 0),
        color: accentColors[index % accentColors.length],
      }))
    }

    return [
      { feature: 'Waiting', bias: 0.1, color: '#475569' },
      { feature: 'for', bias: 0.08, color: '#334155' },
      { feature: 'Clean Room Run', bias: 0.06, color: '#1e293b' },
    ]
  }, [cleanroomLatest])

  const personaData = useMemo(() => {
    if (personaHistory.length > 0) {
      return personaHistory.map((item) => ({
        persona: item.persona,
        fairness: Number(item?.analysis?.fairnessScore || 0),
      }))
    }

    return [
      { persona: 'Run Persona Probe', fairness: 0 },
    ]
  }, [personaHistory])

  const voiceData = useMemo(() => {
    if (voiceHistory.length > 0) {
      return voiceHistory.map((item) => {
        const bias = Number(item?.biasScore || 0)
        return {
          time: formatTime(item.timestamp),
          bias,
          fairness: Number((1 - bias).toFixed(3)),
        }
      })
    }

    return [{ time: 'N/A', bias: 0, fairness: 0 }]
  }, [voiceHistory])

  const kpis = useMemo(() => {
    const systemHealth = metrics
      ? Math.max(0, Math.min(100, Math.round((1 - (metrics.errorRate || 0)) * 100)))
      : 0
    const inferenceRate = metrics
      ? `${Math.max(1, Math.round((metrics.requestsServed || 0) / Math.max(1, metrics.systemUptime || 1) * 60))}/min`
      : '0/min'

    return [
      { icon: Brain, label: 'Models Active', value: metrics ? '7' : '0', color: 'text-cyan-400' },
      { icon: Activity, label: 'System Health', value: `${systemHealth}%`, color: 'text-emerald-400' },
      { icon: AlertCircle, label: 'Active Alerts', value: alerts.length, color: 'text-rose-400' },
      { icon: TrendingUp, label: 'Inference Rate', value: inferenceRate, color: 'text-purple-400' },
    ]
  }, [alerts.length, metrics])

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-white">AI Bias Monitoring Platform</h1>
        <p className="text-slate-300">Real-time analytics across all bias detection models</p>
        <p className="text-xs text-slate-400">
          Feed: {liveConnected ? 'Live stream connected' : 'Polling fallback'} | Last update: {formatTime(lastUpdatedAt)}
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass neon-ring rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-800/50 ${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bias by Feature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass neon-ring rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Bias Distribution by Feature</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={biasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="feature" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }} />
              <Bar dataKey="bias" radius={[8, 8, 0, 0]}>
                {biasData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Persona Fairness */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass neon-ring rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Persona Fairness Scores</h2>
          <div className="space-y-3">
            {personaData.map((persona, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{persona.persona}</span>
                  <span className="text-cyan-300 font-semibold">{(persona.fairness * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${persona.fairness * 100}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 1 }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Voice Bias Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass neon-ring rounded-2xl p-6 lg:col-span-2"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Voice Analysis Timeline</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={voiceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="bias" stroke="#f472b6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="fairness" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass neon-ring rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-emerald-500/10 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ShieldAlert size={18} className="text-amber-300" />
              Real-Time Bias Kill Switch
            </h2>
            <p className="mt-1 text-sm text-slate-300">Auto-triggered protection with rollback to safer policy and Bias Guard enforcement.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              safetyStatus?.status === 'TRIGGERED'
                ? 'border-rose-300/40 bg-rose-500/20 text-rose-100'
                : 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
            }`}>
              {safetyStatus?.status || 'UNKNOWN'}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              safetyStatus?.armed
                ? 'border-amber-300/40 bg-amber-500/20 text-amber-100'
                : 'border-slate-400/40 bg-slate-500/20 text-slate-200'
            }`}>
              {safetyStatus?.armed ? 'ARMED' : 'DISARMED'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleArmToggle}
            disabled={!safetyStatus || isSafetyUpdating}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/30 disabled:opacity-50"
          >
            <Power size={14} />
            {safetyStatus?.armed ? 'Disarm Kill Switch' : 'Arm Kill Switch'}
          </button>

          <button
            onClick={handleResumeSafe}
            disabled={isSafetyUpdating || !safetyStatus || safetyStatus.status !== 'TRIGGERED'}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Resume Safe Mode
          </button>

          <button
            onClick={refreshSafetyStatus}
            className="rounded-full border border-cyan-300/35 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
          >
            Refresh Status
          </button>
        </div>

        {safetyStatus?.activeIncident ? (
          <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-rose-200">Active Incident</p>
            <p className="mt-2 text-sm font-semibold text-rose-100">{safetyStatus.activeIncident.reason}</p>
            <p className="mt-1 text-xs text-slate-300">Responsible: {safetyStatus.activeIncident.responsibleFeature}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-200">
              {(safetyStatus.activeIncident.actions || []).map((action) => (
                <li key={action}>- {action}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Kill switch is monitoring live risk streams. No active incident right now.
          </div>
        )}

        {Array.isArray(safetyStatus?.incidents) && safetyStatus.incidents.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Incident Timeline</p>
            <div className="mt-2 space-y-2">
              {safetyStatus.incidents.slice(0, 3).map((incident) => (
                <div key={incident.id} className="rounded-lg border border-slate-400/20 bg-slate-900/60 p-3">
                  <p className="text-sm text-slate-100">{incident.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">{incident.source} • {new Date(incident.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass neon-ring rounded-2xl p-6 border-rose-400/30 bg-rose-500/5"
        >
          <h2 className="text-lg font-semibold text-rose-100 mb-4">🚨 Active Alerts</h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-rose-300/30 bg-slate-900/50 p-3"
              >
                <p className="text-sm font-semibold text-rose-200">{alert.message}</p>
                <p className="text-xs text-slate-400 mt-1">{alert.explainability?.why}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs text-slate-400 py-4"
      >
        <p>{loading ? 'Loading live telemetry...' : 'Dashboard uses live event stream with automatic polling fallback.'}</p>
      </motion.div>
    </motion.section>
  )
}

export default AIMonitoringDashboard
