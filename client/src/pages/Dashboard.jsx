import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSystemTelemetry } from '../hooks/useSystemTelemetry'

const initialRiskSeries = [
  { name: 'Mon', bias: 29, fairness: 84 },
  { name: 'Tue', bias: 27, fairness: 86 },
  { name: 'Wed', bias: 26, fairness: 87 },
  { name: 'Thu', bias: 24, fairness: 89 },
  { name: 'Fri', bias: 24, fairness: 90 },
  { name: 'Sat', bias: 23, fairness: 92 },
  { name: 'Sun', bias: 22, fairness: 91 },
]

const initialDriftSeries = [
  { t: '00:00', drift: 0.08 },
  { t: '04:00', drift: 0.09 },
  { t: '08:00', drift: 0.11 },
  { t: '12:00', drift: 0.12 },
  { t: '16:00', drift: 0.14 },
  { t: '20:00', drift: 0.13 },
  { t: '24:00', drift: 0.14 },
]

function Dashboard() {
  const { snapshot, connectionStatus } = useSystemTelemetry()
  const [riskSeries, setRiskSeries] = useState(initialRiskSeries)
  const [driftSeries, setDriftSeries] = useState(initialDriftSeries)

  const computed = useMemo(() => {
    const biasScore = Math.min(95, Math.max(8, 18 + snapshot.errorRate * 100 + (snapshot.memoryHeapUsedMb || 0) * 0.12))
    const fairnessIndex = Math.max(0, Math.min(100, 100 - biasScore + 6))
    const modelDrift = Math.min(0.2, Math.max(0.03, (snapshot.averageResponseTime || 0) / 3800))

    return {
      biasScore,
      fairnessIndex,
      modelDrift,
    }
  }, [snapshot])

  // Auto-update charts every 3 seconds (Live Simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      setRiskSeries((prev) => {
        const newBias = Math.round(computed.biasScore + (Math.random() - 0.5) * 4)
        const newFairness = Math.round(computed.fairnessIndex + (Math.random() - 0.5) * 3)
        const marker = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        return [...prev.slice(-6), {
          name: marker,
          bias: Math.min(95, Math.max(5, newBias)),
          fairness: Math.min(100, Math.max(20, newFairness)),
        }]
      })

      setDriftSeries((prev) => {
        const newDrift = Math.min(0.2, Math.max(0.03, computed.modelDrift + (Math.random() - 0.5) * 0.04))
        const marker = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        return [...prev.slice(-6), {
          t: marker,
          drift: Number(newDrift.toFixed(3)),
        }]
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [computed])

  const metrics = [
    { label: 'Bias Score', value: `${computed.biasScore.toFixed(1)}%`, delta: `${snapshot.analysesRun} analyses run` },
    { label: 'Fairness Index', value: computed.fairnessIndex.toFixed(1), delta: `${snapshot.recordsAnalyzed} records analyzed` },
    { label: 'Model Drift', value: computed.modelDrift.toFixed(3), delta: `${snapshot.averageResponseTime}ms latency` },
  ]

  return (
    <section className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Algorithmic Risk Surface</h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Live telemetry from fairness probes, causal twins, and voice behavior cohorts. Charts update every 3 seconds.
        </p>
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">
          Stream: {connectionStatus}
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => (
          <motion.article
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass neon-ring rounded-2xl p-5 relative overflow-hidden"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-800/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            <p className="text-sm uppercase tracking-[0.18em] text-slate-300">{metric.label}</p>
            <motion.div
              key={metric.value}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-3 text-3xl font-semibold text-cyan-100 text-glow"
            >
              {metric.value}
            </motion.div>
            <p className="mt-2 text-xs text-indigo-200">{metric.delta}</p>
          </motion.article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass neon-ring rounded-2xl p-5 xl:col-span-3"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-100">Bias vs Fairness Pulse</h3>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="h-3 w-3 rounded-full bg-cyan-400/60"
            />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskSeries}>
                <defs>
                  <linearGradient id="biasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fairGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(2,6,23,0.9)',
                    border: '1px solid rgba(148,163,184,0.4)',
                    borderRadius: '12px',
                  }}
                />
                <Area type="monotone" dataKey="bias" stroke="#22d3ee" fill="url(#biasGrad)" />
                <Area type="monotone" dataKey="fairness" stroke="#818cf8" fill="url(#fairGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="glass neon-ring rounded-2xl p-5 xl:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-100">Model Drift Timeline</h3>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="h-3 w-3 rounded-full bg-purple-400/60"
            />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={driftSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="t" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 0.2]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,23,42,0.92)',
                    border: '1px solid rgba(129,140,248,0.35)',
                    borderRadius: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="drift"
                  stroke="#c084fc"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#c084fc' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Dashboard
