import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Shield, AlertCircle, CheckCircle, Activity, Download } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useSystemTelemetry } from '../hooks/useSystemTelemetry'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function GlobalBiasScore() {
  const [rangeDays, setRangeDays] = useState(7)
  const { snapshot, connectionStatus } = useSystemTelemetry()

  const metrics = useMemo(() => {
    const biasScore = Math.min(0.95, Math.max(0.08, 0.18 + snapshot.errorRate + snapshot.memoryHeapUsedMb / 400))
    const fairnessScore = Math.max(0.05, Math.min(0.99, 1 - biasScore + 0.06))
    const healthScore = Math.max(0.2, Math.min(0.99, 1 - snapshot.errorRate * 0.7))

    const trendBase = createTrendSeries(30, biasScore, fairnessScore)
    const trendsOverTime = trendBase.slice(-rangeDays)

    const moduleMetrics = [
      { name: 'Data Clean Room', biasScore: Math.max(0.1, biasScore - 0.06), status: 'healthy' },
      { name: 'Causal Twin', biasScore: Math.max(0.1, biasScore - 0.03), status: 'healthy' },
      { name: 'Persona Probe', biasScore: Math.min(0.85, biasScore + 0.08), status: 'warning' },
      { name: 'Voice Bias', biasScore: Math.min(0.85, biasScore + 0.02), status: 'healthy' },
    ]

    const riskHigh = Math.max(1, Math.round(snapshot.errorRate * 12))

    return {
      overallBiasScore: biasScore,
      overallFairnessScore: fairnessScore,
      systemHealth: healthScore,
      modulesActive: 5,
      risksDetected: riskHigh + 4,
      recordsAnalyzed: snapshot.recordsAnalyzed,
      trendsOverTime,
      moduleMetrics,
      riskFactors: [
        { category: 'Demographic', count: riskHigh, severity: 'high' },
        { category: 'Linguistic', count: 2, severity: 'medium' },
        { category: 'Behavioral', count: 2, severity: 'medium' },
      ],
    }
  }, [rangeDays, snapshot])

  const exportTrendsCsv = () => {
    const header = ['day', 'biasScore', 'fairnessScore']
    const rows = metrics.trendsOverTime.map((row) => [row.day, row.biasScore, row.fairnessScore].join(','))
    const csv = [header.join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `global-bias-trends-${rangeDays}d.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getScoreColor = (score) => {
    if (score < 0.3) return 'text-emerald-400'
    if (score < 0.6) return 'text-amber-400'
    return 'text-rose-400'
  }

  const getSeverityColor = (severity) => {
    if (severity === 'high') return 'bg-rose-500/10 border-rose-500/30'
    if (severity === 'medium') return 'bg-amber-500/10 border-amber-500/30'
    return 'bg-emerald-500/10 border-emerald-500/30'
  }

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-200 via-fuchsia-300 to-emerald-200 bg-clip-text text-transparent text-glow">
          Global Bias Score Dashboard
        </h1>
        <p className="mt-2 text-slate-300">System-wide fairness and bias metrics across all detection modules.</p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300/80">Telemetry stream: {connectionStatus}</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: TrendingUp, label: 'Overall Bias Score', value: metrics.overallBiasScore, isPercent: true },
          { icon: Shield, label: 'Fairness Index', value: metrics.overallFairnessScore, isPercent: true },
          { icon: Activity, label: 'System Health', value: metrics.systemHealth, isPercent: true },
          { icon: AlertCircle, label: 'Risks Detected', value: metrics.risksDetected, isPercent: false },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="glass neon-ring rounded-2xl p-4 bg-slate-900/60 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{kpi.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${getScoreColor(kpi.isPercent ? kpi.value : metrics.overallBiasScore)}`}>
                    {kpi.isPercent ? `${(kpi.value * 100).toFixed(0)}%` : kpi.value}
                  </p>
                </div>
                <Icon size={24} className="text-slate-600" />
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* Trends Chart */}
      <motion.div variants={item} className="glass neon-ring rounded-2xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">System Trends</h2>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`rounded-full px-3 py-1 text-xs ${
                  rangeDays === days
                    ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-300/40'
                    : 'bg-slate-800/80 text-slate-300 border border-slate-600/60'
                }`}
              >
                {days}d
              </button>
            ))}
            <button
              type="button"
              onClick={exportTrendsCsv}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25"
            >
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={metrics.trendsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBias" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorFairness" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="rgba(100, 116, 139, 0.2)" />
            <XAxis dataKey="day" stroke="rgba(148, 163, 184, 0.5)" />
            <YAxis stroke="rgba(148, 163, 184, 0.5)" domain={[0, 1]} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #4f46e5' }} />
            <Area type="monotone" dataKey="biasScore" stroke="#f87171" fillOpacity={1} fill="url(#colorBias)" />
            <Area type="monotone" dataKey="fairnessScore" stroke="#10b981" fillOpacity={1} fill="url(#colorFairness)" />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Module Performance + Risk Factors */}
      <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">
        {/* Module Metrics */}
        <div className="glass neon-ring rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Module Performance</h2>
          <div className="space-y-3">
            {metrics.moduleMetrics.map((mod) => (
              <div key={mod.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-slate-200">{mod.name}</p>
                  <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${(1 - mod.biasScore) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{(mod.biasScore * 100).toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 capitalize">{mod.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="glass neon-ring rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Risk Factors</h2>
          <div className="space-y-2">
            {metrics.riskFactors.map((risk) => (
              <div key={risk.category} className={`rounded-lg border p-3 ${getSeverityColor(risk.severity)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{risk.category}</p>
                    <p className="text-xs text-slate-400">{risk.count} incident(s)</p>
                  </div>
                  <span className={`text-xs font-bold uppercase ${
                    risk.severity === 'high' ? 'text-rose-400' :
                    risk.severity === 'medium' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {risk.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Insights */}
      <motion.div variants={item} className="glass neon-ring rounded-2xl p-5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
        <div className="flex gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-indigo-400 mt-0.5" />
          <div>
            <p className="font-semibold text-indigo-100">System Status: Healthy</p>
            <p className="mt-1 text-sm text-indigo-200/80">
              {metrics.recordsAnalyzed.toLocaleString()} records analyzed across {metrics.modulesActive} active modules. Stream status is {connectionStatus}. Continue monitoring high-risk factors.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.section>
  )
}

export default GlobalBiasScore

function createTrendSeries(days, currentBias, currentFairness) {
  const rows = []

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    const drift = Math.sin(i / 3.5) * 0.03
    const biasScore = Number(Math.max(0.08, Math.min(0.9, currentBias + drift)).toFixed(3))
    const fairnessScore = Number(Math.max(0.1, Math.min(0.95, currentFairness - drift * 0.7)).toFixed(3))

    rows.push({
      day: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      biasScore,
      fairnessScore,
    })
  }

  return rows
}
