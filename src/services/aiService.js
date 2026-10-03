import { GoogleGenAI } from '@google/genai';

const API_KEY_STORAGE = 'warroom_gemini_api_key';

export function getStoredApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function setStoredApiKey(key) {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
}

/**
 * Creates a Gemini client with stored or passed key
 */
function getClient(customKey) {
  const apiKey = customKey || getStoredApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

import { detectColumns, cleanString } from '../utils/csvNormalizer';

/**
 * AI Service: Intelligently parse raw CSV/Excel headers and samples to map to standard schema
 */
export async function aiAnalyzePlayerTable(headers, sampleRows, sport = 'cricket') {
  const cleanedHeaders = headers.map(cleanString).filter(Boolean);
  const fallback = detectColumns(cleanedHeaders, sampleRows, sport);

  const client = getClient();
  if (!client) {
    return {
      columnMap: fallback,
      roleMappings: {},
      detectedSport: sport,
      summary: `Auto-detected columns: Name="${fallback.name}", Rating="${fallback.rating || 'None'}", Base Price="${fallback.basePrice || 'None'}", Role="${fallback.role || 'None'}".`
    };
  }

  const prompt = `You are an expert sports auction data engineer analyzing an uploaded player spreadsheet.
Target Sport: ${sport}
Standard Roles:
${sport === 'cricket' ? '- BAT (Batter), BOWL (Bowler), AR (All-Rounder), WK (Wicketkeeper)' : '- GK (Goalkeeper), DEF (Defender), MID (Midfielder), FWD (Forward/Winger)'}

Table Column Headers:
${JSON.stringify(cleanedHeaders)}

Sample Data (First 5 Rows):
${JSON.stringify(sampleRows.slice(0, 5))}

CRITICAL INSTRUCTIONS:
1. "name": Identify the EXACT column header containing the athlete/player's full name (e.g., "Virat Kohli", "Kylian Mbappe"). NEVER choose "S.No", "ID", "Index", or role columns.
2. "rating": Identify the column containing the player skill rating or overall score. Ratings may be decimal numbers (e.g. 8.5, 9.2, 7.8) or 0-100 integers (e.g. 85, 92). Do not confuse with price or rank.
3. "basePrice": Identify the base price/cost column.
4. "role": Identify the position/category column.
5. "country" and "overseas": Identify nationality and overseas/foreign columns if present.
6. "tier": Identify tier or pool/group if present.

Return a JSON object:
{
  "columnMap": {
    "name": "<exact header or null>",
    "role": "<exact header or null>",
    "rating": "<exact header or null>",
    "basePrice": "<exact header or null>",
    "country": "<exact header or null>",
    "overseas": "<exact header or null>",
    "tier": "<exact header or null>"
  },
  "roleMappings": {
    "<observed_string>": "BAT" | "BOWL" | "AR" | "WK" | "GK" | "DEF" | "MID" | "FWD"
  },
  "summary": "Brief explanation of mapped columns"
}

Return ONLY valid JSON.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text);
    // Merge with fallback so no essential field is left empty if Gemini missed it
    const mergedColMap = {
      name: parsed.columnMap?.name || fallback.name,
      role: parsed.columnMap?.role || fallback.role,
      rating: parsed.columnMap?.rating || fallback.rating,
      basePrice: parsed.columnMap?.basePrice || fallback.basePrice,
      country: parsed.columnMap?.country || fallback.country,
      overseas: parsed.columnMap?.overseas || fallback.overseas,
      tier: parsed.columnMap?.tier || fallback.tier
    };

    return {
      ...parsed,
      columnMap: mergedColMap
    };
  } catch (err) {
    console.error('Gemini AI mapping error:', err);
    return {
      columnMap: fallback,
      roleMappings: {},
      detectedSport: sport,
      summary: `Fallback auto-detection: Name="${fallback.name}", Rating="${fallback.rating || 'None'}".`
    };
  }
}

/**
 * AI Service: Parse tournament rule text (e.g. from brochure, PDF, or WhatsApp message)
 */
export async function aiExtractTournamentRules(rawRuleText, currentPreset) {
  const client = getClient();
  if (!client) {
    return {
      success: false,
      error: 'Please enter your Gemini API Key in Settings to enable AI Rule Extraction.'
    };
  }

  const prompt = `You are a tournament auction director. Extract the competition rules and constraints from the following text:

"${rawRuleText}"

Current default preset for reference:
${JSON.stringify(currentPreset)}

Return a JSON object containing:
- "sport": "cricket" or "football" or "custom"
- "name": tournament title
- "totalPurse": number (budget per team)
- "currency": string (e.g. "₹", "$", "€")
- "unit": string (e.g. "Cr", "M", "Lakhs", "pts")
- "minSquad": integer (minimum mandatory players required to buy)
- "maxSquad": integer (maximum squad ceiling)
- "maxOverseas": integer (maximum foreign/overseas players allowed)
- "basePriceDefault": number (standard minimum base price)
- "explanation": 2-3 sentence summary of rules extracted

Return ONLY valid JSON.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return {
      success: true,
      rules: JSON.parse(response.text)
    };
  } catch (err) {
    console.error('Gemini AI Rule Extraction failed:', err);
    return {
      success: false,
      error: err.message || 'Failed to extract rules with AI.'
    };
  }
}

