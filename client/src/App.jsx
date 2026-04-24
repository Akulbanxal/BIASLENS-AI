import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import Layout from './components/Layout'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const ReportsHub = lazy(() => import('./pages/ReportsHub'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CausalTwin = lazy(() => import('./pages/CausalTwin'))
const DataCleanRoom = lazy(() => import('./pages/DataCleanRoom'))
const PersonaProbe = lazy(() => import('./pages/PersonaProbe'))
const VoiceBias = lazy(() => import('./pages/VoiceBias'))
const GlobalBiasScore = lazy(() => import('./pages/GlobalBiasScore'))
const AIMonitoringDashboard = lazy(() => import('./pages/AIMonitoringDashboard'))

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <LandingPage />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReportsHub />
              </Suspense>
            }
          />
          <Route
            path="reports/dashboard"
            element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="reports/ai-monitoring"
            element={
              <Suspense fallback={<PageLoader />}>
                <AIMonitoringDashboard />
              </Suspense>
            }
          />
          <Route
            path="reports/global-bias-score"
            element={
              <Suspense fallback={<PageLoader />}>
                <GlobalBiasScore />
              </Suspense>
            }
          />
          <Route
            path="causal-twin"
            element={
              <Suspense fallback={<PageLoader />}>
                <CausalTwin />
              </Suspense>
            }
          />
          <Route
            path="data-clean-room"
            element={
              <Suspense fallback={<PageLoader />}>
                <DataCleanRoom />
              </Suspense>
            }
          />
          <Route
            path="persona-probe"
            element={
              <Suspense fallback={<PageLoader />}>
                <PersonaProbe />
              </Suspense>
            }
          />
          <Route
            path="voice-bias"
            element={
              <Suspense fallback={<PageLoader />}>
                <VoiceBias />
              </Suspense>
            }
          />
          <Route
            path="global-bias-score"
            element={<Navigate to="/reports/global-bias-score" replace />}
          />
          <Route
            path="ai-monitoring"
            element={<Navigate to="/reports/ai-monitoring" replace />}
          />
          <Route
            path="dashboard"
            element={<Navigate to="/reports/dashboard" replace />}
          />
          <Route
            path="legacy-reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReportsHub />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
