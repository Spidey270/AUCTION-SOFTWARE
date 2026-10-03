import React, { useState } from 'react';
import { Sliders, X, Check, Save } from 'lucide-react';

export default function RuleSettingsModal({
  isOpen,
  onClose,
  preset,
  onSavePreset
}) {
  const initialRoleLimits = {};
  preset.roles.forEach(r => {
    initialRoleLimits[`maxRole_${r.id}`] = preset[`maxRole_${r.id}`] || '';
  });

  const [formData, setFormData] = useState({
    totalPurse: preset.totalPurse,
    minSquad: preset.minSquad,
    maxSquad: preset.maxSquad,
    maxOverseas: preset.maxOverseas,
    basePriceDefault: preset.basePriceDefault,
    currency: preset.currency,
    unit: preset.unit,
    ...initialRoleLimits
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedPreset = {
      ...preset,
      totalPurse: parseFloat(formData.totalPurse) || 100,
      minSquad: parseInt(formData.minSquad, 10) || 15,
      maxSquad: parseInt(formData.maxSquad, 10) || 25,
      maxOverseas: parseInt(formData.maxOverseas, 10) || 8,
      basePriceDefault: parseFloat(formData.basePriceDefault) || 0.5,
      currency: formData.currency,
      unit: formData.unit
    };
    preset.roles.forEach(r => {
      const val = parseInt(formData[`maxRole_${r.id}`], 10);
      if (!isNaN(val)) updatedPreset[`maxRole_${r.id}`] = val;
      else delete updatedPreset[`maxRole_${r.id}`];
    });
    onSavePreset(updatedPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Tournament Auction Rules</h3>
            <p className="text-xs text-slate-400">
              Configure budget limits, squad sizes, and competition constraints
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Purse & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Currency</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="col-span-1">
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                placeholder="Cr / M / L"
              />
            </div>
            <div className="col-span-1">
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Total Purse</label>
              <input
                type="number"
                step="0.5"
                value={formData.totalPurse}
                onChange={(e) => setFormData({ ...formData, totalPurse: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Squad Min / Max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Min Squad Slots</label>
              <input
                type="number"
                value={formData.minSquad}
                onChange={(e) => setFormData({ ...formData, minSquad: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Mandatory roster minimum</span>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Max Squad Slots</label>
              <input
                type="number"
                value={formData.maxSquad}
                onChange={(e) => setFormData({ ...formData, maxSquad: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Ceiling limit</span>
            </div>
          </div>

          {/* Overseas & Base Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Max Overseas / Foreign</label>
              <input
                type="number"
                value={formData.maxOverseas}
                onChange={(e) => setFormData({ ...formData, maxOverseas: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Default Base Price</label>
              <input
                type="number"
                step="0.1"
                value={formData.basePriceDefault}
                onChange={(e) => setFormData({ ...formData, basePriceDefault: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          {/* Role Caps */}
          <div className="border-t border-slate-800 pt-3">
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-2">Max Players per Role (Optional)</label>
            <div className="grid grid-cols-2 gap-3">
              {preset.roles.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold w-12 ${r.color}`}>{r.id}</span>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={formData[`maxRole_${r.id}`]}
                    onChange={(e) => setFormData({ ...formData, [`maxRole_${r.id}`]: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-sm text-white font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Rules</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
