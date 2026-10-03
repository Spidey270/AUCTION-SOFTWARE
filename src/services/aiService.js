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
    squadCount: r.playersCount || 0
  }));

  const myTeamBrief = {
    purseRemaining: teamSummary.purseRemaining,
    maxSafeBid: teamSummary.maxSafeBid,
    squadCount: teamSummary.count,
    minSquadNeeded: preset.minSquad,
    totalRating: teamSummary.totalRating,
    overseasCount: teamSummary.overseasCount,
    maxOverseas: preset.maxOverseas,
    currentRosterRoles: teamSummary.bestXI?.xi?.map(p => `${p.role}: ${p.name}`) || []
  };

  const prompt = `You are an elite, cutthroat sports auction strategist (mock ${preset.sport} auction).
Your job is to give immediate, high-leverage tactical advice to help win this college tournament auction.

ACTIVE PLAYER ON BLOCK:
${JSON.stringify(activePlayer)}

CURRENT HAMMER BID: ${preset.currency}${currentBid} ${preset.unit}
MY SQUAD STATUS:
${JSON.stringify(myTeamBrief)}

RIVAL TEAMS:
${JSON.stringify(rivalsBrief)}

QUERY INTENT: "${queryType}"
ADDITIONAL QUESTION: "${customQuestion}"

Provide a tactical response in JSON:
{
  "recommendation": "BID_AGGRESSIVELY" | "BID_CAUTIOUSLY" | "LET_RIVALS_OVERPAY" | "FORCE_PRICE_PUSH" | "PASS",
  "maxWalkAwayPrice": number (exact price to stop bidding),
  "tacticalReasoning": "2-3 punchy, high-impact bullet points explaining the decision, rival budget exploitation, or squad fit",
  "trapOpportunity": "Details on whether a rival team can be trapped into overpaying, or null",
  "fallbackPlan": "Alternative player role or backup target if we let this one go"
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
 * Fallback mapping if offline or no API key
 */
function fallbackHeaderMapping(headers, sampleRows, sport) {
  const findMatch = (pattern) => headers.find(h => pattern.test(String(h).trim()));

  return {
    columnMap: {
      name: findMatch(/name|player|fullname|cricketer|footballer/i) || headers[0],
      role: findMatch(/role|pos|position|category|type|specialism/i) || headers[1],
      rating: findMatch(/rating|ovr|overall|points|score|pts/i) || null,
      basePrice: findMatch(/base|price|cost|reserve|starting/i) || null,
      country: findMatch(/country|nation|nationality|nat/i) || null,
      overseas: findMatch(/overseas|foreign|os/i) || null,
      tier: findMatch(/tier|pool|group|set/i) || null
    },
    roleMappings: {},
    detectedSport: sport,
    summary: 'Heuristic pattern matching applied. You can adjust column mapping manually.'
  };
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
  const isAffordable = currentBid <= maxSafe;
  const ratingDelta = Math.max(0, activePlayer.rating - 75);
  const fairValue = activePlayer.basePrice + (ratingDelta * (preset.sport === 'cricket' ? 0.35 : 1.2));

  let recommendation = 'BID_CAUTIOUSLY';
  if (!isAffordable) {
    recommendation = 'PASS';
  } else if (currentBid <= fairValue * 0.85) {
    recommendation = 'BID_AGGRESSIVELY';
  } else if (currentBid > fairValue * 1.3) {
    recommendation = 'LET_RIVALS_OVERPAY';
  }

  const maxWalkAway = Math.min(maxSafe, Number((fairValue * 1.15).toFixed(1)));

  return {
    recommendation,
    maxWalkAwayPrice: maxWalkAway,
    tacticalReasoning: `Player OVR is ${activePlayer.rating}. Calculated fair ceiling is ${preset.currency}${fairValue.toFixed(1)} ${preset.unit}. Safe reserve ceiling allows up to ${preset.currency}${maxSafe.toFixed(1)}.`,
    trapOpportunity: currentBid > fairValue ? 'Rival is paying above value. Consider exiting to lock up their budget.' : null,
    fallbackPlan: `If price exceeds ${preset.currency}${maxWalkAway}, hold purse for remaining un-auctioned ${activePlayer.role} targets.`
  };
}

