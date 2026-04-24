import { motion } from 'framer-motion'

export function SkeletonPulse() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="h-full w-full bg-gradient-to-r from-slate-700 to-slate-800 rounded"
    />
  )
}

export function MetricSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass neon-ring rounded-2xl p-5 space-y-3"
    >
      <div className="h-4 w-24 rounded bg-slate-700/50">
        <SkeletonPulse />
      </div>
      <div className="h-8 w-32 rounded bg-slate-700/50">
        <SkeletonPulse />
      </div>
      <div className="h-3 w-28 rounded bg-slate-700/50">
        <SkeletonPulse />
      </div>
    </motion.div>
  )
}

export function ChartSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass neon-ring rounded-2xl p-5 space-y-4"
    >
      <div className="h-6 w-32 rounded bg-slate-700/50">
        <SkeletonPulse />
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded bg-slate-700/50">
            <SkeletonPulse />
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function AlertSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-rose-200/25 bg-slate-950/50 p-4 space-y-3"
    >
      <div className="h-4 w-48 rounded bg-slate-700/50">
        <SkeletonPulse />
      </div>
      <div className="h-3 w-full rounded bg-slate-700/50">
        <SkeletonPulse />
      </div>
      <div className="h-3 w-32 rounded bg-slate-700/50">
        <SkeletonPulse />
      </div>
    </motion.div>
  )
}