/**
 * AI Service: Live Tactical War Room Copilot
 */
export async function aiGetTacticalAdvice({
  activePlayer,
  currentBid,
  teamSummary,
  rivals,
  preset,
  queryType = 'should_i_bid',
  customQuestion = ''
}) {
  const client = getClient();
  if (!client) {
    return generateOfflineTacticalAdvice(activePlayer, currentBid, teamSummary, rivals, preset, queryType);
  }

  const rivalsBrief = rivals.map(r => ({
    name: r.name,
    purseRemaining: Number((preset.totalPurse - (r.purseSpent || 0)).toFixed(1)),
    squadCount: r.playersCount || 0,
    acquired: r.acquired?.length || 0
  }));

  // Compute rich context for the AI
  const purseRemaining = teamSummary.purseRemaining;
  const squadCount = teamSummary.count;
  const slotsLeft = preset.maxSquad - squadCount;
  const mandatorySlotsLeft = Math.max(0, preset.minSquad - squadCount);
  const reserveNeeded = mandatorySlotsLeft * preset.basePriceDefault;
  const spendableNow = Math.max(0, purseRemaining - reserveNeeded);

  // Fair market ceiling: scale-aware (ratings can be 0-10 or 0-100)
  const normRating = activePlayer
    ? (activePlayer.rating <= 10 ? activePlayer.rating * 10 : activePlayer.rating)
    : 75;
  // Typical purse fraction for a top player
  const ratingFraction = Math.max(0, (normRating - 60) / 40); // 0-1 for 60-100 rated players
  const marketCeiling = Number(
    Math.min(spendableNow, preset.totalPurse * ratingFraction * 0.3 + (activePlayer?.basePrice || 0) * 3).toFixed(1)
  );

  const myTeamBrief = {
    purseRemaining,
    spendableNow,
    marketCeiling,
    maxSafeBid: teamSummary.maxSafeBid,
    squadCount,
    slotsLeft,
    mandatorySlotsStillNeeded: mandatorySlotsLeft,
    minSquad: preset.minSquad,
    maxSquad: preset.maxSquad,
    totalRating: teamSummary.totalRating,
    avgRating: teamSummary.avgRating,
    overseasCount: teamSummary.overseasCount,
    maxOverseas: preset.maxOverseas,
    pointsPerCurrency: teamSummary.pointsPerCurrency,
    currentBestXIRoles: teamSummary.bestXI?.xi?.map(p => `${p.role}: ${p.name}`) || []
  };

  const prompt = `You are an elite, aggressive sports auction strategist in a MOCK ${preset.sport?.toUpperCase()} COLLEGE TOURNAMENT AUCTION. Your SOLE objective is to help the user WIN by building the HIGHEST-RATED squad within budget.

TOURNAMENT CONTEXT:
- Total purse per team: ${preset.currency}${preset.totalPurse} ${preset.unit}
- This is a competitive auction — players going unsold or for low prices means wasted opportunity.
- The winner is decided by CUMULATIVE SQUAD RATING.

ACTIVE PLAYER ON THE BLOCK:
${JSON.stringify(activePlayer)}

CURRENT HAMMER BID: ${preset.currency}${currentBid} ${preset.unit}
PLAYER'S BASE PRICE: ${preset.currency}${activePlayer?.basePrice} ${preset.unit}

MY TEAM STATUS:
${JSON.stringify(myTeamBrief)}

RIVAL TEAMS:
${JSON.stringify(rivalsBrief)}

QUERY: "${queryType}"
CUSTOM QUESTION: "${customQuestion}"

IMPORTANT STRATEGY PRINCIPLES:
1. The maxWalkAwayPrice should be the REAL ceiling considering this player's value to the team, NOT just the base price. Good players can justify spending 15-40% of the total purse.
2. If my squad has slotsLeft and purse to spend, be AGGRESSIVE — leaving purse unspent at the end of the auction is losing.
3. Consider rival purse depletion — if rivals are low on funds, we can push bids guilt-free.
4. If this player fills a squad gap (missing role) they are worth MORE than a player who duplicates existing roles.
5. "PASS" only if the price is genuinely beyond fair value OR we literally cannot afford it.

Respond in JSON:
{
  "recommendation": "BID_AGGRESSIVELY" | "BID_CAUTIOUSLY" | "LET_RIVALS_OVERPAY" | "FORCE_PRICE_PUSH" | "PASS",
  "maxWalkAwayPrice": number (real ceiling price in ${preset.unit} — must be meaningful, not just base price),
  "tacticalReasoning": "2-3 high-impact bullet points: player value, squad fit, rival budget situation",
  "trapOpportunity": "Specific rival to trap or null",
  "fallbackPlan": "What role to target next if we pass on this player"
}

Return ONLY raw JSON.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text);
  } catch (err) {
    console.error('Gemini tactical advice error:', err);
    return generateOfflineTacticalAdvice(activePlayer, currentBid, teamSummary, rivals, preset, queryType);
  }
}

/**
 * Fallback tactical advice if offline
 */
function generateOfflineTacticalAdvice(activePlayer, currentBid, teamSummary, rivals, preset, queryType) {
  if (!activePlayer) {
    return {
      recommendation: 'PASS',
      maxWalkAwayPrice: 0,
      tacticalReasoning: 'No active player selected.',
      trapOpportunity: null,
      fallbackPlan: 'Select a player from the marketplace.'
    };
  }

  const maxSafe = teamSummary.maxSafeBid;
  
  // Normalize rating to 0-100 scale (handles both 8.5 and 85 formats)
  const normRating = activePlayer.rating <= 10 ? activePlayer.rating * 10 : activePlayer.rating;
  
  // Fair value as % of total purse based on player quality
  // - Rating 90+ → top tier → can justify up to 25% of total purse
  // - Rating 75–89 → solid → 10-18% of purse
  // - Rating <75 → depth → base price to 8%
  const ratingFraction = Math.max(0, (normRating - 60) / 40); // 0-1 range for 60-100
  const fairValue = Number(
    Math.max(
      activePlayer.basePrice,
      (preset.totalPurse * ratingFraction * 0.25) + activePlayer.basePrice
    ).toFixed(1)
  );

  // Slots and reserve context
  const slotsLeft = preset.maxSquad - teamSummary.count;
  const mandatoryLeft = Math.max(0, preset.minSquad - teamSummary.count);
  const reserveNeeded = mandatoryLeft * preset.basePriceDefault;
  const spendableNow = Math.max(0, teamSummary.purseRemaining - reserveNeeded);

  const maxWalkAway = Number(Math.min(spendableNow, fairValue * 1.2).toFixed(1));
  const isAffordable = currentBid <= maxSafe && currentBid <= spendableNow;
  const isGoodValue = currentBid <= fairValue * 0.9;
  const isOverpriced = currentBid > fairValue * 1.25;

  let recommendation = 'BID_CAUTIOUSLY';
  if (!isAffordable || isOverpriced) {
    recommendation = slotsLeft > 5 ? 'LET_RIVALS_OVERPAY' : 'PASS';
  } else if (isGoodValue) {
    recommendation = 'BID_AGGRESSIVELY';
  } else if (currentBid > fairValue * 1.1) {
    recommendation = 'LET_RIVALS_OVERPAY';
  }

  const richestRival = rivals.reduce((best, r) => {
    const rem = preset.totalPurse - (r.purseSpent || 0);
    return rem > (preset.totalPurse - (best?.purseSpent || 0)) ? r : best;
  }, rivals[0]);

  return {
    recommendation,
    maxWalkAwayPrice: maxWalkAway,
    tacticalReasoning: `• Player OVR ${normRating.toFixed(0)}/100 — estimated fair ceiling ${preset.currency}${fairValue} ${preset.unit} (${(ratingFraction * 25).toFixed(0)}% of purse).\n• Current bid ${preset.currency}${currentBid} is ${isGoodValue ? 'BELOW fair value — bid aggressively' : isOverpriced ? 'ABOVE fair value — caution' : 'near fair value — hold ceiling at ' + preset.currency + maxWalkAway}.\n• ${slotsLeft} squad slots remain; ${mandatoryLeft > 0 ? `${mandatoryLeft} mandatory slots still needed` : 'mandatory slots filled'}.`,
    trapOpportunity: richestRival && currentBid < fairValue * 0.8
      ? `${richestRival.name} has healthy budget — push bid to drain their purse before the premium tier.`
      : null,
    fallbackPlan: `If price exceeds ${preset.currency}${maxWalkAway}, hold purse for remaining ${activePlayer.role} targets later in the auction.`
  };
}

