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
import { calculateMaxSafeBid, calculateProjectedValue } from '../utils/auctionMath';

export default function HammerArena({
  activePlayer,
  allPlayers,
  preset,
  teamSummary,
  rivals,
  myTeamName = 'My Team',
  auctionLog = [],
  auctionPlan = {},
  auctionFocus = false,
  keyboardEnabled = true,
  onToggleAuctionFocus,
  onWinPlayer,
  onSellToRival,
  onMarkUnsold,
  onNextPlayer,
  onSelectPlayerForHammer,
  onOpenAiStrategist
}) {
  const [currentBid, setCurrentBid] = useState(0);
  const [selectedRivalId, setSelectedRivalId] = useState(rivals[0]?.id || '');
  const [decisionNote, setDecisionNote] = useState('');

  // Reset bid when active player changes
  useEffect(() => {
    if (activePlayer) {
      setCurrentBid(activePlayer.basePrice || preset.basePriceDefault);
      setDecisionNote('');
    }
  }, [activePlayer?.id]);

  useEffect(() => {
    if (!keyboardEnabled) return undefined;
    const handleAuctionKeys = (event) => {
      if (!activePlayer || event.repeat || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
      const key = event.key.toLowerCase();
      const incrementIndex = Number.parseInt(key, 10) - 1;

      if (incrementIndex >= 0 && incrementIndex < (preset.bidIncrements || []).length) {
        event.preventDefault();
        const increment = Number(preset.bidIncrements[incrementIndex]);
        setCurrentBid(previous => Number((previous + increment).toFixed(2)));
      } else if (key === 'w' || event.key === 'Enter') {
        event.preventDefault();
        const roleLimit = preset[`maxRole_${activePlayer.role}`];
        const roleCount = teamSummary.roleCounts?.[activePlayer.role] || 0;
        const canWin = currentBid <= teamSummary.maxSafeBid &&
          !teamSummary.isMaxSquadFull &&
          !(activePlayer.overseas && teamSummary.overseasLimitHit) &&
          !(roleLimit !== undefined && roleCount >= roleLimit);
        if (canWin) {
          onWinPlayer(activePlayer, currentBid, decisionNote);
        }
      } else if (key === 'r') {
        const rivalId = selectedRivalId || rivals[0]?.id;
        if (rivalId) onSellToRival(activePlayer, rivalId, currentBid, decisionNote);
      } else if (key === 'u') {
        onMarkUnsold(activePlayer, decisionNote);
      } else if (key === 'n') {
        onNextPlayer();
      }
    };

    window.addEventListener('keydown', handleAuctionKeys);
    return () => window.removeEventListener('keydown', handleAuctionKeys);
  }, [activePlayer, currentBid, decisionNote, onWinPlayer, onSellToRival, onMarkUnsold, onNextPlayer, preset.bidIncrements, selectedRivalId, rivals, teamSummary, keyboardEnabled]);

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
  const fairValue = calculateProjectedValue(activePlayer, preset, 1.0, allPlayers);
  const alternatives = (allPlayers || [])
    .filter(player => !player.status && player.id !== activePlayer.id && player.role === activePlayer.role)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 3);
  
  // Rule Checks
  const isOverSafeBid = currentBid > teamSummary.maxSafeBid;
  const isOverMaxSquad = teamSummary.isMaxSquadFull;
  const isOverForeign = activePlayer.overseas && teamSummary.overseasLimitHit;
  
  // Role Limit Check
  const maxForThisRole = preset[`maxRole_${activePlayer.role}`];
  const currentCountForRole = teamSummary.roleCounts ? teamSummary.roleCounts[activePlayer.role] || 0 : 0;
  const playerPlan = auctionPlan.targetSettings?.[activePlayer.id] || {};
  const personalCeiling = Number(playerPlan.ceiling);
  const hasPersonalCeiling = Number.isFinite(personalCeiling) && personalCeiling > 0;
  const roleTarget = Number(auctionPlan.roleTargets?.[activePlayer.role] || 0);
  const roleGap = Math.max(0, roleTarget - currentCountForRole);
  const isOverRoleLimit = maxForThisRole !== undefined && currentCountForRole >= maxForThisRole;

  const isLegalForMe = !isOverSafeBid && !isOverMaxSquad && !isOverForeign && !isOverRoleLimit;
  const personalLimit = hasPersonalCeiling ? Math.min(personalCeiling, teamSummary.maxSafeBid) : teamSummary.maxSafeBid;
  const isAvoidTarget = playerPlan.priority === 'avoid';
  const priorityMultiplier = playerPlan.priority === 'must-have' ? 1.2 : playerPlan.priority === 'backup' ? 0.95 : 1.08;
  const smartMaxBid = Math.min(personalLimit, Number((fairValue * priorityMultiplier).toFixed(2)));
  const pressureBid = Math.min(personalLimit, Number((fairValue * (priorityMultiplier + 0.1)).toFixed(2)));
  const walkAwayValue = Math.min(activePlayer.basePrice, Number((fairValue * 0.88).toFixed(2)));
  const withinPersonalCeiling = !hasPersonalCeiling || currentBid <= personalCeiling;
  const shouldRecommendBid = isLegalForMe && withinPersonalCeiling && currentBid <= fairValue * 1.35 && !isAvoidTarget;
  const nextRiskText =
    isOverSafeBid
      ? `This exceeds your safety ceiling by ${preset.currency}${(currentBid - teamSummary.maxSafeBid).toFixed(2)} ${preset.unit}.`
      : isOverRoleLimit
      ? `You already have enough ${roleObj?.label || activePlayer.role} slots for a legal bid.`
      : isOverForeign
      ? `Overseas cap is full; this purchase would break the roster rule.`
      : !withinPersonalCeiling
      ? `Above your ${playerPlan.priority || 'value'} target ceiling (${preset.currency}${personalCeiling.toFixed(2)}). Legal, but planned as a walk-away.`
      : isAvoidTarget
      ? 'You marked this player to avoid; bidding is still legally possible but against your plan.'
      : `This is a legal bid. Keep enough room to finish your minimum squad.`;

  const availablePlayers = allPlayers.filter(player => !player.status);
  const nomination = preset.roles
    .map(role => {
      const target = Number(auctionPlan.roleTargets?.[role.id] || 0);
      const count = teamSummary.roleCounts?.[role.id] || 0;
      const candidate = availablePlayers
        .filter(player => player.role === role.id)
        .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0];
      return { role, deficit: Math.max(0, target - count), candidate };
    })
    .filter(item => item.deficit > 0 && item.candidate && item.candidate.id !== activePlayer.id)
    .sort((a, b) => b.deficit - a.deficit || (Number(b.candidate.rating) || 0) - (Number(a.candidate.rating) || 0))[0];

  const rivalThreats = rivals.map(rival => {
    const rivalRemaining = Math.max(0, preset.totalPurse - Number(rival.purseSpent || 0));
    const rivalSlots = Number(rival.playersCount || 0);
    const rivalMaxBid = calculateMaxSafeBid(rivalRemaining, rivalSlots, preset.minSquad, preset.maxSquad, preset.basePriceDefault);
    const rolePlayers = (rival.acquired || []).filter(player => player.role === activePlayer.role).length;
    return {
      rival,
      maxBid: rivalMaxBid,
      score: (rivalMaxBid >= activePlayer.basePrice ? 2 : 0) + (rolePlayers === 0 ? 1 : 0) + Math.min(1, rivalRemaining / preset.totalPurse)
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

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

  const handleSuggestedBid = (target) => {
    if (Number.isFinite(target)) setCurrentBid(Number(Math.max(0, target).toFixed(2)));
  };

  // Handle Winning
  const handleWin = () => {
    if (!isLegalForMe) return;
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    onWinPlayer(activePlayer, currentBid, decisionNote);
  };

  const handleRivalSale = () => {
    const targetRival = rivals.find(r => r.id === selectedRivalId) || rivals[0];
    if (targetRival) {
      onSellToRival(activePlayer, targetRival.id, currentBid, decisionNote);
    }
  };

  return (
    <div className={`live-auction glass-panel rounded-xl ${auctionFocus ? 'p-8 min-h-[70vh]' : 'p-6'} flex flex-col justify-between relative overflow-hidden`}>

      {/* TOP HEADER: Player Identity Card */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Rating Hex Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-lg bg-[#28251e] border border-[#5c5037] flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono uppercase text-[#d2b77c] font-semibold tracking-wider">
                  RATING
                </span>
                <span className="text-2xl font-bold font-mono text-white tracking-tight">
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
                    ✈️ {preset.sport === 'cricket' ? 'Foreign' : 'Overseas'} ({activePlayer.country})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    📍 {preset.sport === 'cricket' ? 'Indian' : 'Domestic'} ({activePlayer.country})
                  </span>
                )}
                {activePlayer.tier && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {activePlayer.tier}
                  </span>
                )}
              </div>
              <h2 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight">
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
          <div className="flex items-center gap-3 bg-[#121816] p-2.5 rounded-lg border border-slate-800">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-500">Base Price</div>
              <div className="text-sm font-bold font-mono text-slate-300">
                {preset.currency} {activePlayer.basePrice.toFixed(2)} {preset.unit}
              </div>
            </div>
            <div className="h-7 w-[1px] bg-slate-800"></div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-500">Est. Fair Value</div>
              <div className="text-sm font-semibold font-mono text-[#b5c49a]">
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

        <div className="my-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 rounded-xl border border-slate-800 bg-[#121816] p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#b5c49a]" />
                <span className="text-xs text-slate-200 font-semibold">Bid guide</span>
              </div>
              <button
                type="button"
                onClick={onToggleAuctionFocus}
                className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900 text-[10px] text-slate-200 hover:border-[#788a79]"
              >
                {auctionFocus ? 'Exit Focus Mode' : 'Auction Focus Mode'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="rounded-lg border border-slate-800 bg-[#19211d] p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Recommendation</div>
                <div className={`mt-2 text-lg font-black ${shouldRecommendBid ? 'text-emerald-300' : 'text-rose-300'}`}>{shouldRecommendBid ? 'BID' : 'PASS'}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#19211d] p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Suggested ceiling</div>
                <div className="mt-2 text-lg font-black text-white">{preset.currency}{smartMaxBid.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#19211d] p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Check</div>
                <div className="mt-2 text-sm font-bold text-white">{nextRiskText}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleSuggestedBid(smartMaxBid)} className="quiet-button px-3 py-2 rounded-md bg-[#26312b] border border-[#46534b] text-[#c4d0b3] text-xs font-semibold">Suggested ceiling</button>
              <button type="button" onClick={() => handleSuggestedBid(fairValue)} className="quiet-button px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">Estimate</button>
              <button type="button" onClick={() => handleSuggestedBid(pressureBid)} className="quiet-button px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">Stretch bid</button>
              <button type="button" onClick={() => handleSuggestedBid(walkAwayValue)} className="quiet-button px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">Base / pass</button>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400"><span>Role blueprint</span><span>{currentCountForRole} / {roleTarget || '—'}</span></div>
                <p className="mt-1 text-xs text-white">{roleGap > 0 ? `Need ${roleGap} more ${roleObj?.label || activePlayer.role}${roleGap === 1 ? '' : 's'}.` : 'Role target met; this is optional depth.'}</p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full ${roleGap ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${roleTarget ? Math.min(100, currentCountForRole / roleTarget * 100) : 100}%` }} /></div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400"><span>Budget pacing</span><span>{preset.currency}{(teamSummary.purseSpent + currentBid).toFixed(2)} / {preset.currency}{(preset.totalPurse * (auctionPlan.budgetPercent ?? 100) / 100).toFixed(2)}</span></div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full ${teamSummary.purseSpent + currentBid > preset.totalPurse * (auctionPlan.budgetPercent ?? 100) / 100 ? 'bg-rose-400' : 'bg-cyan-400'}`} style={{ width: `${Math.min(100, (teamSummary.purseSpent + currentBid) / preset.totalPurse * 100)}%` }} /></div>
                {hasPersonalCeiling && <p className="mt-1 text-[10px] text-amber-300">{playerPlan.priority || 'Target'} walk-away: {preset.currency}{personalCeiling.toFixed(2)}</p>}
              </div>
            </div>
            {!auctionFocus && (
              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold mb-1">Next nomination</div>
                  {nomination ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white">{nomination.candidate.name} · {nomination.role.id} · {nomination.candidate.rating}</span>
                      <button type="button" onClick={() => onSelectPlayerForHammer?.(nomination.candidate)} className="px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-bold">Call</button>
                    </div>
                  ) : <p className="text-[10px] text-slate-500">No unfilled blueprint role has a remaining player.</p>}
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-rose-300 font-bold mb-1">Likely rival threats</div>
                  {rivalThreats.length ? rivalThreats.map(item => (
                    <div key={item.rival.id} className="flex justify-between text-[10px] text-slate-300"><span>{item.rival.name}</span><span>safe max {preset.currency}{item.maxBid.toFixed(2)}</span></div>
                  )) : <p className="text-[10px] text-slate-500">No rival teams tracked.</p>}
                </div>
              </div>
            )}
          </div>

          {!auctionFocus && <div className="xl:col-span-4 rounded-xl border border-slate-800 bg-[#121816] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-300 font-bold">Alternatives</span>
              <span className="text-[10px] text-slate-500">Top 3 role peers</span>
            </div>

            <div className="space-y-2">
              {alternatives.length > 0 ? alternatives.map((player) => (
                <div key={player.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">{player.name}</div>
                      <div className="text-[10px] text-slate-400">{player.role} · {player.rating} OVR</div>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300">{preset.currency}{Number(player.basePrice || 0).toFixed(2)}</div>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-700 p-3 text-[11px] text-slate-500">No comparable role alternatives in the current pool.</div>
              )}
            </div>
          </div>}
        </div>

        {!auctionFocus && auctionLog && auctionLog.length > 0 && (
          <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-bold">Auction timeline</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {auctionLog.slice(0, 12).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                  <div>
                    <div className="text-xs font-bold text-white">{entry.label}</div>
                    <div className="text-[10px] text-slate-400">{entry.playerName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-cyan-300">{entry.amount > 0 ? `${preset.currency}${Number(entry.amount).toFixed(2)}` : '—'}</div>
                    <div className="text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MIDDLE SECTION: Live Hammer Bid Center */}
        <div className="my-5 bg-[#121816] rounded-xl border border-slate-800 p-5 relative">
          
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#b5c49a]"></span>
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                CURRENT BID
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
                <span className={`${auctionFocus ? 'text-6xl lg:text-7xl' : 'text-4xl lg:text-5xl'} bid-price font-bold font-mono tracking-tight`}>
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
                ) : isOverRoleLimit ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Role limit reached ({maxForThisRole} max for {roleObj?.label}). Cannot bid.</span>
                  </div>
                ) : isOverForeign ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Overseas limit reached ({preset.maxOverseas} max). Cannot bid on foreign player.</span>
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
                {preset.bidIncrements.map((inc, index) => (
                  <button
                    key={inc}
                    onClick={() => handleAddBid(inc)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-mono font-bold text-sm transition hover:border-cyan-500/50 flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span>{index + 1}: +{preset.currency}{inc.toFixed(2)}</span>
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

            <label className="mb-3 block text-[10px] uppercase tracking-wider text-slate-400">
              Decision note (optional; saved with outcome)
              <input
                type="text"
                value={decisionNote}
                onChange={event => setDecisionNote(event.target.value)}
                placeholder="e.g. fills wicketkeeper gap / passed above ceiling"
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </label>

          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Hammer Execution Controls */}
      <div className="pt-2">
        {/* Prominent Final Sold Price Input Space */}
        <div className="mb-3.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-between gap-3 flex-wrap shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                Final Sold / Hammer Price
                <span className="text-[10px] text-cyan-400 font-normal lowercase">(type closing bid)</span>
              </span>
              <p className="text-[10px] text-slate-400">
                Adjust or type the exact closing amount before marking sold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border-2 border-cyan-500/50 focus-within:border-cyan-400 rounded-xl px-3 py-1.5 shadow-glow-cyan">
              <span className="text-sm font-bold font-mono text-cyan-400 mr-2">{preset.currency}</span>
              <input
                type="number"
                step="0.05"
                value={currentBid}
                onChange={(e) => setCurrentBid(Math.max(0, Number(e.target.value)))}
                className="w-28 bg-transparent text-lg font-black font-mono text-white text-center focus:outline-none"
                placeholder="0.00"
              />
              <span className="text-xs font-bold font-mono text-slate-400 ml-1.5">{preset.unit}</span>
            </div>

            <button
              onClick={() => setCurrentBid(activePlayer.basePrice)}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition"
              title="Reset to Base Price"
            >
              Base
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* WIN FOR ME / MY TEAM */}
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
              <span>WON BY {myTeamName.toUpperCase()} ({preset.currency}{currentBid.toFixed(2)})</span>
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
              onClick={() => onMarkUnsold(activePlayer, decisionNote)}
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
