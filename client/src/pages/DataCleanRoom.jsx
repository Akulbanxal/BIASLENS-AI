import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Shield, Zap, AlertTriangle, Bell, Info, WandSparkles } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { apiGet, apiPost } from '../services/apiClient';
import { useApiFeedback } from '../hooks/useApiFeedback';
import { useNotification } from '../contexts/NotificationContext';

const SKELETON_LOADER = (
  <div className="mt-6 space-y-4">
    <div className="h-8 w-3/4 rounded-md bg-slate-700/50 animate-pulse"></div>
    <div className="h-32 w-full rounded-md bg-slate-700/50 animate-pulse"></div>
    <div className="flex gap-4">
      <div className="h-24 w-1/2 rounded-md bg-slate-700/50 animate-pulse"></div>
      <div className="h-24 w-1/2 rounded-md bg-slate-700/50 animate-pulse"></div>
    </div>
  </div>
);

function DataCleanRoom() {
  const [file, setFile] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [schema, setSchema] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [privacySafeMode, setPrivacySafeMode] = useState(true);
  const [useCloudAnalysis, setUseCloudAnalysis] = useState(false);
  const [bigQueryAvailable, setBigQueryAvailable] = useState(false);
  const [cloudSetupHint, setCloudSetupHint] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);
  const [mitigationResult, setMitigationResult] = useState(null);
  const [isMitigating, setIsMitigating] = useState(false);
  const [applyFix, setApplyFix] = useState(false);
  const [mitigatedDataset, setMitigatedDataset] = useState(null);
  const [selectedSensitiveFeature, setSelectedSensitiveFeature] = useState('gender');
  const { runWithFeedback } = useApiFeedback();
  const { info } = useNotification();

  useEffect(() => {
    let mounted = true;
    let intervalId;

    const loadEnvStatus = async () => {
      try {
        const status = await apiGet('/api/system/env-status');
        if (!mounted) return;
        setBigQueryAvailable(Boolean(status?.bigQueryAvailable));
        setCloudSetupHint(status?.bigQueryStatus?.setupHint || '');
        if (!status?.bigQueryAvailable) {
          setUseCloudAnalysis(false);
        }
      } catch {
        if (!mounted) return;
        setBigQueryAvailable(false);
        setUseCloudAnalysis(false);
        setCloudSetupHint('Unable to reach cloud status endpoint. Check backend connectivity.');
      }
    };

    loadEnvStatus();
    intervalId = setInterval(loadEnvStatus, 8000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && uploadedFile.type === 'application/json') {
      setFile(uploadedFile);
      setError('');
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          if (Array.isArray(json) && json.length > 0) {
            setDataset(json);
            const firstRow = json[0];
            const generatedSchema = Object.keys(firstRow).map(key => ({
              name: key,
              type: typeof firstRow[key] === 'number' ? 'NUMERIC' : 'STRING'
            }));
            setSchema(generatedSchema);
          } else {
            setError('💡 JSON file should contain an array of records. Please try again.');
            info('Loading your dataset...', 3000);
          }
        } catch (err) {
          setError('📝 Hmm, that JSON looks a bit off. Check the format and try again.');
          info('Dataset parsing in progress...', 3000);
        }
      };
      reader.readAsText(uploadedFile);
    } else {
      setError('📂 Please upload a JSON file (.json).');
      info('Waiting for file selection...', 3000);
    }
  };

  const fetchSampleDataset = async () => {
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);
    try {
      const { data, schema, meta } = await runWithFeedback(
        () => apiGet('/api/cleanroom/sample'),
        {
          loadingMessage: 'Loading sample dataset...',
          successMessage: 'Sample dataset loaded.',
          errorMessage: 'Failed to fetch sample data.',
          useGlobalLoading: true,
        },
      );

      setDataset(data);
      setSchema(schema);
      if (typeof meta?.bigQueryAvailable === 'boolean') {
        setBigQueryAvailable(meta.bigQueryAvailable);
      }
      if (typeof meta?.cloudSetupHint === 'string') {
        setCloudSetupHint(meta.cloudSetupHint);
      }
      setFile({ name: 'sample_dataset.json' });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!schema) {
      setError('📊 Load a dataset first to run analysis. Try the sample data!');
      info('Preparing analysis...', 2500);
      return;
    }
    setIsAnalyzing(true);
    setError('');
    setAnalysisResult(null);
    try {
      const results = await runWithFeedback(
        () => apiPost('/api/cleanroom/analyze', {
          schema,
          privacySafeMode,
          dataset: applyFix && mitigatedDataset ? mitigatedDataset : dataset,
          analysisMode: useCloudAnalysis ? 'cloud' : 'local',
        }),
        {
          loadingMessage: '🔍 Scanning for bias in your dataset...',
          successMessage: '✨ Analysis complete! Check the results below.',
          errorMessage: '⚠️ Analysis paused. Please review your data and try again.',
          useGlobalLoading: true,
        },
      );

      setAnalysisResult(results);
      const cleanroomRecord = {
        timestamp: new Date().toISOString(),
        biasScore: results?.biasScore,
        fairnessScore: results?.fairnessScore,
        groupStats: results?.groupStats || [],
      };
      localStorage.setItem('biaslens_cleanroom_latest', JSON.stringify(cleanroomRecord));
      const cleanroomHistory = JSON.parse(localStorage.getItem('biaslens_cleanroom_history') || '[]');
      localStorage.setItem(
        'biaslens_cleanroom_history',
        JSON.stringify([cleanroomRecord, ...cleanroomHistory].slice(0, 12)),
      );

      const alertPayload = await apiGet('/api/alerts');
      setAlerts(Array.isArray(alertPayload?.alerts) ? alertPayload.alerts : []);
      setAlertSummary(alertPayload?.summary || null);

      if (results?.meta?.provider === 'local-fallback') {
        info('💡 Cloud credentials not available. Using local analysis (same results!)', 4000);
      }
    } catch (err) {
      setError('⚠️ Analysis encountered an issue. Your data is safe—try adjusting your dataset or using the sample.');
      info('Troubleshooting...', 3000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runBiasGuard = async () => {
    if (!dataset || !schema) {
      setError('📊 Load a dataset first to run Bias Guard.');
      return;
    }

    setIsMitigating(true);
    setApplyFix(false);
    try {
      const result = await runWithFeedback(
        () =>
          apiPost('/api/bias/mitigate', {
            dataset,
            schema,
            selectedFeature: selectedSensitiveFeature,
            privacySafeMode,
          }),
        {
          loadingMessage: '🛡️ Bias Guard is applying real-time intervention...',
          successMessage: '✅ Bias Guard completed mitigation simulation.',
          errorMessage: 'Bias Guard could not complete this pass. Please try again.',
          useGlobalLoading: true,
        },
      );

      setMitigationResult(result);
      setMitigatedDataset(result?.mitigatedDataset || null);
    } catch {
      setError('🛠️ Bias Guard paused. Please review your selected feature and try again.');
    } finally {
      setIsMitigating(false);
    }
  };

  const fairnessScoreData = useMemo(() => {
    if (!analysisResult) return [];
    const fairnessBase = applyFix && mitigationResult ? mitigationResult.after.fairness : analysisResult.fairnessScore;
    const score = Math.round(Number(fairnessBase || 0) * 100);
    return [{ name: 'Fairness Score', value: score, fill: '#38bdf8' }];
  }, [analysisResult, applyFix, mitigationResult]);

  const displayedBiasScore = useMemo(() => {
    if (applyFix && mitigationResult) {
      return Number(mitigationResult.after.bias || 0);
    }
    return Number(analysisResult?.biasScore || 0);
  }, [analysisResult, applyFix, mitigationResult]);

  const latestAlerts = useMemo(() => {
    if (analysisResult?.alerts?.length) {
      return analysisResult.alerts;
    }
    return alerts.slice(0, 4);
  }, [analysisResult, alerts]);

  const explainability = useMemo(() => {
    if (!analysisResult) {
      return {
        whyBiasOccurred: '',
        responsibleFeature: '',
      };
    }

    if (analysisResult.explainability) {
      return analysisResult.explainability;
    }

    const topFeature = [...(analysisResult.groupStats || [])].sort((a, b) => b.biasScore - a.biasScore)[0];

    return {
      whyBiasOccurred: topFeature
        ? `${topFeature.attribute} has the largest approval-rate separation across sensitive groups.`
        : 'No explainability narrative available for this run.',
      responsibleFeature: topFeature?.attribute || 'Unknown',
    };
  }, [analysisResult]);

  const sensitiveFeatureOptions = useMemo(() => {
    const keys = (schema || []).map((item) => String(item.name || '').toLowerCase());
    return ['gender', 'age', 'income', 'race', 'ethnicity'].filter((feature) => keys.includes(feature));
  }, [schema]);

  useEffect(() => {
    if (sensitiveFeatureOptions.length === 0) {
      setSelectedSensitiveFeature('gender');
      return;
    }
    if (!sensitiveFeatureOptions.includes(selectedSensitiveFeature)) {
      setSelectedSensitiveFeature(sensitiveFeatureOptions[0]);
    }
  }, [sensitiveFeatureOptions, selectedSensitiveFeature]);

  const mitigationChartData = useMemo(() => {
    if (!mitigationResult) return [];
    return [
      {
        stage: 'Before',
        bias: Number((mitigationResult.before.bias * 100).toFixed(2)),
        fairness: Number((mitigationResult.before.fairness * 100).toFixed(2)),
      },
      {
        stage: 'After',
        bias: Number((mitigationResult.after.bias * 100).toFixed(2)),
        fairness: Number((mitigationResult.after.fairness * 100).toFixed(2)),
      },
    ];
  }, [mitigationResult]);

  const cloudModeLabel = useMemo(() => {
    if (analysisResult?.meta?.provider === 'bigquery') {
      return 'Cloud Mode';
    }
    if (analysisResult?.meta?.provider === 'local-fallback') {
      return 'Local Mode (Cloud Fallback)';
    }
    return useCloudAnalysis ? 'Cloud Mode' : 'Local Mode';
  }, [analysisResult, useCloudAnalysis]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-glow text-cyan-200">Data Clean Room</h1>
          <p className="mt-1 text-slate-300">Analyze dataset fairness in a privacy-preserving environment.</p>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="privacy-mode" className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <Shield size={16} className={privacySafeMode ? 'text-cyan-400' : 'text-slate-500'} />
            Privacy Safe Mode
          </label>
          <button
            id="privacy-mode"
            onClick={() => setPrivacySafeMode(!privacySafeMode)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              privacySafeMode ? 'bg-cyan-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                privacySafeMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <label htmlFor="cloud-mode" className="ml-2 flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <Bell size={16} className={useCloudAnalysis ? 'text-amber-300' : 'text-slate-500'} />
            Use Google Cloud Analysis
          </label>
          <button
            id="cloud-mode"
            onClick={() => setUseCloudAnalysis(!useCloudAnalysis)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              useCloudAnalysis ? 'bg-amber-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                useCloudAnalysis ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-100">
          {cloudModeLabel}
        </span>
        {useCloudAnalysis && !bigQueryAvailable && (
          <span className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
            Cloud requested. Running local fallback until credentials are ready.
          </span>
        )}
        {!bigQueryAvailable && (
          <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
            {cloudSetupHint || 'Cloud not configured. Set GOOGLE_PROJECT_ID and ADC/service-account credentials.'}
          </span>
        )}
      </div>

      {/* Upload and Preview Section */}
      <div className="glass neon-ring grid gap-6 rounded-2xl p-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <UploadCloud size={20} />
            Upload Dataset
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50 p-4 text-center transition hover:border-cyan-400 hover:bg-slate-800">
              <input type="file" className="sr-only" onChange={handleFileChange} accept=".json" />
              <p className="text-sm text-slate-300">
                {file ? `Selected: ${file.name}` : 'Click to upload a JSON file'}
              </p>
            </label>
            <span className="text-sm text-slate-400">OR</span>
            <button
              onClick={fetchSampleDataset}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Use Sample'}
            </button>
          </div>
          {dataset && (
            <div className="mt-4">
              <h3 className="text-md font-semibold text-slate-200">Dataset Preview</h3>
              <div className="max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900/70 mt-2">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr>
                      {schema?.map(col => <th key={col.name} className="p-2 font-semibold">{col.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-slate-700">
                        {schema?.map(col => <td key={col.name} className="p-2 truncate max-w-xs">{String(row[col.name])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg bg-slate-800/40 p-6 text-center">
          <FileText size={32} className="text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-100">Ready for Analysis</h3>
          <p className="text-sm text-slate-300">
            Once your dataset is loaded, you can run the bias and fairness analysis.
          </p>
          <button
            onClick={runAnalysis}
            disabled={!dataset || isAnalyzing}
            className="flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap size={18} />
            {isAnalyzing ? 'Analyzing...' : 'Run Bias Analysis'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-500/10 p-4 text-rose-300 border border-rose-500/30">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {latestAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-rose-400/35 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.35),_rgba(15,23,42,0.9)_55%)] p-6 shadow-[0_18px_60px_-22px_rgba(244,63,94,0.75)]"
        >
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-rose-500/25 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-wide text-rose-100">Bias Alert System</h2>
              <span className="rounded-full border border-rose-200/35 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100">
                Active Alerts: {alertSummary?.active ?? latestAlerts.length}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {latestAlerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-rose-200/25 bg-slate-950/50 p-4 backdrop-blur-sm">
                  <p className="text-sm font-bold text-rose-200">{alert.message}</p>
                  <p className="mt-2 text-xs text-slate-300">{alert.explainability?.why || 'Approval-rate divergence exceeded threshold.'}</p>
                  <p className="mt-2 text-xs text-rose-100/85">Responsible feature: {alert.explainability?.responsibleFeature || alert.feature}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.25),_rgba(16,185,129,0.25)_45%,_rgba(15,23,42,0.95)_78%)] p-6 shadow-[0_18px_60px_-22px_rgba(16,185,129,0.6)]"
      >
        <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-rose-500/20 blur-2xl" />
        <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-wide text-emerald-100">Real-Time Bias Guard</h2>
              <p className="mt-1 text-sm text-slate-200/90">Auto Intervention Engine: detect, mitigate, and simulate corrected outcomes instantly.</p>
            </div>
            {applyFix ? (
              <span className="rounded-full border border-emerald-200/45 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-100">
                Auto-Mitigation Active
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Sensitive Feature</label>
            <select
              value={selectedSensitiveFeature}
              onChange={(event) => setSelectedSensitiveFeature(event.target.value)}
              className="rounded-lg border border-emerald-300/25 bg-slate-900/65 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
              disabled={sensitiveFeatureOptions.length === 0}
            >
              {(sensitiveFeatureOptions.length > 0 ? sensitiveFeatureOptions : ['gender']).map((feature) => (
                <option key={feature} value={feature}>{feature}</option>
              ))}
            </select>

            <button
              onClick={runBiasGuard}
              disabled={!dataset || isMitigating}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-500/20 px-5 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WandSparkles size={16} />
              {isMitigating ? 'Running Bias Guard...' : 'Run Bias Guard'}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-200">Apply Fix</span>
              <button
                onClick={() => setApplyFix((prev) => !prev)}
                disabled={!mitigationResult}
                className={`relative inline-flex h-6 w-11 rounded-full transition ${applyFix ? 'bg-emerald-500' : 'bg-slate-600'} disabled:opacity-40`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${applyFix ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          {mitigationResult ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-5">
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 lg:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Before vs After</p>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={mitigationChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="stage" stroke="#cbd5e1" />
                      <YAxis domain={[0, 100]} stroke="#cbd5e1" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(2, 6, 23, 0.95)',
                          border: '1px solid rgba(148,163,184,0.35)',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="bias" radius={[8, 8, 0, 0]}>
                        {mitigationChartData.map((row, index) => (
                          <Cell key={`bias-${index}`} fill={row.stage === 'Before' ? '#f87171' : '#34d399'} />
                        ))}
                      </Bar>
                      <Bar dataKey="fairness" radius={[8, 8, 0, 0]}>
                        {mitigationChartData.map((row, index) => (
                          <Cell key={`fairness-${index}`} fill={row.stage === 'Before' ? '#fb7185' : '#10b981'} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Strategy Explanation</p>
                <p className="mt-3 text-lg font-bold text-emerald-100">{mitigationResult.strategyUsed}</p>
                <p className="mt-3 text-sm leading-6 text-slate-200">{mitigationResult.explanation}</p>
                <div className="mt-4 space-y-1 text-xs text-slate-300">
                  <p>Before Bias: {(mitigationResult.before.bias * 100).toFixed(1)}%</p>
                  <p>After Bias: {(mitigationResult.after.bias * 100).toFixed(1)}%</p>
                  <p>Fairness Gain: {((mitigationResult.after.fairness - mitigationResult.before.fairness) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-200/85">Run Bias Guard to compare before/after mitigation and preview auto-correction impact in real time.</p>
          )}
        </div>
      </motion.div>

      {/* Analysis Results Section */}
      {isAnalyzing ? SKELETON_LOADER : analysisResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass neon-ring-indigo mt-6 space-y-6 rounded-2xl p-6"
        >
          <h2 className="text-xl font-semibold text-indigo-200 text-glow">Analysis Results</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Fairness Score */}
            <div className="flex flex-col items-center justify-center rounded-lg bg-slate-800/50 p-4">
              <h3 className="text-lg font-semibold text-slate-200">Overall Fairness Score</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart innerRadius="70%" outerRadius="85%" data={fairnessScoreData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background dataKey="value" angleAxisId={0} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-4xl font-bold">
                    {fairnessScoreData[0].value}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="text-sm text-amber-300">
                Bias Score: {(displayedBiasScore * 100).toFixed(1)}%
              </p>
              {applyFix && mitigationResult ? (
                <p className="mt-1 text-xs text-emerald-300">Showing mitigated preview (Apply Fix enabled)</p>
              ) : null}
            </div>

            {/* Sensitive Attributes */}
            <div className="rounded-lg bg-slate-800/50 p-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-200">Approval Rate by Sensitive Group</h3>
              <div className="mt-4 space-y-4">
                {analysisResult.groupStats.map(stat => (
                  <div key={stat.attribute}>
                    <h4 className="font-semibold text-indigo-300">
                      {stat.attribute} · bias {(stat.biasScore * 100).toFixed(1)}%
                    </h4>
                    <ResponsiveContainer width="100%" height={100}>
                      <RechartsBarChart
                        data={stat.groups.map(group => ({
                          name: group.group,
                          value: Number((group.approvalRate * 100).toFixed(2)),
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" width={70} />
                        <Tooltip cursor={{fill: 'rgba(129, 140, 248, 0.1)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #4f46e5'}}/>
                        <Bar dataKey="value" barSize={20}>
                          {stat.groups.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#a78bfa', '#e879f9'][index % 3]} />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
              {analysisResult.flaggedAttributes?.length > 0 ? (
                <p className="mt-4 text-sm text-rose-300">
                  Flagged attributes: {analysisResult.flaggedAttributes.join(', ')}
                </p>
              ) : (
                <p className="mt-4 text-sm text-emerald-300">No attributes currently flagged.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                <Info size={14} />
                Why Bias Occurred
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-100">{explainability.whyBiasOccurred || 'No explainability details available yet.'}</p>
            </div>
            <div className="rounded-xl border border-indigo-300/25 bg-indigo-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Feature Responsible</p>
              <p className="mt-3 text-2xl font-extrabold text-white">{explainability.responsibleFeature || 'Unknown'}</p>
              <p className="mt-2 text-xs text-slate-300">This feature currently contributes the largest approval-rate gap across sensitive groups.</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

export default DataCleanRoom;
