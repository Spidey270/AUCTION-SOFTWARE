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
import { getStoredApiKey } from '../services/aiService';

export default function HomeScreen({
  savedTournaments,
  onLaunchNewAuctionWizard,
  onResumeTournament,
  onDeleteTournament,
  onOpenApiKeyModal,
  onQuickStart
}) {
  const hasApiKey = Boolean(getStoredApiKey());

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans select-none">
      
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 px-8 py-4 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-glow-cyan">
              <Zap className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  WAR<span className="text-cyan-400">ROOM</span>
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  COMMAND SUITE v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI-Powered Sports Auction Operations &amp; Tournament Strategy
              </p>
            </div>
          </div>

          {/* AI Status Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                hasApiKey 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:border-amber-500/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{hasApiKey ? 'Gemini 2.5 Flash: Active' : 'Configure Gemini AI Key'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10 space-y-12">
        
        <div className="relative rounded-3xl overflow-hidden p-8 lg:p-12 border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-[#090d16] shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-ASSISTED SPORTS AUCTION PLATFORM</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-4">
              Dominate Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-amber-400">College Auction</span>
            </h2>

            <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-2xl">
              Equip your war room with real-time budget mathematics, automatic disqualification protection, competitor intelligence radar, and Gemini AI for instant CSV sheet parsing and tactical bidding guidance.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={onLaunchNewAuctionWizard}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-glow-cyan hover:brightness-110 active:scale-95 transition flex items-center gap-2.5"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Tournament Auction</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuickStart('cricket')}
                  className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2"
                >
                  <span>🏏 Quick IPL Mega</span>
                </button>
                <button
                  onClick={() => onQuickStart('football')}
                  className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2"
                >
                  <span>⚽ Quick Football</span>
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
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                Saved Tournaments
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {savedTournaments.length} ACTIVE AUCTIONS
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
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition relative group"
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
                    <span>Enter War Room</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800/80">
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">AI Smart CSV Normalizer</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop any messy organizer sheet. Gemini AI maps unstandardized columns, cleans names, standardizes roles, and imputes missing ratings.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Safe Bid Disqualification Lock</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Guarantees you will never get disqualified. Real-time mathematical barrier blocks illegal bids that would leave mandatory slots unfillable.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Live Tactical AI Copilot</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant 1-click strategic assessments on whether to bid, walk away, or force rivals into bidding traps to drain their budgets.
            </p>
          </div>
        </div>

      </main>

    </div>
  );
}

