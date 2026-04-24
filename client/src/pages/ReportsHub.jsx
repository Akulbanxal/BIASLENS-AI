import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, BarChart3, Activity } from 'lucide-react'

const reportCards = [
  {
    title: 'Executive Dashboard',
    description: 'Live risk surface, fairness pulse, and drift timeline.',
    to: '/reports/dashboard',
    icon: LayoutDashboard,
    badge: 'Realtime',
  },
  {
    title: 'AI Monitoring',
    description: 'Cross-model telemetry with kill-switch status and incident timeline.',
    to: '/reports/ai-monitoring',
    icon: BarChart3,
    badge: 'Operations',
  },
  {
    title: 'Global Bias Score',
    description: 'High-level scorecard for model fairness and governance posture.',
    to: '/reports/global-bias-score',
    icon: Activity,
    badge: 'Governance',
  },
]

function ReportsHub() {
  return (
    <section className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass neon-ring rounded-3xl border border-indigo-300/20 bg-gradient-to-r from-indigo-500/20 via-slate-900/25 to-cyan-500/20 p-6 sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Reports</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Reporting Center</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          All key reporting views live here: Dashboard, AI Monitoring, and Global Bias Score.
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map((card, index) => (
          <motion.article
            key={card.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass neon-ring rounded-2xl p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <card.icon size={18} className="text-cyan-300" />
              <span className="rounded-full border border-cyan-300/30 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                {card.badge}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{card.description}</p>
            <Link
              to={card.to}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-200 transition hover:text-indigo-100"
            >
              Open report <ArrowRight size={14} />
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

export default ReportsHub