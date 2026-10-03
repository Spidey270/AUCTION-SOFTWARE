import { detectColumns, cleanString } from '../utils/csvNormalizer';

// ─── AI Provider Config ───────────────────────────────────────────────────────
const AI_CONFIG_KEY = 'warroom_ai_config';

export function getAiConfig() {
  try {
    const stored = localStorage.getItem(AI_CONFIG_KEY);
    return stored
      ? JSON.parse(stored)
      : { provider: 'openai', openaiKey: '', geminiKey: '' };
  } catch {
    return { provider: 'openai', openaiKey: '', geminiKey: '' };
  }
}

export function setAiConfig({ provider, openaiKey = '', geminiKey = '' }) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify({ provider, openaiKey, geminiKey }));
}

/** Returns true if a valid API key has been saved for the active provider */
export function hasAiConfigured() {
  const { provider, openaiKey, geminiKey } = getAiConfig();
  return provider === 'gemini' ? Boolean(geminiKey?.trim()) : Boolean(openaiKey?.trim());
}

// Legacy helpers kept for backward compat
export function getStoredApiKey() {
  const cfg = getAiConfig();
  return cfg.provider === 'gemini' ? cfg.geminiKey : cfg.openaiKey;
}
export function setStoredApiKey(key) {
  const cfg = getAiConfig();
  cfg.openaiKey = key?.trim() || '';
  setAiConfig(cfg);
}

// ─── Unified client factory ───────────────────────────────────────────────────
function getClient() {
  const { provider, openaiKey, geminiKey } = getAiConfig();

  if (provider === 'gemini') {
    const apiKey = geminiKey?.trim();
    if (!apiKey) return null;
    // Lazy-load Gemini SDK to avoid crash if package absent
    return {
      models: {
        async generateContent({ model, contents, config }) {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents,
            config
          });
          return { text: response.text };
        }
      }
    };
  }

  // Default: OpenAI — uses native browser fetch
  const apiKey = openaiKey?.trim();
  if (!apiKey) return null;
  return {
    models: {
      async generateContent({ model, contents, config }) {
        const openaiModel = model && !model.includes('gemini') ? model : 'gpt-4o-mini';
        const body = {
          model: openaiModel,
          messages: [{ role: 'user', content: contents }],
          temperature: 0.2
        };
        if (config?.responseMimeType === 'application/json') {
          body.response_format = { type: 'json_object' };
        }
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return { text: data.choices?.[0]?.message?.content ?? '' };
      }
    }
  };
}

// ─── AI Feature: Analyze CSV/Excel player table ───────────────────────────────
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
1. "name": Identify the EXACT column header containing the athlete/player's full name. NEVER choose "S.No", "ID", "Index", or role columns.
2. "rating": Identify the column containing the player skill rating or overall score. Ratings may be decimal numbers (e.g. 8.5, 9.2) or integers (e.g. 85, 92). Do not confuse with price or rank.
3. "basePrice": Identify the base price/cost column.
4. "role": Identify the position/category column.
5. "country": Identify nationality if present.
6. "overseas": Identify the column indicating if a player is foreign/overseas (e.g. "Foreign", "Indian", "Overseas", "Is Foreign").
7. "tier": Identify tier or pool/group if present.

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
      model: 'gpt-4o-mini',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text);
    const mergedColMap = {
      name: parsed.columnMap?.name || fallback.name,
      role: parsed.columnMap?.role || fallback.role,
      rating: parsed.columnMap?.rating || fallback.rating,
      basePrice: parsed.columnMap?.basePrice || fallback.basePrice,
      country: parsed.columnMap?.country || fallback.country,
      overseas: parsed.columnMap?.overseas || fallback.overseas,
      tier: parsed.columnMap?.tier || fallback.tier
    };
    return { ...parsed, columnMap: mergedColMap };
  } catch (err) {
    console.error('AI CSV mapping error:', err);
    return {
      columnMap: fallback,
      roleMappings: {},
      detectedSport: sport,
      summary: `Fallback auto-detection: Name="${fallback.name}", Rating="${fallback.rating || 'None'}".`
    };
  }
}

