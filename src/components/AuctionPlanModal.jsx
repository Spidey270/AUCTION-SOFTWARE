import React, { useEffect, useState } from 'react';
import { X, Target, Save } from 'lucide-react';

export default function AuctionPlanModal({
  isOpen,
  onClose,
  preset,
  players,
  targetsList,
  plan,
  onSave
}) {
  const [draft, setDraft] = useState(plan);

  useEffect(() => {
    if (isOpen) setDraft(plan);
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const updateRoleTarget = (role, value) => {
    const parsed = Number.parseInt(value, 10);
    setDraft(previous => ({
      ...previous,
      roleTargets: {
        ...previous.roleTargets,
        [role]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0
      }
    }));
  };

  const updateTargetSetting = (playerId, key, value) => {
    setDraft(previous => {
      const current = previous.targetSettings?.[playerId] || {};
      return {
      ...previous,
      targetSettings: {
        ...previous.targetSettings,
        [playerId]: {
          ...current,
          [key]: key === 'ceiling' ? (value === '' ? '' : Math.max(0, Number(value))) : value
        }
      }
      };
    });
  };

  const updateIncrement = (index, value) => {
    setDraft(previous => {
      const increments = [...(previous.bidIncrements || preset.bidIncrements || [])];
      increments[index] = Math.max(0.01, Number(value) || 0.01);
      return { ...previous, bidIncrements: increments };
    });
  };

  const targetPlayers = players.filter(player => targetsList.includes(player.id));
  const updateBudgetPercent = (value) => setDraft(previous => ({
    ...previous,
    budgetPercent: Math.min(100, Math.max(1, Number(value) || 1))
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white p-1" aria-label="Close auction plan">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Auction Plan</h2>
            <p className="text-xs text-slate-400">Set roster priorities, planned spending, target tiers, and live bid increments.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs uppercase tracking-wider text-cyan-300 font-bold mb-3">Squad blueprint</h3>
            <div className="space-y-2">
              {preset.roles.map(role => (
                <label key={role.id} className="flex items-center justify-between gap-3 text-xs text-slate-300">
                  <span>{role.label}</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.roleTargets?.[role.id] ?? 0}
                    onChange={event => updateRoleTarget(role.id, event.target.value)}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white"
                    aria-label={`${role.label} target count`}
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-500">These are strategic targets, not official roster limits.</p>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs uppercase tracking-wider text-cyan-300 font-bold mb-3">Budget pacing & bid increments</h3>
            <label className="block text-xs text-slate-300 mb-1">Target maximum planned spend (% of purse)</label>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="number"
                min="1"
                max="100"
                value={draft.budgetPercent ?? 100}
                onChange={event => updateBudgetPercent(event.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white"
              />
              <span className="text-xs text-slate-400">= {preset.currency}{(preset.totalPurse * (draft.budgetPercent ?? 100) / 100).toFixed(2)} {preset.unit}</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-4">The rest remains a contingency reserve; it does not change the legal safe-bid calculation.</p>
            <div className="grid grid-cols-2 gap-2">
              {(draft.bidIncrements || preset.bidIncrements || []).map((increment, index) => (
                <label key={index} className="text-[10px] text-slate-400">
                  Raise {index + 1}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={increment}
                    onChange={event => updateIncrement(index, event.target.value)}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-amber-300 font-bold">Target board</h3>
            <span className="text-[10px] text-slate-500">{targetPlayers.length} watched — add players with the star in the player pool</span>
          </div>
          {targetPlayers.length === 0 ? (
            <p className="text-xs text-slate-500">No targets yet. Star players in the player pool, then set their priority and walk-away ceiling here.</p>
          ) : (
            <div className="space-y-2">
              {targetPlayers.map(player => {
                const setting = draft.targetSettings?.[player.id] || {};
                return (
                  <div key={player.id} className="grid grid-cols-1 md:grid-cols-[1fr_150px_140px] items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div>
                      <div className="text-xs font-bold text-white">{player.name}</div>
                      <div className="text-[10px] text-slate-400">{player.role} · {player.rating} rating · base {preset.currency}{Number(player.basePrice || 0).toFixed(2)}</div>
                    </div>
                    <select
                      value={setting.priority || 'value'}
                      onChange={event => updateTargetSetting(player.id, 'priority', event.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      aria-label={`${player.name} target priority`}
                    >
                      <option value="must-have">Must-have</option>
                      <option value="value">Value pick</option>
                      <option value="backup">Backup</option>
                      <option value="avoid">Avoid</option>
                    </select>
                    <label className="flex items-center gap-1 text-[10px] text-slate-400">
                      Ceiling
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={setting.ceiling ?? ''}
                        placeholder="No cap"
                        onChange={event => updateTargetSetting(player.id, 'ceiling', event.target.value)}
                        className="min-w-0 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        aria-label={`${player.name} personal price ceiling`}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-5 flex justify-end">
          <button onClick={() => { onSave(draft, true); onClose(); }} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}
