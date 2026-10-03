import React, { useState, useEffect } from 'react';
import { Key, Sparkles, X, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { getAiConfig, setAiConfig } from '../services/aiService';

export default function ApiKeyModal({ isOpen, onClose, onKeyUpdated }) {
  const [provider, setProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [testStatus, setTestStatus] = useState('idle'); // 'idle' | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const config = getAiConfig();
      setProvider(config.provider || 'gemini');
      setGeminiKey(config.geminiKey || '');
      setOpenaiKey(config.openaiKey || '');
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setAiConfig({ provider, geminiKey, openaiKey });
    if (onKeyUpdated) onKeyUpdated();
    onClose();
  };

  const handleTestConnection = async () => {
    const keyToTest = provider === 'gemini' ? geminiKey : openaiKey;
    if (!keyToTest.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter an API key to test.');
      return;
    }

    setTestStatus('testing');
    setTestMessage(`Connecting to ${provider === 'gemini' ? 'Google Gemini API' : 'OpenAI API'}...`);

    try {
      if (provider === 'gemini') {
        const { GoogleGenAI } = await import('@google/genai');
        const client = new GoogleGenAI({ apiKey: keyToTest.trim() });
        const res = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Ping test. Respond with: OK'
        });
        if (!res || !res.text) throw new Error('Unexpected response format.');
      } else {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToTest.trim()}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Ping test. Respond with: OK' }]
          })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || 'OpenAI API error');
        }
      }

      setTestStatus('success');
      setTestMessage(`Connected successfully! ${provider === 'gemini' ? 'Gemini 2.5 Flash' : 'GPT-4o Mini'} is ready.`);
      setAiConfig({ provider, geminiKey, openaiKey });
      if (onKeyUpdated) onKeyUpdated();
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || 'Failed to authenticate. Check your key.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-glow-cyan relative">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-glow-cyan">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              AI Engine Configuration
            </h3>
            <p className="text-xs text-slate-400">
              Select an AI provider for live tactics and CSV parsing
            </p>
          </div>
        </div>

        <div className="flex bg-slate-900 rounded-lg p-1 mb-5 border border-slate-800">
          <button
            onClick={() => setProvider('gemini')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${provider === 'gemini' ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/50' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Google Gemini
          </button>
          <button
            onClick={() => setProvider('openai')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${provider === 'openai' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50' : 'text-slate-400 hover:text-slate-300'}`}
          >
            OpenAI (ChatGPT)
          </button>
        </div>

        <div className="space-y-4">
          {provider === 'gemini' ? (
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5 flex items-center justify-between">
                <span>Google Gemini API Key</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px] lowercase">
                  <span>Get free key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5 flex items-center justify-between">
                <span>OpenAI API Key</span>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[10px] lowercase">
                  <span>Get API key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          )}

          {/* Test Status Feedback */}
          {testStatus !== 'idle' && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testStatus === 'testing' ? 'bg-slate-900 border-slate-700 text-slate-300' :
              testStatus === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
              'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {testStatus === 'testing' ? (
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0 mt-0.5" />
              ) : testStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || (provider === 'gemini' ? !geminiKey.trim() : !openaiKey.trim())}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-glow-cyan transition"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