// ─── AI Feature: Extract tournament rules from raw text ───────────────────────
export async function aiExtractTournamentRules(rawRuleText, currentPreset) {
  const client = getClient();
  if (!client) {
    return {
      success: false,
      error: 'Please enter your OpenAI API Key in Settings to enable AI Rule Extraction.'
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
- "roleLimits": object where keys are role IDs (e.g., "BAT", "BOWL", "AR", "WK") and values are the integer maximum allowed for that role. (Omit if not specified.)
- "explanation": 2-3 sentence summary of rules extracted

Return ONLY valid JSON.`;

  try {
    const response = await client.models.generateContent({
      model: 'gpt-4o-mini',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return { success: true, rules: JSON.parse(response.text) };
  } catch (err) {
    console.error('AI Rule Extraction failed:', err);
    return { success: false, error: err.message || 'Failed to extract rules with AI.' };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectRatingScale(allPlayers) {
  if (!allPlayers || allPlayers.length === 0) return { maxRating: 100, ratingCap: 100 };
  const maxRating = Math.max(...allPlayers.map(p => Number(p.rating) || 0));
  if (maxRating === 0) return { maxRating: 100, ratingCap: 100 };
  let ratingCap = maxRating;
  if (maxRating <= 10) ratingCap = 10;
  else if (maxRating <= 15) ratingCap = 15;
  else if (maxRating <= 20) ratingCap = 20;
  else if (maxRating <= 50) ratingCap = 50;
  else ratingCap = 100;
  return { maxRating, ratingCap };
}

// ─── AI Feature: Live Tactical War Room Copilot ───────────────────────────────
export async function aiGetTacticalAdvice({
  activePlayer,
  currentBid,
  teamSummary,
  rivals,
  preset,
  allPlayers = [],
  queryType = 'should_i_bid',
  customQuestion = ''
}) {
  const client = getClient();
  const { maxRating, ratingCap } = detectRatingScale(allPlayers);

  if (!client) {
    return generateOfflineTacticalAdvice(activePlayer, currentBid, teamSummary, rivals, preset, queryType, ratingCap);
  }

  const rivalsBrief = rivals.map(r => ({
    name: r.name,
    purseRemaining: Number((preset.totalPurse - (r.purseSpent || 0)).toFixed(1)),
    squadCount: r.playersCount || 0,
    acquired: r.acquired?.length || 0
  }));

  const purseRemaining = teamSummary.purseRemaining;
  const squadCount = teamSummary.count;
  const slotsLeft = preset.maxSquad - squadCount;
  const mandatorySlotsLeft = Math.max(0, preset.minSquad - squadCount);
  const reserveNeeded = mandatorySlotsLeft * preset.basePriceDefault;
  const spendableNow = Math.max(0, purseRemaining - reserveNeeded);

  const rawRating = activePlayer ? (Number(activePlayer.rating) || 0) : 0;
  const ratingPct = ratingCap > 0 ? rawRating / ratingCap : 0;
  const marketCeiling = Number(
    Math.min(spendableNow, preset.totalPurse * ratingPct * 0.3 + (activePlayer?.basePrice || 0) * 3).toFixed(1)
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

RATING SCALE CONTEXT (CRITICAL):
- This player pool uses a CUSTOM rating scale: 0 to ${ratingCap}
- Highest-rated player in the entire pool: ${maxRating} / ${ratingCap}
- Current player's rating: ${rawRating} / ${ratingCap} (= ${(ratingPct * 100).toFixed(1)}% of max possible)
- Do NOT assume ratings are out of 10 or 100 — use the 0-${ratingCap} scale above.

TOURNAMENT CONTEXT:
- Total purse per team: ${preset.currency}${preset.totalPurse} ${preset.unit}
- This is a competitive auction — the winner is decided by CUMULATIVE SQUAD RATING.
- Leaving purse unspent at the end = losing strategy.

ACTIVE PLAYER ON THE BLOCK:
${JSON.stringify({ ...activePlayer, ratingOutOf: ratingCap })}

CURRENT HAMMER BID: ${preset.currency}${currentBid} ${preset.unit}
PLAYER'S BASE PRICE: ${preset.currency}${activePlayer?.basePrice} ${preset.unit}
ESTIMATED MARKET CEILING: ${preset.currency}${marketCeiling} ${preset.unit}

MY TEAM STATUS:
${JSON.stringify(myTeamBrief)}

RIVAL TEAMS:
${JSON.stringify(rivalsBrief)}

QUERY: "${queryType}"
CUSTOM QUESTION: "${customQuestion}"

IMPORTANT STRATEGY PRINCIPLES:
1. maxWalkAwayPrice must reflect the player's true value on the 0-${ratingCap} scale. Rating ${rawRating}/${ratingCap} means this player is ${(ratingPct * 100).toFixed(0)}% as good as the best player in the pool.
2. Top-quality players (top 20% of the scale) can justify 15-30% of total purse.
3. Be AGGRESSIVE when purse is available and squad slots are open.
4. If rivals are low on funds, push bids without fear.
5. "PASS" only if price exceeds real value OR we genuinely cannot afford it.

Respond in JSON:
{
  "recommendation": "BID_AGGRESSIVELY" | "BID_CAUTIOUSLY" | "LET_RIVALS_OVERPAY" | "FORCE_PRICE_PUSH" | "PASS",
  "maxWalkAwayPrice": number (real ceiling in ${preset.unit}),
  "tacticalReasoning": "2-3 bullet points with player value on the 0-${ratingCap} scale, squad fit, rival budget intel",
  "trapOpportunity": "Specific rival to drain budget, or null",
  "fallbackPlan": "Role or player type to target if we pass"
}

Return ONLY raw JSON.`;

  try {
    const response = await client.models.generateContent({
      model: 'gpt-4o-mini',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text);
  } catch (err) {
    console.error('AI tactical advice error:', err);
    return generateOfflineTacticalAdvice(activePlayer, currentBid, teamSummary, rivals, preset, queryType, ratingCap);
  }
}

// ─── Offline Fallback ─────────────────────────────────────────────────────────
function generateOfflineTacticalAdvice(activePlayer, currentBid, teamSummary, rivals, preset, queryType, ratingCap = 100) {
  if (!activePlayer) {
    return {
      recommendation: 'PASS',
      maxWalkAwayPrice: 0,
      tacticalReasoning: 'No active player selected.',
      trapOpportunity: null,
      fallbackPlan: 'Select a player from the marketplace.'
    };
  }

  const rawRating = Number(activePlayer.rating) || 0;
  const ratingPct = ratingCap > 0 ? rawRating / ratingCap : 0;
  const fairValue = Number(
    Math.max(activePlayer.basePrice, (preset.totalPurse * ratingPct * 0.25) + activePlayer.basePrice).toFixed(1)
  );

  const slotsLeft = preset.maxSquad - teamSummary.count;
  const mandatoryLeft = Math.max(0, preset.minSquad - teamSummary.count);
  const reserveNeeded = mandatoryLeft * preset.basePriceDefault;
  const spendableNow = Math.max(0, teamSummary.purseRemaining - reserveNeeded);
  const maxWalkAway = Number(Math.min(spendableNow, fairValue * 1.2).toFixed(1));

  const isAffordable = currentBid <= teamSummary.maxSafeBid && currentBid <= spendableNow;
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
    tacticalReasoning: `• Player rating ${rawRating}/${ratingCap} (${(ratingPct * 100).toFixed(0)}% of pool ceiling) — fair ceiling ${preset.currency}${fairValue} ${preset.unit}.\n• Current bid ${preset.currency}${currentBid} is ${isGoodValue ? 'BELOW fair value — bid aggressively' : isOverpriced ? 'ABOVE fair value — consider passing' : 'near fair value — hold ceiling at ' + preset.currency + maxWalkAway}.\n• ${slotsLeft} squad slots remain; ${mandatoryLeft > 0 ? `${mandatoryLeft} mandatory slots still needed` : 'mandatory slots filled'}.`,
    trapOpportunity: richestRival && currentBid < fairValue * 0.8
      ? `${richestRival.name} has healthy budget — push bid to drain their purse before the premium tier.`
      : null,
    fallbackPlan: `If price exceeds ${preset.currency}${maxWalkAway}, save purse for remaining ${activePlayer.role} targets later in the auction.`
  };
}
