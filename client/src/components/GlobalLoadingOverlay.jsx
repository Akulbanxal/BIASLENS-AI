import { motion } from 'framer-motion'

export function GlobalLoadingOverlay({ isLoading, message }) {
  if (!isLoading) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="h-3 w-3 rounded-full bg-cyan-400"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
        </div>
        <p className="text-sm text-slate-300 text-glow">{message || 'Loading...'}</p>
      </div>
    </motion.div>
  )
}
