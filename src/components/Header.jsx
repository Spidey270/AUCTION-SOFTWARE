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
import { hasAiConfigured } from '../services/aiService';

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
  onOpenApiKeyModal,
  onUndoLastAction,
  hasUndoHistory = false,
  onOpenPlan,
  onOpenReview,
  onStartPractice,
  isPractice = false
}) {
  const hasApiKey = hasAiConfigured();

  return (
    <header className="control-header sticky top-0 z-40 border-b px-6 py-3">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4 flex-wrap">
        
        {/* Brand / Logo + Exit to Home Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExitToHome}
            className="p-2 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
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
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#252e29] text-[#c4d0b3] border border-[#46534b]">
                👑 {myTeamName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Purse: {preset.currency}{preset.totalPurse} {preset.unit} | Min Squad: {preset.minSquad}
            </p>
          </div>
        </div>

        {/* Live HUD Quick Stat Badges */}
        <div className="flex items-center gap-3">
          {/* Purse Remaining */}
          <div className="bg-[#171f1d] border border-slate-800 rounded-lg px-4 py-1.5 flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Purse Left
              </div>
              <div className="text-base font-bold font-mono text-[#b5c49a] flex items-baseline gap-1">
                {preset.currency} {teamSummary.purseRemaining.toFixed(2)}
                <span className="text-[11px] text-slate-400 font-normal">{preset.unit}</span>
              </div>
            </div>
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Max Safe Bid
              </div>
              <div className="text-base font-bold font-mono text-[#b5c49a]">
                {preset.currency} {teamSummary.maxSafeBid.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Squad & Rating Badges */}
          <div className="bg-[#171f1d] border border-slate-800 rounded-lg px-4 py-1.5 flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Squad
              </div>
              <div className="text-base font-bold font-mono text-white">
                {teamSummary.count} <span className="text-xs text-slate-500 font-normal">/ {preset.maxSquad}</span>
              </div>
            </div>
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Total Rating
              </div>
              <div className="text-base font-bold font-mono text-[#d2b77c] flex items-center justify-end gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {teamSummary.totalRating}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={onOpenPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252e29] hover:bg-[#303b35] border border-[#46534b] text-[#c4d0b3] text-xs font-semibold transition"
            title="Open the target board and squad plan"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Plan</span>
          </button>
          <button
            onClick={onOpenReview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-200 text-xs font-semibold transition"
            title="Review the auction and simulate alternatives"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>
          {!isPractice && (
            <button
              onClick={onStartPractice}
              className="px-3 py-1.5 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-300 text-xs font-semibold transition"
              title="Create a separate practice copy with auction progress reset"
            >
              Practice
            </button>
          )}
          {isPractice && <span className="px-2 py-1 rounded bg-[#28251e] border border-[#5c5037] text-[#d2b77c] text-[10px] font-semibold">Practice copy</span>}

          {/* AI Strategist Button */}
          <button
            onClick={onToggleAiDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Bot className="w-3.5 h-3.5 text-[#b5c49a]" />
            <span>Assistant</span>
          </button>

          {hasUndoHistory && (
            <button
              onClick={onUndoLastAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#28251e] hover:bg-[#332e23] border border-[#5c5037] text-[#d2b77c] text-xs font-semibold transition"
              title="Undo the last auction action"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}

          <button
            onClick={onOpenApiKeyModal}
            className="p-2 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-400 hover:text-[#d2b77c] transition"
            title="Configure Gemini API Key"
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-200 text-xs font-medium transition"
            title="Import Player List from CSV or Excel"
          >
            <Upload className="w-3.5 h-3.5 text-[#b5c49a]" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-400 hover:text-white transition"
            title="Auction Rules & Constraints"
          >
            <Sliders className="w-4 h-4 text-[#d2b77c]" />
          </button>

          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-400 hover:text-white transition"
            title="Keyboard Shortcuts Guide"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={onResetAuction}
            className="p-2 rounded-lg bg-[#2b2220] hover:bg-[#352725] border border-[#60413b] text-[#d49a8c] transition"
            title="Reset All Auction Progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
