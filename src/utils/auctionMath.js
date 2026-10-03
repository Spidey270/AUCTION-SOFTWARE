// Tactical War Room calculations for tournament auctions

/**
 * Calculates the absolute maximum bid a team can make without violating minimum roster constraints.
 */
export function calculateMaxSafeBid(purseRemaining, currentSquadCount, minSquad, maxSquad, basePrice = 0.5) {
  if (currentSquadCount >= maxSquad) {
    return 0; // Squad is already full
  }

  // If this bid succeeds, the team will have (currentSquadCount + 1) players.
  const emptySlotsAfterThis = Math.max(0, minSquad - (currentSquadCount + 1));
  const reserveNeeded = emptySlotsAfterThis * basePrice;
  const maxBid = purseRemaining - reserveNeeded;

  return Math.max(0, Number(maxBid.toFixed(2)));
}

export function calculateProjectedValue(player, preset, marketInflationRate = 1.0, allPlayers = []) {
  if (!player || !player.rating) return player?.basePrice || 1.0;
  
  // Dynamically determine the maximum rating in the pool
  let maxRatingInPool = 100;
  if (allPlayers && allPlayers.length > 0) {
    maxRatingInPool = Math.max(...allPlayers.map(p => Number(p.rating) || 0));
  } else {
    maxRatingInPool = Number(player.rating) > 15 ? 100 : (Number(player.rating) > 10 ? 15 : 10);
  }

  // Normalize rating to a 0-100 percentage relative to the best player in the pool
  const rawRating = Number(player.rating) || 0;
  const ratingPercentile = maxRatingInPool > 0 ? (rawRating / maxRatingInPool) : 0;
  
  // The 'fair value' should scale up exponentially for elite players.
  // Base price + premium based on how close they are to the absolute best player.
  const premiumCurve = Math.pow(ratingPercentile, 3); // Cubed to make top players significantly more expensive

  // Calculate the total purse-based theoretical maximum a top player could go for.
  // Generally, an absolute marquee player goes for 15-20% of a team's total purse.
  const topPlayerExpectedValue = preset.totalPurse * 0.18; 
  
  const expectedValue = player.basePrice + (premiumCurve * topPlayerExpectedValue * marketInflationRate);

  return Number(Math.max(player.basePrice, expectedValue).toFixed(1));
}

/**
 * Calculates Best XI for Cricket respecting role & overseas constraints
 */
export function getBestCricketXI(players) {
  if (!players || players.length === 0) return { xi: [], rating: 0, balanceValid: false };
  
  // Clone and sort by rating descending
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  
  const xi = [];
  let overseasCount = 0;
  const maxOverseas = 4;

  const tryAdd = (player) => {
    if (xi.length >= 11) return false;
    if (xi.some(p => p.id === player.id)) return false;
    if (player.overseas && overseasCount >= maxOverseas) return false;
    
    xi.push(player);
    if (player.overseas) overseasCount++;
    return true;
  };

  // 1. Mandatory Wicketkeeper
  const bestWk = sorted.find(p => p.role === 'WK');
  if (bestWk) tryAdd(bestWk);

  // 2. Mandatory 3 Bowlers
  const bowlers = sorted.filter(p => p.role === 'BOWL');
  for (const b of bowlers) {
    if (xi.filter(p => p.role === 'BOWL').length >= 3) break;
    tryAdd(b);
  }

  // 3. Mandatory 1 All-Rounder
  const allRounders = sorted.filter(p => p.role === 'AR');
  if (allRounders.length > 0) tryAdd(allRounders[0]);

  // 4. Fill remaining top ratings up to 11
  for (const p of sorted) {
    if (xi.length >= 11) break;
    tryAdd(p);
  }

  const totalRating = Number(xi.reduce((sum, p) => sum + (Number(p.rating) || 0), 0).toFixed(1));
  const avgRating = xi.length > 0 ? (totalRating / xi.length).toFixed(1) : 0;

  const hasWk = xi.some(p => p.role === 'WK');
  const bowlerCount = xi.filter(p => p.role === 'BOWL' || p.role === 'AR').length;
  const balanceValid = hasWk && bowlerCount >= 4 && xi.length === 11;

  return {
    xi,
    totalRating,
    avgRating: Number(avgRating),
    overseasCount,
    balanceValid,
    isComplete: xi.length === 11
  };
}

