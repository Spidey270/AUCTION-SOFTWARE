import React, { useMemo, useState } from 'react';
import { BarChart3, X, FlaskConical } from 'lucide-react';
import { calculateProjectedValue, computeTeamSummary } from '../utils/auctionMath';

export default function AuctionReviewModal({ isOpen, onClose, tournament, onRestoreHistoryEntry }) {
  const [simulationPlayerId, setSimulationPlayerId] = useState('');
  const [simulationBid, setSimulationBid] = useState('');

  const availablePlayers = (tournament?.players || []).filter(player => !player.status);
  const mySquad = tournament?.mySquad || [];
  const preset = tournament?.preset;
  const plan = tournament?.auctionPlan || {};
  const timeline = [...(tournament?.auctionLog || [])].reverse();

  const simulation = useMemo(() => {
    if (!preset || !simulationPlayerId) return null;
    const player = availablePlayers.find(item => item.id === simulationPlayerId);
    if (!player) return null;
    const amount = Number(simulationBid || player.basePrice || preset.basePriceDefault);
    const before = computeTeamSummary(mySquad, preset.totalPurse, preset);
    const after = computeTeamSummary([...mySquad, { ...player, boughtFor: amount }], preset.totalPurse, preset);
    return { player, amount, before, after };
  }, [availablePlayers, mySquad, preset, simulationBid, simulationPlayerId]);

  if (!isOpen || !tournament) return null;

  const purseLimit = preset.totalPurse * ((plan.budgetPercent ?? 100) / 100);
  const actualSpend = mySquad.reduce((total, player) => total + Number(player.boughtFor || player.basePrice || 0), 0);
  const roleTargets = plan.roleTargets || {};
  const settledByMe = (tournament.players || [])
    .filter(player => player.status === 'WON_BY_ME')
    .map(player => ({
      player,
      fairValue: Number(player.fairValueAtSale || calculateProjectedValue(player, preset, 1, tournament.players)),
      paid: Number(player.boughtFor || 0)
    }));
  const bestValue = [...settledByMe].sort((a, b) => (a.paid / Math.max(0.01, a.fairValue)) - (b.paid / Math.max(0.01, b.fairValue)))[0];
  const largestPremium = [...settledByMe].sort((a, b) => (b.paid / Math.max(0.01, b.fairValue)) - (a.paid / Math.max(0.01, a.fairValue)))[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white p-1" aria-label="Close auction review">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"><BarChart3 className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base font-bold text-white">Auction Review</h2>
            <p className="text-xs text-slate-400">Plan versus result, outcome log, and a non-destructive what-if simulation.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Players acquired" value={`${mySquad.length} / ${preset.minSquad} minimum`} />
          <Metric label="Purse spent" value={`${preset.currency}${actualSpend.toFixed(2)} ${preset.unit}`} />
          <Metric label="Purse remaining" value={`${preset.currency}${Math.max(0, preset.totalPurse - actualSpend).toFixed(2)} ${preset.unit}`} />
          <Metric label="Team rating" value={mySquad.reduce((sum, player) => sum + (Number(player.rating) || 0), 0).toFixed(1)} />
        </div>

        {settledByMe.length > 0 && (
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <Metric label="Best value vs estimate" value={`${bestValue.player.name} · ${preset.currency}${bestValue.paid.toFixed(2)} paid / ${preset.currency}${bestValue.fairValue.toFixed(2)} est.`} />
            <Metric label="Largest premium vs estimate" value={`${largestPremium.player.name} · ${preset.currency}${largestPremium.paid.toFixed(2)} paid / ${preset.currency}${largestPremium.fairValue.toFixed(2)} est.`} />
          </div>
        )}

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider text-cyan-300 font-bold">Budget pacing</h3>
            <span className="text-xs text-slate-300">Planned ceiling {preset.currency}{purseLimit.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full ${actualSpend > purseLimit ? 'bg-rose-500' : 'bg-cyan-400'}`} style={{ width: `${Math.min(100, actualSpend / preset.totalPurse * 100)}%` }} />
          </div>
          <p className={`mt-2 text-xs ${actualSpend > purseLimit ? 'text-rose-300' : 'text-slate-400'}`}>
            {actualSpend > purseLimit ? 'You exceeded the planned spend. The remaining budget still follows the tournament purse rules.' : `${preset.currency}${Math.max(0, purseLimit - actualSpend).toFixed(2)} remains within your planned spend.`}
          </p>
        </section>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-3">Blueprint versus squad</h3>
          <div className="space-y-2">
            {preset.roles.map(role => {
              const target = Number(roleTargets[role.id] || 0);
              const actual = mySquad.filter(player => player.role === role.id).length;
              const percentage = target > 0 ? Math.min(100, actual / target * 100) : 100;
              return (
                <div key={role.id}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{role.label}</span><span className={actual >= target ? 'text-emerald-300' : 'text-amber-300'}>{actual} / {target || 'no target'}</span></div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full ${actual >= target ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-xs uppercase tracking-wider text-emerald-300 font-bold mb-3">What-if: simulate a purchase</h3>
          <div className="grid md:grid-cols-[1fr_180px] gap-2">
            <select value={simulationPlayerId} onChange={event => setSimulationPlayerId(event.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
              <option value="">Choose an available player…</option>
              {availablePlayers.map(player => <option key={player.id} value={player.id}>{player.name} · {player.role} · rating {player.rating}</option>)}
            </select>
            <input type="number" min="0" step="0.01" value={simulationBid} onChange={event => setSimulationBid(event.target.value)} placeholder="Bid amount" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
          </div>
          {simulation && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Metric label="Simulated cost" value={`${preset.currency}${simulation.amount.toFixed(2)}`} />
              <Metric label="Purse after" value={`${preset.currency}${simulation.after.purseRemaining.toFixed(2)}`} />
              <Metric label="Rating change" value={`+${(simulation.after.totalRating - simulation.before.totalRating).toFixed(1)}`} />
              <Metric label="Safe max after" value={`${preset.currency}${simulation.after.maxSafeBid.toFixed(2)}`} />
            </div>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500"><FlaskConical className="w-3 h-3" />Simulation does not change the auction or mark the player as purchased.</p>
        </section>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-300 font-bold mb-3">Auction event log ({timeline.length})</h3>
          {timeline.length ? (
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {timeline.map(entry => (
                <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-800/70 pb-1.5 text-xs">
                  <div><span className="font-semibold text-white">{entry.playerName}</span><span className="text-slate-400"> · {entry.label}</span>{entry.note && <div className="text-[10px] text-slate-500 mt-0.5">Note: {entry.note}</div>}</div>
                  <div className="text-right text-slate-400">{entry.amount > 0 ? `${preset.currency}${Number(entry.amount).toFixed(2)}` : '—'}<div className="text-[10px]">{new Date(entry.timestamp).toLocaleString()}</div></div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500">No recorded outcomes yet.</p>}
        </section>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2">Restore checkpoint</h3>
          <p className="text-[10px] text-slate-500 mb-3">Restore to the state immediately before a recent change. This discards newer changes.</p>
          {tournament.history?.length ? (
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {tournament.history.map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                  <div><div className="text-xs text-white">{entry.action}</div><div className="text-[10px] text-slate-500">{new Date(entry.createdAt).toLocaleString()}</div></div>
                  <button type="button" onClick={() => onRestoreHistoryEntry(entry.id)} className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">Restore before</button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500">No recent checkpoints are available.</p>}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-[10px] uppercase text-slate-500">{label}</div><div className="mt-1 text-sm font-bold text-white">{value}</div></div>;
}
