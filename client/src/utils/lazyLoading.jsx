import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const CausalTwin = lazy(() => import('./pages/CausalTwin'))
const DataCleanRoom = lazy(() => import('./pages/DataCleanRoom'))
const PersonaProbe = lazy(() => import('./pages/PersonaProbe'))
const VoiceBias = lazy(() => import('./pages/VoiceBias'))
const GlobalBiasScore = lazy(() => import('./pages/GlobalBiasScore'))

function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center py-32"
    >
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-cyan-400"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export const lazyPages = {
  Dashboard: { component: Dashboard, loader: PageLoader },
  CausalTwin: { component: CausalTwin, loader: PageLoader },
  DataCleanRoom: { component: DataCleanRoom, loader: PageLoader },
  PersonaProbe: { component: PersonaProbe, loader: PageLoader },
  VoiceBias: { component: VoiceBias, loader: PageLoader },
  GlobalBiasScore: { component: GlobalBiasScore, loader: PageLoader },
}

export function LazyPage({ component: Component, loader: Loader }) {
  return (
    <Suspense fallback={<Loader />}>
      <Component />
    </Suspense>
  )
}
