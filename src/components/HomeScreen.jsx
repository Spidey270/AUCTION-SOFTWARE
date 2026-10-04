import React from 'react';
import { 
  Plus, 
  Zap, 
  Trophy, 
  Sparkles, 
  Play, 
  Trash2, 
  Calendar, 
  FileSpreadsheet, 
  ShieldCheck, 
  Key, 
  ChevronRight,
  TrendingUp,
  Cpu,
  HelpCircle
} from 'lucide-react';
import { hasAiConfigured } from '../services/aiService';

export default function HomeScreen({
  savedTournaments,
  onLaunchNewAuctionWizard,
  onResumeTournament,
  onDeleteTournament,
  onOpenApiKeyModal,
  onQuickStart
}) {
  const hasApiKey = hasAiConfigured();

  return (
    <div className="auction-home min-h-screen text-slate-100 flex flex-col font-sans">
      
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 px-4 sm:px-8 py-4 bg-[#101615]/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#26312b] border border-[#46534b] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#d2b77c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  AUCTION<span className="text-[#b5c49a]">DESK</span>
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PERSONAL WORKSPACE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Your tournaments, saved locally
              </p>
            </div>
          </div>

          {/* AI Status Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                hasApiKey 
                  ? 'bg-[#202b26] border-[#46534b] text-[#c4d0b3] hover:border-[#788a79]'
                  : 'bg-[#28251e] border-[#5c5037] text-[#d2b77c] hover:border-[#88764c]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{hasApiKey ? 'Assistant ready' : 'Assistant settings'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-9 sm:space-y-12">
        
        <div className="home-hero relative rounded-2xl overflow-hidden p-8 lg:p-12 border">

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[#d2b77c] text-xs font-semibold mb-5">
              <span className="w-5 h-px bg-[#d2b77c]" />
              <span>AUCTION WORKSPACE</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight mb-4">
              A calmer way to run <span className="text-[#b5c49a]">your auction.</span>
            </h2>

            <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-2xl">
              Keep your player pool, squad plan, bids and tournament notes together. Everything stays on this device.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={onLaunchNewAuctionWizard}
                className="quiet-button px-5 py-3 rounded-lg bg-[#b5c49a] text-[#172019] font-bold text-sm hover:bg-[#c5d0ae] active:scale-[0.99] transition flex items-center gap-2.5"
              >
                <Plus className="w-5 h-5" />
                <span>New tournament</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuickStart('cricket')}
                  className="quiet-button px-4 py-3 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2"
                >
                  <span>🏏 Cricket template</span>
                </button>
                <button
                  onClick={() => onQuickStart('football')}
                  className="quiet-button px-4 py-3 rounded-lg bg-[#202825] hover:bg-[#29332e] border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2"
                >
                  <span>⚽ Football template</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Tournaments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">
                Your tournaments
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {savedTournaments.length} saved
            </span>
          </div>

          {savedTournaments.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 mb-3">
                <Trophy className="w-6 h-6 opacity-40" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">No Saved Tournaments Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Create a new tournament auction or launch a quick start template to begin your auction war room.
              </p>
              <button
                onClick={onLaunchNewAuctionWizard}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition"
              >
                + Create Auction
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedTournaments.map((tourney) => (
                <div
                  key={tourney.id}
                  className="home-tournament-card border p-5 flex flex-col justify-between transition relative group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-2xl">
                        {tourney.sport === 'cricket' ? '🏏' : '⚽'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTournament(tourney.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                        title="Delete tournament"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="text-base font-bold text-white mb-1 tracking-tight truncate">
                      {tourney.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mb-4 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(tourney.updatedAt || Date.now()).toLocaleDateString()}</span>
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-center mb-4">
                      <div>
                        <div className="text-[9px] uppercase font-mono text-slate-500">Squad</div>
                        <div className="text-xs font-mono font-bold text-white">
                          {tourney.mySquad?.length || 0} / {tourney.preset?.maxSquad || 25}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-slate-500">Purse Left</div>
                        <div className="text-xs font-mono font-bold text-cyan-400">
                          {tourney.preset?.currency || '₹'}{(tourney.preset?.totalPurse - (tourney.mySquad?.reduce((s, p) => s + (p.boughtFor || 0), 0) || 0)).toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-slate-500">Rating</div>
                        <div className="text-xs font-mono font-bold text-amber-400">
                          {tourney.mySquad?.reduce((s, p) => s + (p.rating || 0), 0) || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onResumeTournament(tourney.id)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Open tournament</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          <div className="p-5 rounded-xl bg-[#171f1d] border border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-[#202825] border border-slate-700 flex items-center justify-center text-[#b5c49a] mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1.5">Player sheets</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Import a CSV or spreadsheet and check the player pool before the auction begins.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#171f1d] border border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-[#28251e] border border-[#5c5037] flex items-center justify-center text-[#d2b77c] mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1.5">Roster and purse checks</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keep an eye on your roster limits, remaining budget, and the minimum squad requirement.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#171f1d] border border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-[#202825] border border-slate-700 flex items-center justify-center text-[#c4d0b3] mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1.5">Your auction notes</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Set a plan, keep a record of decisions, and review the result when the auction is over.
            </p>
          </div>
        </div>

      </main>

    </div>
  );
}
