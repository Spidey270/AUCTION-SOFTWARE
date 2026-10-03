import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  ShieldCheck, 
  AlertCircle, 
  Trash2, 
  Star, 
  TrendingUp, 
  LayoutGrid, 
  ListFilter 
} from 'lucide-react';

export default function SquadVisualizer({
  mySquad,
  preset,
  teamSummary,
  myTeamName = 'My Team',
  onReleasePlayer
}) {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'pitch'

  // Role breakdown count
  const roleBreakdown = preset.roles.map(r => ({
    ...r,
    count: mySquad.filter(p => p.role === r.id).length
  }));

  const bestXI = teamSummary.bestXI;

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col h-full">
      
      {/* Top Header with Cumulative Rating and Mode Toggle */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {myTeamName} Squad
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                {mySquad.length} / {preset.maxSquad} SQUAD
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Cumulative ratings &amp; tactical squad balance
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              viewMode === 'list'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Roster List
          </button>
          <button
            onClick={() => setViewMode('pitch')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              viewMode === 'pitch'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Starting XI
          </button>
        </div>
      </div>

      {/* METRIC RIBBON: The Winning Numbers */}
      <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center">
        <div>
          <div className="text-[9px] uppercase font-mono text-slate-400">Total Rating</div>
          <div className="text-sm font-black font-mono text-amber-400">
            {teamSummary.totalRating} pts
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase font-mono text-slate-400">Best XI Rating</div>
          <div className="text-sm font-black font-mono text-emerald-400">
            {bestXI?.totalRating || 0} pts
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase font-mono text-slate-400">Avg / Player</div>
          <div className="text-sm font-black font-mono text-cyan-300">
            {teamSummary.avgRating || 0}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase font-mono text-slate-400">Overseas</div>
          <div className={`text-sm font-black font-mono ${
            teamSummary.overseasCount >= preset.maxOverseas ? 'text-rose-400' : 'text-slate-200'
          }`}>
            {teamSummary.overseasCount} / {preset.maxOverseas}
          </div>
        </div>
      </div>

      {/* Role Composition Pills */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {roleBreakdown.map((r) => (
          <span
            key={r.id}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${r.border} ${r.bg} ${r.color}`}
          >
            {r.id}: {r.count}
          </span>
        ))}
      </div>

      {/* ROSTER CONTENT AREA */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-[220px]">
        {mySquad.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Users className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No players acquired yet. Win your first hammer battle!</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {mySquad.map((player) => {
              const roleObj = preset.roles.find(r => r.id === player.role);
              const isBestXI = bestXI?.xi?.some(p => p.id === player.id);

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 font-mono font-bold text-xs flex items-center justify-center text-amber-400 flex-shrink-0">
                      {player.rating}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {player.name}
                        </span>
                        {isBestXI && (
                          <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                            XI
                          </span>
                        )}
                        {player.overseas && (
                          <span className="text-[10px]" title="Overseas">✈️</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold ${roleObj?.color}`}>
                          {roleObj?.label || player.role}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Paid: {preset.currency}{player.boughtFor?.toFixed(2)} {preset.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onReleasePlayer(player.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition rounded-lg hover:bg-rose-500/10"
                    title="Undo / Release player"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Pitch / XI View */
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Optimized Starting XI (Highest Rating Composition)</span>
              <span className="text-emerald-400 font-mono font-bold">
                {bestXI?.xi?.length || 0} / 11 Slots Filled
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {bestXI?.xi?.map((player, index) => {
                const roleObj = preset.roles.find(r => r.id === player.role);
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px] w-4">
                        #{index + 1}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${roleObj?.bg} ${roleObj?.color}`}>
                        {player.role}
                      </span>
                      <span className="font-semibold text-white">
                        {player.name}
                      </span>
                      {player.overseas && (
                        <span className="text-[10px]">✈️</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-amber-400 font-bold">{player.rating}</span>
                      <span className="text-[10px] text-slate-400">
                        {preset.currency}{player.boughtFor?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
