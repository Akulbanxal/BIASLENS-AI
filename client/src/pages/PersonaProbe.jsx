import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, ChevronDown, AlertTriangle, Info } from 'lucide-react';
import { apiPost } from '../services/apiClient';
import { useApiFeedback } from '../hooks/useApiFeedback';

const personas = [
  "A skeptical elderly man from a rural area",
  "A tech-savvy teenager from a major city",
  "A non-native English speaker working in customer service",
  "A university professor of literature",
  "A busy single parent with two young children",
];

const TypingAnimation = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex items-center gap-2"
  >
    <motion.span
      className="h-2 w-2 rounded-full bg-cyan-400"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.span
      className="h-2 w-2 rounded-full bg-cyan-400"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.8, delay: 0.1, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.span
      className="h-2 w-2 rounded-full bg-cyan-400"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

function PersonaProbe() {
  const [prompt, setPrompt] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedTestCode, setGeneratedTestCode] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const { runWithFeedback } = useApiFeedback();

  useEffect(() => {
    // Add initial welcome message
    setConversation([{
      type: 'bot',
      text: "Welcome to the Persona Probe. Select a persona and enter a prompt to begin the simulation.",
      analysis: null
    }]);
  }, []);

  const handleProbe = async () => {
    if (!prompt) {
      setError("💭 Enter a prompt to get started—ask anything!");
      return;
    }
    setError('');
    setIsLoading(true);

    const userMessage = { type: 'user', text: prompt, persona: selectedPersona };
    setConversation(prev => [...prev, userMessage]);
    setPrompt('');

    try {
      const { generatedResponse, biasIndicators, meta } = await runWithFeedback(
        () => apiPost('/api/persona/probe', { prompt, persona: selectedPersona }),
        {
          loadingMessage: '🎭 Simulating persona response...',
          successMessage: '✨ Persona response generated.',
          errorMessage: '💡 Probe is taking a moment. Please try again.',
          useGlobalLoading: true,
        },
      );

      const botMessage = { type: 'bot', text: generatedResponse, analysis: biasIndicators, meta };
      setConversation(prev => [...prev, botMessage]);
      const personaRecord = {
        timestamp: new Date().toISOString(),
        persona: selectedPersona,
        analysis: biasIndicators,
      };
      localStorage.setItem('biaslens_persona_latest', JSON.stringify(personaRecord));
      const personaHistory = JSON.parse(localStorage.getItem('biaslens_persona_history') || '[]');
      localStorage.setItem(
        'biaslens_persona_history',
        JSON.stringify([personaRecord, ...personaHistory].slice(0, 12)),
      );

    } catch (err) {
      const errorMessage = { type: 'error', text: `💭 Hmm, something happened. Please try a different prompt.` };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTestCode = () => {
    const safePrompt = (prompt || 'Evaluate fairness for this persona in loan approval').replace(/`/g, '\\`')
    const safePersona = selectedPersona.replace(/`/g, '\\`')
    const snippet = [
      "// Persona Probe API test (generated)",
      "const payload = {",
      `  persona: \`${safePersona}\`,`,
      `  prompt: \`${safePrompt}\`,`,
      '};',
      '',
      "fetch('/api/persona/probe', {",
      "  method: 'POST',",
      "  headers: { 'Content-Type': 'application/json' },",
      '  body: JSON.stringify(payload),',
      '})',
      '  .then((res) => res.json())',
      '  .then((data) => {',
      "    console.log('Generated response:', data.generatedResponse);",
      "    console.log('Toxicity:', data.biasIndicators?.toxicity);",
      "    console.log('Stereotyping:', data.biasIndicators?.stereotyping);",
      "    console.log('Fairness:', data.biasIndicators?.fairnessScore);",
      '  });',
      '',
      "// cURL equivalent:",
      `// curl -X POST http://localhost:5001/api/persona/probe -H 'Content-Type: application/json' -d '${JSON.stringify({ persona: selectedPersona, prompt: prompt || 'Evaluate fairness for this persona in loan approval' }).replace(/'/g, "'\\''")}'`,
    ].join('\n')

    setGeneratedTestCode(snippet)
    setCopyStatus('')
  }

  const copyTestCode = async () => {
    if (!generatedTestCode) return
    try {
      await navigator.clipboard.writeText(generatedTestCode)
      setCopyStatus('Copied test code')
      setTimeout(() => setCopyStatus(''), 1800)
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[calc(100vh-100px)] flex-col"
    >
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-glow text-fuchsia-300">Synthetic Persona Probing</h1>
        <p className="mt-1 text-slate-300">Test model responses against simulated user personas to uncover hidden biases.</p>
      </div>

      <div className="glass neon-ring-fuchsia flex flex-1 flex-col rounded-2xl">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <AnimatePresence>
            {conversation.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                {msg.type === 'user' && (
                  <div className="flex items-start justify-end gap-3">
                    <div className="max-w-lg rounded-2xl rounded-br-none bg-slate-700/60 px-4 py-3">
                      <p className="text-sm text-slate-100">{msg.text}</p>
                      <p className="mt-1 text-right text-xs text-fuchsia-300/70">as: {msg.persona}</p>
                    </div>
                    <User className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-600 p-1.5 text-slate-300" />
                  </div>
                )}
                {msg.type === 'bot' && (
                  <div className="flex items-start gap-3">
                    <Bot className="h-8 w-8 flex-shrink-0 rounded-full bg-fuchsia-500/30 p-1.5 text-fuchsia-200" />
                    <div className="max-w-2xl">
                      <div className="rounded-2xl rounded-bl-none bg-slate-800/70 px-4 py-3">
                        <p className="text-sm text-slate-200">{msg.text}</p>
                        {msg.meta?.demoMode && (
                          <div className="mt-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">
                            Using simulated AI (demo mode)
                          </div>
                        )}
                      </div>
                      {msg.analysis && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 p-3"
                        >
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300">Bias Analysis</h4>
                          <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-xs text-slate-400">Toxicity</p>
                              <p className="text-lg font-bold text-white">{(msg.analysis.toxicity * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Stereotyping</p>
                              <p className="text-lg font-bold text-white">{(msg.analysis.stereotyping * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Fairness Score</p>
                              <p className="text-lg font-bold text-white">{(msg.analysis.fairnessScore * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                           <div className="mt-2 flex items-center gap-2 text-xs text-slate-400/80 border-t border-fuchsia-500/20 pt-2">
                              <Info size={14} />
                              <p>{msg.analysis.reasoning}</p>
                           </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
                {msg.type === 'error' && (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-rose-500/10 p-3 text-rose-400">
                    <AlertTriangle size={16} />
                    <p className="text-sm">{msg.text}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex items-start gap-3">
              <Bot className="h-8 w-8 flex-shrink-0 rounded-full bg-fuchsia-500/30 p-1.5 text-fuchsia-200" />
              <div className="rounded-2xl rounded-bl-none bg-slate-800/70 px-4 py-3">
                <TypingAnimation />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-400/20 p-4">
          {error && <p className="mb-2 text-center text-sm text-amber-300">{error}</p>}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={generateTestCode}
              className="rounded-lg border border-indigo-300/35 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/25"
            >
              Generate Test Code
            </button>
            {generatedTestCode ? (
              <button
                onClick={copyTestCode}
                className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Copy
              </button>
            ) : null}
            {copyStatus ? <span className="text-xs text-cyan-200">{copyStatus}</span> : null}
          </div>
          {generatedTestCode ? (
            <pre className="mb-3 max-h-44 overflow-auto rounded-lg border border-slate-500/25 bg-slate-950/70 p-3 text-xs text-slate-200">
              <code>{generatedTestCode}</code>
            </pre>
          ) : null}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleProbe()}
                placeholder="Enter a test prompt..."
                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 py-2 pl-4 pr-10 text-sm text-white focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                aria-label="Prompt input"
              />
              <button
                onClick={handleProbe}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-fuchsia-400 disabled:opacity-50"
                aria-label="Send prompt"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="relative">
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="w-48 appearance-none rounded-lg border border-slate-600 bg-slate-900/80 py-2 pl-3 pr-8 text-sm text-white focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                aria-label="Persona selector"
              >
                {personas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default PersonaProbe;
