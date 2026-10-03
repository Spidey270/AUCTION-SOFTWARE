import React from 'react';
import { Keyboard, X, Zap } from 'lucide-react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', desc: 'Instant search & filter players in database' },
    { key: 'W or Enter', desc: 'Hammer Down: Win player for My Team' },
    { key: 'R', desc: 'Hammer Down: Sell player to selected Rival team' },
    { key: 'U', desc: 'Pass / Mark player Unsold' },
    { key: '1, 2, 3, 4', desc: 'Quick bid increment buttons (+0.2, +0.5, +1, +2)' },
    { key: 'N or Space', desc: 'Next player from the database queue' },
    { key: 'Esc', desc: 'Close any active modal or search' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Tactical Speed Keys</h3>
            <p className="text-xs text-slate-400">
              Operate the auction at esports reaction speeds
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
              <span className="text-slate-300 font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono font-bold shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
