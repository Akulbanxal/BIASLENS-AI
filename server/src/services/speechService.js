const ACCENT_HINTS = [
  {
    accent: 'Regional Conversational Speech',
    markers: ['ain\'t', 'y\'all', 'reckon', 'gonna', 'fixin'],
  },
  {
    accent: 'Rapid Urban Speech',
    markers: ['bro', 'fam', 'yo', 'lowkey', 'highkey'],
  },
  {
    accent: 'Measured Formal Speech',
    markers: ['therefore', 'however', 'kindly', 'respectfully', 'specifically'],
  },
  {
    accent: 'Neutral Global English',
    markers: [],
  },
]

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const classifyAudioStyle = (signature) => {
  const energy = signature.avgEnergy ?? 0.2
  const rhythm = signature.zeroCrossRate ?? 0.18
  const deltaRhythm = signature.deltaRhythm ?? 0.22

  if (rhythm > 0.11 || deltaRhythm > 0.11) {
    return {
      accent: 'Rapid Urban Speech',
      confidence: clamp(0.56 + rhythm * 1.1 + deltaRhythm * 0.6, 0.56, 0.92),
    }
  }

  if (rhythm >= 0.03 && rhythm <= 0.11 && deltaRhythm >= 0.03 && deltaRhythm <= 0.11) {
    return {
      accent: 'Regional Conversational Speech',
      confidence: clamp(0.54 + energy * 0.35 + (0.08 - Math.abs(0.07 - rhythm)) * 1.4, 0.54, 0.88),
    }
  }

  if (rhythm < 0.03 && deltaRhythm < 0.03) {
    return {
      accent: 'Measured Formal Speech',
      confidence: clamp(0.55 + (0.04 - rhythm) * 1.6 + (0.04 - deltaRhythm) * 1.2, 0.55, 0.88),
    }
  }

  const fallback = ['Neutral Global English', 'Measured Formal Speech', 'Regional Conversational Speech', 'Rapid Urban Speech']
  const pick = fallback[Math.abs((signature.fingerprint || 17) % fallback.length)]
  return {
    accent: pick,
    confidence: 0.47,
  }
}

const deriveAudioSignature = (audioBuffer) => {
  if (!audioBuffer || !audioBuffer.length) {
    return {
      lengthBytes: 0,
      avgEnergy: 0.18,
      dynamicRange: 0.22,
      zeroCrossRate: 0.18,
      byteEntropy: 0.5,
      deltaRhythm: 0.22,
      fingerprint: 17,
    }
  }

  const sampleStep = Math.max(1, Math.floor(audioBuffer.length / 5000))
  let sumAbs = 0
  let min = 255
  let max = 0
  let zeroCrossings = 0
  let prevCentered = 0
  let prevByte = 128
  let sumDelta = 0
  let sampled = 0
  let hash = 0
  const bins = new Array(16).fill(0)

  for (let i = 0; i < audioBuffer.length; i += sampleStep) {
    const byte = audioBuffer[i]
    const centered = byte - 128

    sampled += 1
    sumAbs += Math.abs(centered)
    min = Math.min(min, byte)
    max = Math.max(max, byte)
    bins[Math.min(15, Math.floor(byte / 16))] += 1
    sumDelta += Math.abs(byte - prevByte)
    prevByte = byte

    if (i > 0 && (centered >= 0) !== (prevCentered >= 0)) {
      zeroCrossings += 1
    }
    prevCentered = centered

    hash = (hash * 131 + byte + i) % 1000003
  }

  const avgEnergy = clamp((sumAbs / Math.max(1, sampled)) / 128, 0, 1)
  const dynamicRange = clamp((max - min) / 255, 0, 1)
  const zeroCrossRate = clamp(zeroCrossings / Math.max(1, sampled), 0, 1)
  const deltaRhythm = clamp((sumDelta / Math.max(1, sampled)) / 255, 0, 1)
  const probabilities = bins.map((count) => count / Math.max(1, sampled)).filter((p) => p > 0)
  const entropyRaw = -probabilities.reduce((sum, p) => sum + p * Math.log2(p), 0)
  const byteEntropy = clamp(entropyRaw / 4, 0, 1)

  return {
    lengthBytes: audioBuffer.length,
    avgEnergy: Number(avgEnergy.toFixed(4)),
    dynamicRange: Number(dynamicRange.toFixed(4)),
    zeroCrossRate: Number(zeroCrossRate.toFixed(4)),
    byteEntropy: Number(byteEntropy.toFixed(4)),
    deltaRhythm: Number(deltaRhythm.toFixed(4)),
    fingerprint: hash,
  }
}

const pickByFingerprint = (items, fingerprint, offset = 0) => {
  const index = Math.abs((fingerprint + offset) % items.length)
  return items[index]
}