/**
 * Calculates Best XI for Football respecting formation (e.g. 4-3-3: 1 GK, 4 DEF, 3 MID, 3 FWD)
 */
export function getBestFootballXI(players) {
  if (!players || players.length === 0) return { xi: [], rating: 0, balanceValid: false };
  
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const xi = [];

  const tryAdd = (player) => {
    if (xi.length >= 11) return false;
    if (xi.some(p => p.id === player.id)) return false;
    xi.push(player);
    return true;
  };

  // 1 GK
  const gk = sorted.find(p => p.role === 'GK');
  if (gk) tryAdd(gk);

  // 4 DEF
  const defs = sorted.filter(p => p.role === 'DEF');
  defs.slice(0, 4).forEach(d => tryAdd(d));

  // 3 MID
  const mids = sorted.filter(p => p.role === 'MID');
  mids.slice(0, 3).forEach(m => tryAdd(m));

  // 3 FWD
  const fwds = sorted.filter(p => p.role === 'FWD');
  fwds.slice(0, 3).forEach(f => tryAdd(f));

  // Fill up to 11 if position gaps exist
  for (const p of sorted) {
    if (xi.length >= 11) break;
    tryAdd(p);
  }

  const totalRating = xi.reduce((sum, p) => sum + (p.rating || 0), 0);
  const avgRating = xi.length > 0 ? (totalRating / xi.length).toFixed(1) : 0;

  return {
    xi,
    totalRating,
    avgRating: Number(avgRating),
    isComplete: xi.length === 11
  };
}

/**
 * Calculates overall team health & tournament winning index
 */
export function computeTeamSummary(mySquad, totalPurse, preset) {
  const count = mySquad.length;
  const purseSpent = mySquad.reduce((sum, p) => sum + (p.boughtFor || p.basePrice || 0), 0);
  const purseRemaining = Math.max(0, Number((totalPurse - purseSpent).toFixed(2)));
  const totalRating = Number(mySquad.reduce((sum, p) => sum + (Number(p.rating) || 0), 0).toFixed(1));
  const avgRating = count > 0 ? Number((totalRating / count).toFixed(1)) : 0;
  const overseasCount = mySquad.filter(p => p.overseas).length;

  const bestXI = preset.sport === 'cricket' 
    ? getBestCricketXI(mySquad) 
    : getBestFootballXI(mySquad);

  const maxSafeBid = calculateMaxSafeBid(
    purseRemaining,
    count,
    preset.minSquad,
    preset.maxSquad,
    preset.basePriceDefault
  );

  const pointsPerCurrency = purseSpent > 0 ? (totalRating / purseSpent).toFixed(2) : '0.00';

  // Calculate role distribution
  const roleCounts = {};
  preset.roles.forEach(r => roleCounts[r.id] = 0);
  mySquad.forEach(p => {
    if (roleCounts[p.role] !== undefined) {
      roleCounts[p.role]++;
    } else {
      roleCounts[p.role] = 1;
    }
  });

  return {
    count,
    purseSpent: Number(purseSpent.toFixed(2)),
    purseRemaining,
    totalRating,
    avgRating,
    overseasCount,
    roleCounts,
    maxSafeBid,
    pointsPerCurrency,
    bestXI,
    isMinSquadFilled: count >= preset.minSquad,
    isMaxSquadFull: count >= preset.maxSquad,
    overseasLimitHit: overseasCount >= preset.maxOverseas
  };
}
