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

  const heatmapRows = [
    { label: 'Desperate', threshold: 0.9 },
    { label: 'High', threshold: 0.7 },
    { label: 'Medium', threshold: 0.45 },
    { label: 'Low', threshold: 0.2 },
    { label: 'Idle', threshold: 0 }
  ];

  const getHeatColor = (pressure) => {
    if (pressure >= 0.85) return 'bg-rose-500/90 border-rose-400/80 shadow-[0_0_20px_rgba(244,63,94,0.25)]';
    if (pressure >= 0.7) return 'bg-amber-500/80 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.18)]';
    if (pressure >= 0.45) return 'bg-orange-500/75 border-orange-400/70';
    if (pressure >= 0.2) return 'bg-cyan-500/70 border-cyan-400/70';
    return 'bg-slate-700/80 border-slate-600/70';
  };

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
      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Rival pressure heatmap</span>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
            {heatmapRows.map((row) => (
              <span key={row.label} className={`px-1.5 py-0.5 rounded border ${getHeatColor(row.threshold).split(' ').slice(0, 2).join(' ')}`}>
                {row.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
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
            const canAffordActive = activePlayer ? maxBid >= (activePlayer.basePrice || preset.basePriceDefault) : true;
            const isCrippled = purseRemaining < (preset.totalPurse * 0.25) && slotsLeft > 5;
            const pursePercent = Math.min(100, Math.max(0, (purseRemaining / preset.totalPurse) * 100));
            const roleNeedBoost = activePlayer && rival.acquired ? rival.acquired.some((p) => p.role === activePlayer.role) ? 0.12 : 0.18 : 0.12;
            const pressure = canAffordActive
              ? Math.min(1, (pursePercent / 100) * 0.55 + (slotsLeft > 0 ? 0.25 : 0.1) + (isCrippled ? 0.2 : 0) + roleNeedBoost)
              : Math.max(0.05, (pursePercent / 100) * 0.2 + (slotsLeft > 0 ? 0.08 : 0));
            const pressureTag = isCrippled ? 'Cash-strapped bidder' : canAffordActive ? 'Live pressure threat' : 'Budget-limited';

              return (
                <div key={rival.id} className={`rounded-xl border p-2.5 transition-all ${getHeatColor(pressure)}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold text-white truncate">{rival.name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-100">{pressure >= 0.85 ? 'Desperate' : pressure >= 0.7 ? 'High' : pressure >= 0.45 ? 'Medium' : pressure >= 0.2 ? 'Low' : 'Idle'}</span>
                  </div>
                  <div className="text-[10px] text-slate-100/90 font-medium">{pressureTag}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-950/60 overflow-hidden">
                    <div className="h-full rounded-full bg-white/70" style={{ width: `${Math.round(pressure * 100)}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

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
          const pressureTag = isCrippled ? 'Cash-strapped bidder' : canAffordActive ? 'Live pressure threat' : 'Budget-limited';

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
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${isCrippled ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'}`}>
                    {pressureTag}
                  </span>
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

              <div className="mb-2 text-[10px] text-slate-300 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5">
                {isCrippled
                  ? `${rival.name} is under severe purse pressure and may overbid on a role need.`
                  : canAffordActive
                  ? `${rival.name} can still afford this player and remains a live threat.`
                  : `${rival.name} is likely to back away unless the player fits a must-have role.`}
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
