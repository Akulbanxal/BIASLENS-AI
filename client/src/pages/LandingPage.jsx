import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, LayoutGrid, Gauge, ShieldCheck, Database, Mic, Fingerprint, TrendingUp } from 'lucide-react'

const quickModules = [
  {
    title: 'Data Clean Room',
    description: 'Checks if decisions are unfair to certain groups in your real data.',
    to: '/data-clean-room',
    icon: Database,
  },
  {
    title: 'Causal Twin',
    description: 'A what-if simulator to test model changes safely before launch.',
    to: '/causal-twin',
    icon: TrendingUp,
  },
  {
    title: 'Persona Probe',
    description: 'Tests chatbot replies across user types to catch bias early.',
    to: '/persona-probe',
    icon: Fingerprint,
  },
  {
    title: 'Voice Bias',
    description: 'Checks if accents or speaking style are treated unfairly.',
    to: '/voice-bias',
    icon: Mic,
  },
]

const featureMeanings = [
  {
    title: 'Data Clean Room',
    meaning: 'Finds unfair approval or rejection patterns in your dataset.',
    realLife: 'Useful for hiring, loans, insurance, and admissions checks.',
    icon: Database,
  },
  {
    title: 'Causal Twin',
    meaning: 'Lets you try policy changes and see impact before real users are affected.',
    realLife: 'Useful for safer model updates without production risk.',
    icon: TrendingUp,
  },
  {
    title: 'Persona Probe',
    meaning: 'Runs prompt tests for different people and flags biased responses.',
    realLife: 'Useful for support bots and AI assistants used by mixed audiences.',
    icon: Fingerprint,
  },
  {
    title: 'Voice Bias',
    meaning: 'Checks if voice systems treat accents or tone unfairly.',
    realLife: 'Useful for call centers, interview AI, and voice assistants.',
    icon: Mic,
  },
]

const winPillars = [
  {
    title: 'Detect',
    detail: 'Find hidden unfair patterns in approvals, denials, and model behavior before release.',
  },
  {
    title: 'Explain',
    detail: 'Show why bias happened and which feature is responsible in plain language.',
  },
  {
    title: 'Fix',
    detail: 'Apply mitigation strategies and preview before-vs-after fairness instantly.',
  },
  {
    title: 'Protect',
    detail: 'Use live monitoring and kill-switch controls to stop harmful output in real time.',
  },
]

const demoFlow = [
  'Load dataset and run Data Clean Room bias scan.',
  'Run Bias Guard and show fairness improvement after mitigation.',
  'Validate policy impact in Causal Twin before production rollout.',
  'Track live alerts and trigger-safe controls in AI Monitoring.',
]

function LandingPage() {
  return (
    <section className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass neon-ring rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/20 via-slate-900/30 to-indigo-500/20 p-6 sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Responsive-First Control Surface</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
          BiasLens AI Ops Center
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Start from a lightweight, mobile-ready home. Jump into modules fast, then open Reports for executive dashboards.
        </p>

        <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Challenge Objective</p>
          <p className="mt-2 text-sm leading-6 text-amber-50/95">
            Ensure fairness in automated decisions by giving teams a clear way to measure, flag, and fix harmful bias before real people are affected.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
          >
            Open Reports
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/data-clean-room"
            className="inline-flex items-center gap-2 rounded-full border border-indigo-300/35 bg-indigo-500/20 px-5 py-2.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
          >
            Start Analysis
            <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-5">
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass neon-ring rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-500/20 to-slate-900/40 p-5 xl:col-span-3"
        >
          <h2 className="text-lg font-semibold text-emerald-100">End-to-End Fairness System</h2>
          <p className="mt-2 text-sm text-slate-100/90">
            BiasLens is not just detection. It is an end-to-end fairness safety system: detect risk, explain cause, fix outcomes, and monitor live for rollback.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {winPillars.map((pillar) => (
              <div key={pillar.title} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">{pillar.title}</p>
                <p className="mt-1 text-sm text-slate-200">{pillar.detail}</p>
              </div>
            ))}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="glass neon-ring rounded-2xl border border-indigo-300/25 bg-slate-950/40 p-5 xl:col-span-2"
        >
          <h2 className="text-lg font-semibold text-indigo-100">90-Second Demo Flow</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-200">
            {demoFlow.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-300/35 bg-indigo-500/20 text-xs font-bold text-indigo-100">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </motion.article>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What This Project Does (Simple)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {featureMeanings.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.08 }}
              className="glass neon-ring rounded-2xl border border-cyan-300/20 bg-slate-950/45 p-5"
            >
              <div className="flex items-center gap-2">
                <item.icon size={16} className="text-cyan-300" />
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-200">{item.meaning}</p>
              <p className="mt-2 text-xs text-cyan-200/85">{item.realLife}</p>
            </motion.article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: LayoutGrid,
            title: 'Single-touch navigation',
            text: 'Primary actions and reports are grouped so you reach key views in 1 to 2 taps.',
          },
          {
            icon: Gauge,
            title: 'Fast load path',
            text: 'The home view avoids heavy charts and prioritizes instant interaction on mobile.',
          },
          {
            icon: ShieldCheck,
            title: 'Safety visible by default',
            text: 'Kill-switch and fairness workflows are accessible without digging through menus.',
          },
        ].map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass neon-ring rounded-2xl p-5"
          >
            <item.icon size={18} className="text-cyan-300" />
            <h2 className="mt-3 text-base font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{item.text}</p>
          </motion.article>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Core Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickModules.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + index * 0.08 }}
              className="glass neon-ring rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                </div>
                <item.icon size={18} className="text-indigo-300" />
              </div>
              <Link
                to={item.to}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
              >
                Open module <ArrowRight size={14} />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingPage