import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import {
  House,
  Database,
  Fingerprint,
  FileBarChart2,
  Mic,
  TrendingUp,
} from 'lucide-react'

const navItems = [
  { name: 'Home', icon: House, to: '/', end: true },
  { name: 'Reports', icon: FileBarChart2, to: '/reports' },
  { name: 'Data Clean Room', icon: Database, to: '/data-clean-room' },
  { name: 'Causal Twin', icon: TrendingUp, to: '/causal-twin' },
  { name: 'Persona Probe', icon: Fingerprint, to: '/persona-probe' },
  { name: 'Voice Bias', icon: Mic, to: '/voice-bias' },
]

function Sidebar() {
  return (
    <aside className="glass neon-ring hidden w-72 flex-col border-r border-slate-400/20 bg-slate-950/70 p-5 lg:flex">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-xl font-semibold tracking-wide text-cyan-200 text-glow">
          BiasLens AI
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
          Governance Console
        </p>
      </motion.div>

      <nav className="space-y-2">
        {navItems.map((item, index) => {
          const Icon = item.icon

          if (!item.to) {
            return (
              <motion.button
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * index }}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/20 px-3 py-3 text-left text-slate-500"
                type="button"
                disabled
              >
                <span className="rounded-lg bg-slate-900/60 p-2">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </motion.button>
            )
          }

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * index }}
            >
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100 shadow-neon'
                      : 'border-transparent bg-slate-900/30 text-slate-300 hover:border-indigo-300/30 hover:bg-indigo-400/10 hover:text-indigo-100'
                  }`
                }
              >
                <span className="rounded-lg bg-slate-900/70 p-2 group-hover:bg-slate-900/90">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </NavLink>
            </motion.div>
          )
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">System</p>
        <p className="mt-2 text-sm text-slate-200">Realtime bias monitor online.</p>
      </div>
    </aside>
  )
}

export default Sidebar
