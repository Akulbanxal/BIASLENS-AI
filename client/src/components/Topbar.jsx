import { Bell, Search, Sparkles, UserCircle2, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { apiGet } from '../services/apiClient'

function Topbar() {
  const [demoMode, setDemoMode] = useState(false)
  const [systemActive, setSystemActive] = useState(true)

  useEffect(() => {
    let mounted = true
    let intervalId

    const loadEnvStatus = async () => {
      try {
        const status = await apiGet('/api/system/env-status')
        if (mounted) {
          setDemoMode(Boolean(status?.demoMode))
          setSystemActive(true)
        }
      } catch {
        if (mounted) {
          setDemoMode(false)
          setSystemActive(false)
        }
      }
    }

    loadEnvStatus()
    intervalId = setInterval(loadEnvStatus, 5000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass neon-ring flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
    >
      <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-slate-300/15 bg-slate-950/50 px-3 py-2">
        <Search size={16} className="text-slate-400" />
        <input
          type="search"
          placeholder="Search metrics, cohorts, audits"
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          systemActive 
            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100' 
            : 'border-rose-400/40 bg-rose-500/15 text-rose-100'
        }`}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`h-2 w-2 rounded-full ${systemActive ? 'bg-emerald-400' : 'bg-rose-400'}`}
          />
          AI System Status: {systemActive ? 'Active' : 'Offline'}
          {demoMode && ' (Demo)'}
        </div>
        <button className="rounded-xl border border-cyan-200/20 bg-cyan-400/10 p-2 text-cyan-200 transition hover:bg-cyan-400/20">
          <Sparkles size={16} />
        </button>
        <button className="rounded-xl border border-slate-200/20 bg-slate-800/50 p-2 text-slate-200 transition hover:bg-slate-700/60">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/20 bg-slate-900/70 px-3 py-1.5">
          <UserCircle2 size={18} className="text-indigo-300" />
          <div>
            <p className="text-xs text-slate-400">Analyst</p>
            <p className="text-sm font-medium text-slate-100">A. Iyer</p>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

export default Topbar
