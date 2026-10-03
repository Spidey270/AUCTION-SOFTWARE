import React, { useState } from 'react';
import { Users, AlertCircle, Plus, Trash2, Edit3, ShieldAlert, Sparkles, TrendingDown } from 'lucide-react';
import { calculateMaxSafeBid } from '../utils/auctionMath';

export default function RivalsRadar({
  rivals,
  preset,
  activePlayer,
  onUpdateRival,
  onAddRival,
  onDeleteRival
}) {
  const [newTeamName, setNewTeamName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPurse, setEditPurse] = useState('');
  const [expandedRival, setExpandedRival] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    onAddRival(newTeamName.trim());
    setNewTeamName('');
  };

  const handleSavePurse = (id) => {
    const val = parseFloat(editPurse);
    if (!isNaN(val)) {
      onUpdateRival(id, { purseSpent: Math.max(0, preset.totalPurse - val) });
    }
    setEditingId(null);
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Rival Radar &amp; Intel
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                {rivals.length} TEAMS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Live purse depletion &amp; competitor bidding ceilings
            </p>
          </div>
        </div>
      </div>

      {/* Rivals Grid / Table */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[360px]">
        {rivals.map((rival) => {
          const purseRemaining = Math.max(0, preset.totalPurse - (rival.purseSpent || 0));
          const playersCount = rival.playersCount || 0;
          const slotsLeft = Math.max(0, preset.minSquad - playersCount);
          const maxBid = calculateMaxSafeBid(
            purseRemaining,
            playersCount,
            preset.minSquad,
            preset.maxSquad,
            preset.basePriceDefault
          );

          // Threat calculation for active player
          const canAffordActive = activePlayer ? maxBid >= (activePlayer.basePrice || preset.basePriceDefault) : true;
          const isCrippled = purseRemaining < (preset.totalPurse * 0.25) && slotsLeft > 5;
          const pursePercent = Math.min(100, Math.max(0, (purseRemaining / preset.totalPurse) * 100));

          return (
            <div
              key={rival.id}
              className={`p-3 rounded-xl border transition-all ${
                isCrippled
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-xs font-bold text-white tracking-wide">
                    {rival.name}
                  </span>
                  {isCrippled && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <TrendingDown className="w-2.5 h-2.5" />
                      Cash Strapped
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingId(rival.id);
                      setEditPurse(purseRemaining.toString());
                    }}
                    className="p-1 text-slate-500 hover:text-slate-300 transition"
                    title="Manual purse correction"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteRival(rival.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Remove rival"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quick metrics row */}
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                <div>
                  <div className="text-[9px] uppercase font-mono text-slate-500">Purse Left</div>
                  {editingId === rival.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editPurse}
                        onChange={(e) => setEditPurse(e.target.value)}
                        className="w-14 bg-slate-800 text-xs px-1 py-0.5 rounded text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePurse(rival.id)}
                        className="text-[10px] text-cyan-400 font-bold"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-mono font-bold text-cyan-300">
                      {preset.currency}{purseRemaining.toFixed(1)} {preset.unit}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[9px] uppercase font-mono text-slate-500">Squad</div>
                  <div className="text-xs font-mono font-bold text-slate-200">
                    {playersCount} / {preset.minSquad}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] uppercase font-mono text-slate-500">Max Bid</div>
                  <div className={`text-xs font-mono font-black ${
                    canAffordActive ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {preset.currency}{maxBid.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Purse Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden cursor-pointer" onClick={() => setExpandedRival(expandedRival === rival.id ? null : rival.id)} title="Click to view players">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pursePercent > 50
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                      : pursePercent > 20
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${pursePercent}%` }}
                ></div>
              </div>
              
              {/* Expand Toggle */}
              <button 
                className="w-full text-center mt-2 text-[10px] text-slate-500 hover:text-slate-300 font-semibold tracking-wider uppercase transition"
                onClick={() => setExpandedRival(expandedRival === rival.id ? null : rival.id)}
              >
                {expandedRival === rival.id ? 'Hide Players ▲' : 'View Players ▼'}
              </button>

              {/* Acquired Players List */}
              {expandedRival === rival.id && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 max-h-32 overflow-y-auto pr-1 space-y-1">
                  {rival.acquired && rival.acquired.length > 0 ? (
                    rival.acquired.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/40 p-1.5 rounded border border-slate-800/50">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-white truncate max-w-[100px]" title={p.name}>{p.name}</span>
                          <span className="text-[9px] text-slate-500 uppercase">{p.role} · {p.rating} OVR</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-cyan-300">
                          {preset.currency}{p.boughtFor?.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-center text-slate-500 py-2 italic">No players bought yet.</div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Quick Add Rival Form */}
      <form onSubmit={handleCreate} className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Add rival team name..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

    </div>
  );
}
