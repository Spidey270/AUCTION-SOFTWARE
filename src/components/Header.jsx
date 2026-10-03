import React from 'react';
import { 
  Trophy, 
  ShieldAlert, 
  Sliders, 
  Upload, 
  RotateCcw, 
  Keyboard, 
  Sparkles,
  Zap,
  ArrowLeft,
  Key,
  Bot
} from 'lucide-react';
import { getStoredApiKey } from '../services/aiService';

export default function Header({
  tournamentName,
  preset,
  myTeamName = 'My Team',
  onSwitchSport,
  teamSummary,
  onOpenSettings,
  onOpenImport,
  onResetAuction,
  onOpenShortcuts,
  onExitToHome,
  onToggleAiDrawer,
  onOpenApiKeyModal
}) {
  const hasApiKey = Boolean(getStoredApiKey());

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800 px-6 py-3">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4 flex-wrap">
        
        {/* Brand / Logo + Exit to Home Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExitToHome}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="Return to Tournament Hub"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-800"></div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate max-w-[280px]">
                {tournamentName || 'AUCTION WAR ROOM'}
              </h1>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                👑 {myTeamName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Purse: {preset.currency}{preset.totalPurse} {preset.unit} | Min Squad: {preset.minSquad}
            </p>
          </div>
        </div>

        {/* Live HUD Quick Stat Badges */}
        <div className="flex items-center gap-3">
          {/* Purse Remaining */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-1.5 flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Purse Left
              </div>
              <div className="text-base font-black font-mono text-cyan-400 flex items-baseline gap-1">
                {preset.currency} {teamSummary.purseRemaining.toFixed(2)}
                <span className="text-[11px] text-slate-400 font-normal">{preset.unit}</span>
              </div>
            </div>
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Max Safe Bid
              </div>
              <div className="text-base font-black font-mono text-emerald-400">
                {preset.currency} {teamSummary.maxSafeBid.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Squad & Rating Badges */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-1.5 flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Squad
              </div>
              <div className="text-base font-black font-mono text-white">
                {teamSummary.count} <span className="text-xs text-slate-500 font-normal">/ {preset.maxSquad}</span>
              </div>
            </div>
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Total Rating
              </div>
              <div className="text-base font-black font-mono text-amber-400 flex items-center justify-end gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {teamSummary.totalRating}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* AI Strategist Button */}
          <button
            onClick={onToggleAiDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-glow-cyan transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>AI Strategist</span>
          </button>

          <button
            onClick={onOpenApiKeyModal}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
            title="Configure Gemini API Key"
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium transition"
            title="Import Player List from CSV or Excel"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Auction Rules & Constraints"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Keyboard Shortcuts Guide"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={onResetAuction}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition"
            title="Reset All Auction Progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}