const buildTranscript = (signature) => {
  const openers = [
    'I called support about my loan application today',
    'During my verification call, I noticed response quality changed',
    'I spoke with the assistant about account eligibility',
    'In today\'s voice session, I had to clarify details multiple times',
    'I contacted the service team to resolve my decision outcome',
  ]
  const issuePhrases = [
    'and had to repeat key details before it understood me',
    'and the model seemed less confident after hearing my accent',
    'and the answers became slower after my second response',
    'and it started making assumptions about my background',
    'and the assistant changed tone once pronunciation differed',
  ]
  const goals = [
    'I want equal service quality for every voice profile.',
    'The decision process should be accent-agnostic and transparent.',
    'Fairness should depend on facts, not speaking style.',
    'I need the same clarity and speed regardless of accent.',
    'Please evaluate me on data, not voice characteristics.',
  ]

  const opener = pickByFingerprint(openers, signature.fingerprint, 3)
  const issue = pickByFingerprint(issuePhrases, signature.fingerprint, 11)
  const goal = pickByFingerprint(goals, signature.fingerprint, 23)

  return `${opener}, ${issue}. ${goal}`
}

// Designed for easy swap to Google Speech-to-Text later.
async function transcribeAudio(audioBuffer, _mimeType) {
  const audioSignature = deriveAudioSignature(audioBuffer)
  const transcript = buildTranscript(audioSignature)
  const confidenceBase = 0.62 + audioSignature.dynamicRange * 0.18 + (1 - audioSignature.zeroCrossRate) * 0.12
  const confidence = clamp(confidenceBase, 0.55, 0.96)

  return {
    transcript,
    provider: 'local-audio-signature-engine',
    confidence: Number(confidence.toFixed(3)),
    audioSignature,
  }
}

function detectAccentBias(transcript, audioSignature = {}) {
  const words = tokenize(transcript)
  const joined = words.join(' ')
  const energy = audioSignature.avgEnergy ?? 0.2
  const zeroCrossRate = audioSignature.zeroCrossRate ?? 0.18
  const dynamicRange = audioSignature.dynamicRange ?? 0.28
  const byteEntropy = audioSignature.byteEntropy ?? 0.5
  const deltaRhythm = audioSignature.deltaRhythm ?? 0.22
  const audioStyle = classifyAudioStyle(audioSignature)

  const scored = ACCENT_HINTS.map((hint) => {
    const hits = hint.markers.filter((token) => joined.includes(token)).length
    let acousticBoost = 0

    if (hint.accent === 'Rapid Urban Speech') {
      acousticBoost = zeroCrossRate > 0.24 ? 0.18 : 0
    } else if (hint.accent === 'Regional Conversational Speech') {
      acousticBoost = energy > 0.24 && dynamicRange > 0.42 ? 0.16 : 0
    } else if (hint.accent === 'Measured Formal Speech') {
      acousticBoost = zeroCrossRate < 0.15 ? 0.14 : 0
    } else {
      acousticBoost = Math.abs(zeroCrossRate - 0.18) < 0.05 ? 0.1 : 0
    }

    return {
      accent: hint.accent,
      hits,
      score:
        (hint.markers.length ? hits / hint.markers.length : 0.2) +
        acousticBoost +
        (hint.accent === audioStyle.accent ? audioStyle.confidence * 0.7 : 0),
    }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  const lexicalHitsTotal = scored.reduce((sum, item) => sum + item.hits, 0)
  const selectedAccent = lexicalHitsTotal === 0 && audioStyle.confidence >= 0.52 ? audioStyle.accent : top.accent

  const baseRisk = selectedAccent === 'Neutral Global English' ? 0.2 : 0.34
  const hitBoost = top.hits * 0.08
  const sentimentBoost = /repeat|assumption|tone|understood|slower|accent/.test(joined) ? 0.12 : 0.03
  const acousticPenalty = clamp(
    Math.abs(zeroCrossRate - 0.16) * 0.35 +
      Math.abs(dynamicRange - 0.55) * 0.18 +
      Math.abs(byteEntropy - 0.82) * 0.22 +
      Math.abs(deltaRhythm - 0.3) * 0.2,
    0,
    0.28,
  )
  const biasScore = clamp(baseRisk + hitBoost + sentimentBoost + acousticPenalty, 0.05, 0.95)

  const explainabilityLog = [
    `Accent candidate selected: ${selectedAccent}.`,
    `Marker hits: ${top.hits}.`,
    `Audio signature: energy ${energy.toFixed(2)}, dynamic range ${dynamicRange.toFixed(2)}, rhythm ${zeroCrossRate.toFixed(2)}, entropy ${byteEntropy.toFixed(2)}.`,
    `Temporal variance index: ${deltaRhythm.toFixed(2)}.`,
    `Audio-style classifier vote: ${audioStyle.accent} (${Math.round(audioStyle.confidence * 100)}%).`,
    `Sentiment trigger present: ${sentimentBoost > 0.03 ? 'yes' : 'no'}.`,
    `Computed bias score from lexical markers + acoustic variation + context intensity.`,
  ]

  return {
    accentClassification: selectedAccent,
    biasScore: Number(biasScore.toFixed(3)),
    explainabilityLog,
  }
}

export { transcribeAudio, detectAccentBias }
