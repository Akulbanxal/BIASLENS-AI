import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Mic, PauseCircle, PlayCircle, Radio, Sparkles } from 'lucide-react'
import { apiUpload } from '../services/apiClient'
import { useApiFeedback } from '../hooks/useApiFeedback'

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return ''
  const preferred = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]

  const supported = preferred.find((type) => MediaRecorder.isTypeSupported(type))
  return supported ?? ''
}

function VoiceBias() {
  const [permissionState, setPermissionState] = useState('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [audioURL, setAudioURL] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [streamingTick, setStreamingTick] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const { runWithFeedback } = useApiFeedback()

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const rafRef = useRef(null)
  const canvasRef = useRef(null)

  const resetAudioNodes = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }

    analyserRef.current = null
  }

  const drawWaveform = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    const bufferLength = analyser.frequencyBinCount
    const data = new Uint8Array(bufferLength)

    const render = () => {
      analyser.getByteTimeDomainData(data)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
      gradient.addColorStop(0, 'rgba(34, 211, 238, 0.7)')
      gradient.addColorStop(1, 'rgba(244, 114, 182, 0.9)')

      ctx.lineWidth = 2
      ctx.strokeStyle = gradient
      ctx.shadowColor = 'rgba(34, 211, 238, 0.8)'
      ctx.shadowBlur = 9

      ctx.beginPath()
      const sliceWidth = canvas.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i += 1) {
        const v = data[i] / 128
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()

      rafRef.current = requestAnimationFrame(render)
    }

    render()
  }

  const beginWaveformCapture = (stream) => {
    resetAudioNodes()
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) return

    const audioContext = new AudioContextCtor()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)

    analyser.fftSize = 2048
    source.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceNodeRef.current = source

    drawWaveform()
  }

  const stopStreamTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }

  const startRecording = async () => {
    setError('')
    setResult(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaRecorder is not supported in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      setPermissionState('granted')

      const mimeType = pickMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioURL((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        stopStreamTracks()
        resetAudioNodes()
      }

      recorder.start(250)
      beginWaveformCapture(stream)
      setIsRecording(true)
    } catch (recordError) {
      setPermissionState('denied')
      setError('🎤 Microphone access needed. Please allow access and try again.')
      stopStreamTracks()
      resetAudioNodes()
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    mediaRecorderRef.current.stop()
    setIsRecording(false)
  }

  const analyzeRecording = async () => {
    if (!audioBlob) {
      setError('🎙️ Record some audio first, then we can analyze it.')
      return
    }

    setError('')
    setIsAnalyzing(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice-sample.webm')

      const payload = await runWithFeedback(
        () => apiUpload('/api/voice/analyze', formData),
        {
          loadingMessage: '🎧 Analyzing voice patterns...',
          successMessage: '✨ Voice analysis complete!',
          errorMessage: '💡 Voice analysis is processing. Please wait a moment.',
          useGlobalLoading: true,
        },
      )

      setResult(payload)
      const voiceRecord = {
        timestamp: new Date().toISOString(),
        biasScore: payload?.biasScore,
        accentClassification: payload?.accentClassification,
        confidence: payload?.meta?.confidence,
      }
      localStorage.setItem('biaslens_voice_latest', JSON.stringify(voiceRecord))
      const voiceHistory = JSON.parse(localStorage.getItem('biaslens_voice_history') || '[]')
      localStorage.setItem('biaslens_voice_history', JSON.stringify([voiceRecord, ...voiceHistory].slice(0, 20)))
    } catch (analyzeError) {
      setError('🎤 Voice analysis is steady. Try recording again for more data.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  useEffect(() => {
    if (!isRecording) return undefined

    const ticker = setInterval(() => {
      setStreamingTick((value) => value + 1)
    }, 450)

    return () => clearInterval(ticker)
  }, [isRecording])

  useEffect(() => {
    return () => {
      stopStreamTracks()
      resetAudioNodes()
      if (audioURL) URL.revokeObjectURL(audioURL)
    }
  }, [audioURL])

  const riskLabel = useMemo(() => {
    if (!result) return 'N/A'
    if (result.biasScore >= 0.7) return 'High Risk'
    if (result.biasScore >= 0.4) return 'Moderate Risk'
    return 'Low Risk'
  }, [result])

  return (
    <section className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass neon-ring rounded-3xl p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-cyan-100 text-glow">Voice Bias Detection</h2>
            <p className="mt-1 text-sm text-slate-300">
              Record spoken input and evaluate accent-related bias risk in responses.
            </p>
          </div>
          <div className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-200">
            {isRecording ? 'Live capture active' : 'Recorder standby'}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
            <Radio size={13} />
            Waveform Stream
          </div>
          <canvas ref={canvasRef} width={900} height={150} className="h-36 w-full rounded-xl bg-slate-900/80" />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startRecording}
              disabled={isRecording || isAnalyzing}
              className="group inline-flex items-center gap-2 rounded-full border border-fuchsia-300/50 bg-fuchsia-500/20 px-4 py-2 text-sm text-fuchsia-100 transition hover:bg-fuchsia-500/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic size={16} className="group-hover:animate-pulse" />
              Start Recording
            </button>

            <button
              type="button"
              onClick={stopRecording}
              disabled={!isRecording}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PauseCircle size={16} />
              Stop Recording
            </button>

            <button
              type="button"
              onClick={analyzeRecording}
              disabled={!audioBlob || isAnalyzing || isRecording}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={16} />
              Analyze
            </button>

            <span className="text-xs text-slate-400">
              {permissionState === 'denied' ? 'Microphone permission denied.' : 'Modern browser MediaRecorder flow enabled.'}
            </span>
          </div>

          {isRecording ? (
            <p className="mt-3 text-sm text-cyan-200">
              Simulating persona... live stream packets {'.'.repeat((streamingTick % 3) + 1)}
            </p>
          ) : null}

          {audioURL ? (
            <div className="mt-4 rounded-xl border border-slate-400/20 bg-slate-900/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <PlayCircle size={14} />
                Playback
              </div>
              <audio controls src={audioURL} className="w-full" />
            </div>
          ) : null}
        </div>
      </motion.div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-500/10 p-3 text-rose-100">
          <AlertTriangle size={16} className="mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass neon-ring rounded-3xl p-5"
      >
        <h3 className="text-sm uppercase tracking-[0.25em] text-indigo-200">Analysis Output</h3>

        {isAnalyzing ? (
          <div className="mt-4 space-y-3">
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-700/60" />
            <div className="h-14 w-full animate-pulse rounded bg-slate-700/50" />
            <div className="h-20 w-full animate-pulse rounded bg-slate-700/50" />
          </div>
        ) : !result ? (
          <p className="mt-4 text-sm text-slate-300">Run analysis to view transcript, accent class, and bias risk.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Transcript</p>
              <p className="mt-2 text-sm text-slate-100">{result.transcript}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-indigo-300/20 bg-indigo-500/10 p-3">
                <p className="text-xs text-indigo-200">Accent Detected</p>
                <p className="mt-1 text-lg font-semibold text-white">{result.accentClassification}</p>
                <p className="mt-1 text-xs text-indigo-100/80">Confidence: {Math.round((result?.meta?.confidence ?? 0) * 100)}%</p>
              </div>
              <div className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 p-3">
                <p className="text-xs text-fuchsia-200">Bias Risk Meter</p>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
                    style={{ width: `${Math.round(result.biasScore * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-white">{Math.round(result.biasScore * 100)}% - {riskLabel}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-300/20 bg-slate-900/65 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Explainability Log</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {(result.explainabilityLog || []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>

              {result?.meta?.audioSignature ? (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-400/20 pt-3 text-xs text-slate-300">
                  <p>Energy: {(result.meta.audioSignature.avgEnergy * 100).toFixed(1)}%</p>
                  <p>Dynamic Range: {(result.meta.audioSignature.dynamicRange * 100).toFixed(1)}%</p>
                  <p>Rhythm Rate: {(result.meta.audioSignature.zeroCrossRate * 100).toFixed(1)}%</p>
                  <p>Signature ID: {result.meta.audioSignature.fingerprint}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </motion.div>
    </section>
  )
}

export default VoiceBias
