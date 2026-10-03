import React, { useState, useEffect } from 'react';
import { 
  Gavel, 
  CheckCircle2, 
  XCircle, 
  Users, 
  ShieldAlert, 
  TrendingUp, 
  Sparkles, 
  DollarSign, 
  ChevronRight,
  UserCheck,
  AlertTriangle,
  Award,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateProjectedValue } from '../utils/auctionMath';

export default function HammerArena({
  activePlayer,
  preset,
  teamSummary,
  rivals,
  onWinPlayer,
  onSellToRival,
  onMarkUnsold,
  onNextPlayer,
  onOpenAiStrategist
}) {
  const [currentBid, setCurrentBid] = useState(0);
  const [leadingTeam, setLeadingTeam] = useState('me'); // 'me' or rival id
  const [selectedRivalId, setSelectedRivalId] = useState(rivals[0]?.id || '');

  // Reset bid when active player changes
  useEffect(() => {
    if (activePlayer) {
      setCurrentBid(activePlayer.basePrice || preset.basePriceDefault);
      setLeadingTeam('me');
    }
  }, [activePlayer?.id]);

  if (!activePlayer) {
    return (
      <div className="glass-panel rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[460px] border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
          <Gavel className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Auction Hammer is Idle</h3>
        <p className="text-slate-400 max-w-md text-sm mb-6">
          No player is currently on the auction block. Select any player from the database below or queue to start the bidding war!
        </p>
        <button
          onClick={onNextPlayer}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-sm shadow-glow-cyan hover:brightness-110 transition flex items-center gap-2"
        >
          <span>Call First Available Player</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const roleObj = preset.roles.find(r => r.id === activePlayer.role);
  const fairValue = calculateProjectedValue(activePlayer, preset);
  const isOverSafeBid = currentBid > teamSummary.maxSafeBid;
  const isOverMaxSquad = teamSummary.isMaxSquadFull;
  const isOverForeign = activePlayer.overseas && teamSummary.overseasLimitHit;
  const isLegalForMe = !isOverSafeBid && !isOverMaxSquad && !isOverForeign;

  // Valuation status
  let valuationTag = { label: 'FAIR VALUE', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };
  if (currentBid <= fairValue * 0.8) {
    valuationTag = { label: '🔥 STEAL / BARGAIN', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
  } else if (currentBid >= fairValue * 1.35) {
    valuationTag = { label: '⚠️ PREMIUM / OVERPAY', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
  }

  // Handle rapid bid increment
  const handleAddBid = (increment) => {
    setCurrentBid(prev => Number((prev + increment).toFixed(2)));
  };

  // Handle Winning
  const handleWin = () => {
    if (!isLegalForMe) return;
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    onWinPlayer(activePlayer, currentBid);
  };

  const handleRivalSale = () => {
    const targetRival = rivals.find(r => r.id === selectedRivalId) || rivals[0];
    if (targetRival) {
      onSellToRival(activePlayer, targetRival.id, currentBid);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
      {/* Ambient glowing background aura */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* TOP HEADER: Player Identity Card */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Rating Hex Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-indigo-950 border-2 border-amber-500/40 flex flex-col items-center justify-center shadow-glow-gold">
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold tracking-wider">
                  RATING
                </span>
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {activePlayer.rating}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${roleObj?.border} ${roleObj?.bg} ${roleObj?.color}`}>
                  {roleObj?.label || activePlayer.role}
                </span>
                {activePlayer.overseas ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                    ✈️ Overseas ({activePlayer.country})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    📍 Domestic ({activePlayer.country})
                  </span>
                )}
                {activePlayer.tier && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {activePlayer.tier}
                  </span>
                )}
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                {activePlayer.name}
              </h2>
              {activePlayer.notes && (
                <p className="text-xs text-slate-400 mt-1 italic">
                  💡 {activePlayer.notes}
                </p>
              )}
            </div>
          </div>

          {/* Base & Projected Value Benchmarks */}
          <div className="flex items-center gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-500">Base Price</div>
              <div className="text-sm font-bold font-mono text-slate-300">
                {preset.currency} {activePlayer.basePrice.toFixed(2)} {preset.unit}
              </div>
            </div>
            <div className="h-7 w-[1px] bg-slate-800"></div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-500">Est. Fair Value</div>
              <div className="text-sm font-bold font-mono text-cyan-300">
                {preset.currency} {fairValue.toFixed(2)} {preset.unit}
              </div>
            </div>
            {onOpenAiStrategist && (
              <>
                <div className="h-7 w-[1px] bg-slate-800"></div>
                <button
                  type="button"
                  onClick={onOpenAiStrategist}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition shadow-sm"
                  title="Ask AI Strategist for instant bidding advice"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>Ask AI</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION: Live Hammer Bid Center */}
        <div className="my-5 bg-slate-950/70 rounded-2xl border border-slate-800/90 p-5 relative">
          
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                LIVE AUCTION BIDDING
              </span>
            </div>

            {/* Valuation indicator badge */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${valuationTag.color}`}>
              {valuationTag.label}
            </span>
          </div>

          {/* Big Bid Display & Safe Bid Radar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* The Huge Bid Number */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                Current Hammer Price
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-black font-mono text-white tracking-tight">
                  {preset.currency} {currentBid.toFixed(2)}
                </span>
                <span className="text-xl font-bold font-mono text-slate-400">
                  {preset.unit}
                </span>
              </div>

              {/* Safety Feedback Bar */}
              <div className="mt-3">
                {isOverSafeBid ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/30">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>ILLEGAL BID: Exceeds safe limit ({preset.currency}{teamSummary.maxSafeBid.toFixed(2)})! Remaining slots cannot be filled at base price.</span>
                  </div>
                ) : isOverMaxSquad ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Squad limit reached ({preset.maxSquad} players). Cannot buy more players.</span>
                  </div>
                ) : isOverForeign ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Overseas cap reached ({preset.maxOverseas} max). Cannot bid on foreign player.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>Safe Bid Approved. Max buffer room remaining: {preset.currency}{(teamSummary.maxSafeBid - currentBid).toFixed(2)} {preset.unit}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Bid Increment Buttons */}
            <div className="md:col-span-5 flex flex-col gap-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Quick Raise (Fast Hammer)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {preset.bidIncrements.map((inc) => (
                  <button
                    key={inc}
                    onClick={() => handleAddBid(inc)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-mono font-bold text-sm transition hover:border-cyan-500/50 flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span>+{preset.currency}{inc.toFixed(2)}</span>
                  </button>
                ))}
              </div>

              {/* Direct Manual Input */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={currentBid}
                  onChange={(e) => setCurrentBid(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Set custom bid"
                />
                <button
                  onClick={() => setCurrentBid(activePlayer.basePrice)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 whitespace-nowrap"
                  title="Reset to base price"
                >
                  Reset Base
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Hammer Execution Controls */}
      <div className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* WIN FOR ME (Large Emerald Button) */}
          <div className="md:col-span-6">
            <button
              onClick={handleWin}
              disabled={!isLegalForMe}
              className={`w-full py-3.5 px-5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                isLegalForMe
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 hover:brightness-110 shadow-glow-emerald active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Award className="w-5 h-5" />
              <span>HAMMER DOWN: WON BY ME ({preset.currency}{currentBid.toFixed(2)})</span>
            </button>
          </div>

          {/* SOLD TO RIVAL */}
          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={selectedRivalId}
              onChange={(e) => setSelectedRivalId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-2.5 py-3.5 focus:outline-none focus:border-cyan-500 max-w-[130px]"
            >
              {rivals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleRivalSale}
              className="flex-1 py-3.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Sold to Rival</span>
            </button>
          </div>

          {/* UNSOLD / PASS */}
          <div className="md:col-span-2">
            <button
              onClick={() => onMarkUnsold(activePlayer)}
              className="w-full py-3.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Unsold</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
