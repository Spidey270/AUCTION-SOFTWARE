import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  RefreshCw, 
  Zap, 
  ShieldAlert, 
  TrendingUp, 
  ChevronRight, 
  Target,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { aiGetTacticalAdvice, getStoredApiKey } from '../services/aiService';

export default function AiCopilotDrawer({
  isOpen,
  onClose,
  activePlayer,
  currentBid,
  teamSummary,
  rivals,
  preset,
  allPlayers = [],
  onOpenApiKeyModal
}) {
  const [adviceData, setAdviceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [activeTab, setActiveTab] = useState('should_i_bid');

  const hasApiKey = Boolean(getStoredApiKey());

  const fetchAdvice = async (type = activeTab, userQ = '') => {
    setIsLoading(true);
    setActiveTab(type);
    const result = await aiGetTacticalAdvice({
      activePlayer,
      currentBid,
      teamSummary,
      rivals,
      preset,
      allPlayers,
      queryType: type,
      customQuestion: userQ
    });
    setAdviceData(result);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0f172a]/95 border-l border-cyan-500/30 backdrop-blur-xl shadow-2xl flex flex-col select-none">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-glow-cyan">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              WAR ROOM AI STRATEGIST
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                2.5 Flash
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Live tournament bidding game-theory
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Tactical Action Buttons */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-2">
        <div className="text-[10px] font-mono uppercase text-slate-400">
          Instant Strategic Queries:
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => fetchAdvice('should_i_bid')}
            disabled={isLoading || !activePlayer}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-1.5 ${
              activeTab === 'should_i_bid'
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Should I Bid?</span>
          </button>

          <button
            onClick={() => fetchAdvice('trap_check')}
            disabled={isLoading || !activePlayer}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-1.5 ${
              activeTab === 'trap_check'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Trap Rival?</span>
          </button>

          <button
            onClick={() => fetchAdvice('alternatives')}
            disabled={isLoading || !activePlayer}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-1.5 ${
              activeTab === 'alternatives'
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fallback Targets</span>
          </button>

          <button
            onClick={() => fetchAdvice('squad_gap')}
            disabled={isLoading}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-1.5 ${
              activeTab === 'squad_gap'
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Squad Gaps</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        
        {!hasApiKey && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between text-amber-300">
            <span>Offline heuristic active. Connect Gemini API for deep tournament analysis.</span>
            <button
              onClick={onOpenApiKeyModal}
              className="underline font-bold text-amber-400 ml-2"
            >
              Add Key
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <span className="text-xs font-semibold text-slate-300">
              Gemini AI is analyzing rival purse depletion &amp; win probability...
            </span>
          </div>
        ) : adviceData ? (
          <div className="space-y-4">
            
            {/* Recommendation Banner */}
            <div className={`p-4 rounded-2xl border ${
              adviceData.recommendation === 'BID_AGGRESSIVELY' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
              adviceData.recommendation === 'LET_RIVALS_OVERPAY' ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' :
              adviceData.recommendation === 'FORCE_PRICE_PUSH' ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300' :
              'bg-slate-900 border-slate-700 text-slate-200'
            }`}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                AI Strategic Call
              </div>
              <div className="text-lg font-black tracking-tight mb-1">
                {adviceData.recommendation.replace(/_/g, ' ')}
              </div>
              {adviceData.maxWalkAwayPrice > 0 && (
                <div className="text-xs font-mono font-bold text-amber-400">
                  Recommended Walk-Away Price: {preset.currency}{adviceData.maxWalkAwayPrice} {preset.unit}
                </div>
              )}
            </div>

            {/* Tactical Reasoning */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-cyan-400 text-[11px] uppercase tracking-wider block">
                Tactical Breakdown
              </span>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                {adviceData.tacticalReasoning}
              </p>
            </div>

            {/* Trap Potential */}
            {adviceData.trapOpportunity && (
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs">
                <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider block mb-1">
                  🪤 Rival Trap Intel
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {adviceData.trapOpportunity}
                </p>
              </div>
            )}

            {/* Fallback Plan */}
            {adviceData.fallbackPlan && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
                <span className="font-bold text-indigo-400 text-[11px] uppercase tracking-wider block mb-1">
                  🛡️ Contingency / Backup Target
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {adviceData.fallbackPlan}
                </p>
              </div>
            )}

          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center">
            <Sparkles className="w-10 h-10 mb-3 opacity-30 text-cyan-400" />
            <p>Click any button above or ask a custom question to get real-time auction counsel.</p>
          </div>
        )}

      </div>

      {/* Bottom Custom Query Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customQuery.trim()) {
              fetchAdvice('custom', customQuery.trim());
              setCustomQuery('');
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Ask AI strategist (e.g. 'Push bid on Bumrah?')..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isLoading || !customQuery.trim()}
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}

