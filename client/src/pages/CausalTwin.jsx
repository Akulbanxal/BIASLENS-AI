 import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, SlidersHorizontal } from 'lucide-react'
import ForceGraph2D from 'react-force-graph-2d'
import { apiGet, apiPost } from '../services/apiClient'
import { useApiFeedback } from '../hooks/useApiFeedback'

const INITIAL_GRAPH = { nodes: [], links: [] }

const getNodeId = (nodeRef) =>
  typeof nodeRef === 'object' && nodeRef !== null ? nodeRef.id : nodeRef

function CausalTwin() {
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [graphData, setGraphData] = useState(INITIAL_GRAPH)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [intervention, setIntervention] = useState(50)
  const [loading, setLoading] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState('')
  const [simulationMeta, setSimulationMeta] = useState(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 520 })
  const [scenarioInput, setScenarioInput] = useState({
    age: 36,
    income: 72000,
    educationYears: 14,
    creditScore: 690,
    region: 'urban',
  })
  const [scenarioProfile, setScenarioProfile] = useState({
    age: 36,
    income: 72000,
    educationYears: 14,
    creditScore: 690,
    region: 'urban',
  })
  const { runWithFeedback } = useApiFeedback()

  useEffect(() => {
    let isMounted = true
    async function loadGraph() {
      setLoading(true)
      setError('')
      try {
        const payload = await runWithFeedback(
          () => apiGet('/api/causal-graph'),
          {
            loadingMessage: '🔗 Loading causal relationships...',
            errorMessage: '🔄 Causal graph is loading. Please wait a moment.',
            useGlobalLoading: true,
          },
        )

        if (!isMounted) return
        setGraphData({ nodes: payload.nodes ?? [], links: payload.links ?? [] })
        setSelectedNodeId(payload.nodes?.[0]?.id ?? null)
      } catch (err) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadGraph()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current
      if (clientWidth && clientHeight) {
        setContainerSize({ width: clientWidth, height: clientHeight })
      }
    }
  }, [])

  useEffect(() => {
    if (!graphRef.current || !graphData.nodes.length) return
    try {
      graphRef.current.d3AlphaDecay(0.08)
      graphRef.current.zoomToFit(400, 60)
    } catch (e) {
      console.warn('Graph zoom failed:', e)
    }
  }, [graphData])

  useEffect(() => {
    if (!selectedNodeId || !graphData.nodes.length) return
    const timeoutId = setTimeout(async () => {
      try {
        setIsSimulating(true)
        const payload = await apiPost('/api/simulate-intervention', {
          feature: selectedNodeId,
          intervention,
          profile: scenarioProfile,
        })

        setGraphData({ nodes: payload.nodes ?? [], links: payload.links ?? [] })
        setSimulationMeta(payload.meta ?? null)
      } catch (err) {
        setError('Simulation paused. Update your scenario and try again.')
      } finally {
        setIsSimulating(false)
      }
    }, 250)
    return () => clearTimeout(timeoutId)
  }, [intervention, selectedNodeId, graphData.nodes.length, scenarioProfile])

  const onScenarioFieldChange = (key, value) => {
    setScenarioInput((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const applyScenario = () => {
    setScenarioProfile({
      age: Number(scenarioInput.age) || 36,
      income: Number(scenarioInput.income) || 72000,
      educationYears: Number(scenarioInput.educationYears) || 14,
      creditScore: Number(scenarioInput.creditScore) || 690,
      region: scenarioInput.region || 'urban',
    })
    setError('')
  }

  const selectedNodeDetails = useMemo(() => {
    if (!selectedNodeId) return null
    return graphData.nodes.find((node) => node.id === selectedNodeId) ?? null
  }, [graphData.nodes, selectedNodeId])

  const nodeRenderer = (node, ctx, globalScale) => {
    const isActive = node.id === selectedNodeId || node.id === hoveredNode?.id
    const impact = Number(node.impactScore ?? 0.5)
    const bias = Number(node.biasContribution ?? 0.3)
    const radius = (6 + impact * 9) * (isActive ? 1.15 : 1)
    const baseColor = node.color ?? '#60a5fa'
    const fontSize = 13 / globalScale
    try {
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI)
      ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(99, 102, 241, 0.12)'
      ctx.fill()

      // Keep original feature palette visible.
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = baseColor
      ctx.shadowColor = baseColor
      ctx.shadowBlur = isActive ? 22 : 10
      ctx.fill()
      ctx.shadowBlur = 0

      // Bias intensity overlay: low bias stays subtle, high bias adds warm tint.
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius * 0.78, 0, 2 * Math.PI)
      ctx.fillStyle = `rgba(248, 113, 113, ${Math.min(0.42, Math.max(0.05, bias * 0.45)).toFixed(2)})`
      ctx.fill()

      ctx.font = `500 ${fontSize}px Space Grotesk, sans-serif`
      ctx.fillStyle = '#e2e8f0'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(node.label, node.x, node.y + radius + 4)
    } catch (e) {
      console.warn('Node render error:', e)
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_330px]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass neon-ring rounded-3xl p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-cyan-100 text-glow">
              Causal Fairness Digital Twin
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Interactive causal network of sensitive and socioeconomic features.
            </p>
          </div>
          <div className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
            {isSimulating ? 'Simulating intervention...' : 'Simulation ready'}
          </div>
        </div>

        <div
          ref={containerRef}
          className="glass relative h-[520px] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55"
        >
          {loading ? (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              Loading causal graph...
            </div>
          ) : !graphData.nodes.length ? (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              No graph data available
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={containerSize.width}
              height={containerSize.height}
              backgroundColor="rgba(2,6,23,0.2)"
              nodeLabel={(node) => `${node.label}: impact ${node.impactScore}`}
              nodeCanvasObject={nodeRenderer}
              nodePointerAreaPaint={(node, color, ctx) => {
                try {
                  ctx.fillStyle = color
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI)
                  ctx.fill()
                } catch (e) {
                  console.warn('Node pointer paint failed:', e)
                }
              }}
              linkColor={(link) =>
                getNodeId(link.source) === hoveredNode?.id ||
                getNodeId(link.target) === hoveredNode?.id
                  ? 'rgba(56,189,248,0.85)'
                  : `rgba(148,163,184,${Math.min(0.85, 0.2 + Number(link.weight ?? 0.4) * 0.9).toFixed(2)})`
              }
              linkWidth={(link) => {
                const base = 0.8 + Number(link.weight ?? 0.5) * 3.2
                if (getNodeId(link.source) === hoveredNode?.id || getNodeId(link.target) === hoveredNode?.id) {
                  return base + 1.8
                }
                return base
              }}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={(link) => Math.max(1, (link.weight ?? 0.5) * 2)}
              linkDirectionalParticleSpeed={0.0038}
              onNodeHover={(node) => setHoveredNode(node ?? null)}
              onNodeClick={(node) => setSelectedNodeId(node?.id ?? null)}
              cooldownTicks={90}
              enableNodeDrag={true}
              enableNavigationControls={true}
            />
          )}
        </div>
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass neon-ring h-fit rounded-3xl p-5"
      >
        <h3 className="text-sm uppercase tracking-[0.25em] text-indigo-200">Feature Inspector</h3>

        {!selectedNodeDetails ? (
          <p className="mt-5 text-sm text-slate-300">Select a node to inspect its fairness profile.</p>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Feature</p>
              <p className="mt-2 text-xl font-semibold text-white">{selectedNodeDetails.label}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-indigo-300/20 bg-indigo-500/10 p-3">
                <p className="text-xs text-indigo-200">Feature impact score</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {(selectedNodeDetails.impactScore * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 p-3">
                <p className="text-xs text-fuchsia-200">Bias contribution %</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {(selectedNodeDetails.biasContribution * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300/20 bg-slate-900/60 p-4">
              <label
                htmlFor="intervention"
                className="flex items-center gap-2 text-sm font-medium text-slate-200"
              >
                <SlidersHorizontal size={14} />
                Simulate Intervention
              </label>
              <input
                id="intervention"
                type="range"
                min="0"
                max="100"
                value={intervention}
                onChange={(event) => setIntervention(Number(event.target.value))}
                className="mt-3 w-full accent-cyan-400"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>0%</span>
                <span>{intervention}%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Scenario Input</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-300">
                  Age
                  <input
                    type="number"
                    min="18"
                    max="90"
                    value={scenarioInput.age}
                    onChange={(event) => onScenarioFieldChange('age', event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-500/40 bg-slate-900/70 px-2 py-1 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Income
                  <input
                    type="number"
                    min="15000"
                    step="1000"
                    value={scenarioInput.income}
                    onChange={(event) => onScenarioFieldChange('income', event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-500/40 bg-slate-900/70 px-2 py-1 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Education (years)
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={scenarioInput.educationYears}
                    onChange={(event) => onScenarioFieldChange('educationYears', event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-500/40 bg-slate-900/70 px-2 py-1 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Credit Score
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={scenarioInput.creditScore}
                    onChange={(event) => onScenarioFieldChange('creditScore', event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-500/40 bg-slate-900/70 px-2 py-1 text-sm text-white"
                  />
                </label>
              </div>
              <label className="mt-2 block text-xs text-slate-300">
                Region
                <select
                  value={scenarioInput.region}
                  onChange={(event) => onScenarioFieldChange('region', event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-500/40 bg-slate-900/70 px-2 py-1 text-sm text-white"
                >
                  <option value="urban">Urban</option>
                  <option value="rural">Rural</option>
                  <option value="suburban">Suburban</option>
                </select>
              </label>

              <button
                type="button"
                onClick={applyScenario}
                className="mt-3 w-full rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30"
              >
                Apply Scenario Input
              </button>
            </div>

            {simulationMeta ? (
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Live Prediction</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-300">Predicted Bias</p>
                    <p className="font-semibold text-rose-200">{Math.round((simulationMeta.predictedBias ?? 0) * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-300">Predicted Fairness</p>
                    <p className="font-semibold text-emerald-200">{Math.round((simulationMeta.predictedFairness ?? 0) * 100)}%</p>
                  </div>
                </div>
                {Array.isArray(simulationMeta.scenarioInsights) && simulationMeta.scenarioInsights.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-cyan-300/15 pt-2 text-xs text-cyan-100/90">
                    {simulationMeta.scenarioInsights.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-500/10 p-3 text-rose-100">
            <AlertTriangle size={16} className="mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : null}
      </motion.aside>
    </section>
  )
}

export default CausalTwin
