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

/**
 * AI Service: Intelligently parse raw CSV/Excel headers and samples to map to standard schema
 */
export async function aiAnalyzePlayerTable(headers, sampleRows, sport = 'cricket') {
  const client = getClient();
  if (!client) {
    // Graceful offline heuristic fallback if no API key is configured
    return fallbackHeaderMapping(headers, sampleRows, sport);
  }

  const prompt = `You are a sports auction data engineer. We have an uploaded player list spreadsheet with unknown column headers.
Sport: ${sport}
Available standard roles for ${sport}:
${sport === 'cricket' ? '- BAT (Batter), BOWL (Bowler), AR (All-Rounder), WK (Wicketkeeper)' : '- GK (Goalkeeper), DEF (Defender), MID (Midfielder), FWD (Forward/Winger)'}

Table Headers:
${JSON.stringify(headers)}

First 5 Sample Rows:
${JSON.stringify(sampleRows.slice(0, 5))}

Analyze the columns and return a JSON object with:
1. "columnMap": an object mapping standard field names ("name", "role", "rating", "basePrice", "country", "overseas", "tier") to the exact header string from the table (or null if not found).
2. "roleMappings": an object mapping observed role strings in the sheet to the standard role IDs.
3. "detectedSport": "cricket" or "football".
4. "summary": brief string describing what columns were detected.

Return ONLY raw JSON, no markdown formatting.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (err) {
    console.error('Gemini AI mapping error:', err);
    return fallbackHeaderMapping(headers, sampleRows, sport);
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

