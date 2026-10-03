/**
 * Robust CSV & Excel Player Sheet Normalizer
 * Handles:
 * - UTF-8 BOM (\ufeff)
 * - Trailing/leading whitespace in headers and values
 * - Decimal ratings (e.g., 8.5, 9.2) as well as integer ratings (e.g., 85, 92)
 * - Intelligent heuristic player name detection (distinguishes names from IDs/S.No/Roles)
 */

export function cleanString(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/^\uFEFF/, '').trim();
}

/**
 * Normalizes all keys of an object by stripping BOM and trimming
 */
export function cleanRowKeys(row) {
  if (!row || typeof row !== 'object') return {};
  const cleaned = {};
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = cleanString(key);
    cleaned[cleanKey] = val;
  }
  return cleaned;
}

/**
 * Finds the best matching column name for a given intent
 */
export function detectColumns(headers, sampleRows, sport = 'cricket') {
  const cleanHeaders = headers.map(cleanString).filter(Boolean);
  
  // Helper to find header matching regex
  const findHeader = (pattern, excludePattern = null) => {
    return cleanHeaders.find(h => {
      if (excludePattern && excludePattern.test(h)) return false;
      return pattern.test(h);
    });
  };

  // 1. Detect Name Column
  let nameCol = findHeader(/^(player\s*name|name|full\s*name|player|cricketer|footballer|athlete)$/i);
  if (!nameCol) {
    nameCol = findHeader(/name|player/i, /team|club|country|nation|file|id|sr|no|idx|rank/i);
  }

  // If still not found by regex, inspect values across sample rows!
  if (!nameCol && sampleRows && sampleRows.length > 0) {
    for (const h of cleanHeaders) {
      // Ignore obvious ID/Number/Status columns
      if (/^(id|sr|no|s\.no|index|#|rank|status|role|pos|price|rating|ovr)$/i.test(h)) continue;

      let validNameCount = 0;
      for (const row of sampleRows) {
        const val = cleanString(row[h]);
        // A name usually has letters, length >= 3, and is not purely a number or role code
        if (val && /[a-zA-Z]{3,}/.test(val) && !/^(bat|bowl|ar|wk|gk|def|mid|fwd|true|false)$/i.test(val)) {
          validNameCount++;
        }
      }
      if (validNameCount >= Math.min(2, sampleRows.length)) {
        nameCol = h;
        break;
      }
    }
  }

  // 2. Detect Rating Column
  let ratingCol = findHeader(/^(rating|ovr|overall|score|points|pts|star|stars)$/i);
  if (!ratingCol) {
    ratingCol = findHeader(/rating|ovr|pts|points|score/i);
  }
  if (!ratingCol && sampleRows && sampleRows.length > 0) {
    for (const h of cleanHeaders) {
      if (h === nameCol) continue;
      let numericCount = 0;
      for (const row of sampleRows) {
        const val = cleanString(row[h]);
        if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100) {
          numericCount++;
        }
      }
      if (numericCount >= Math.min(3, sampleRows.length) && /rate|score|skill|level/i.test(h)) {
        ratingCol = h;
        break;
      }
    }
  }

  // 3. Detect Base Price Column
  let priceCol = findHeader(/^(base\s*price|base|price|cost|reserve|starting\s*bid|starting\s*price|val|value)$/i);
  if (!priceCol) {
    priceCol = findHeader(/base|price|cost|reserve|bid/i, /rating|rank|points/i);
  }

  // 4. Detect Role / Position Column
  let roleCol = findHeader(/^(role|position|pos|category|cat|specialism|type)$/i);
  if (!roleCol) {
    roleCol = findHeader(/role|pos|category|specialism/i);
  }

  // 5. Detect Country / Overseas Column
  let countryCol = findHeader(/^(country|nation|nationality|nat)$/i);
  let overseasCol = findHeader(/^(overseas|foreign|is_overseas|os)$/i);

  // 6. Detect Tier Column
  let tierCol = findHeader(/^(tier|set|pool|group|grade)$/i);

  return {
    name: nameCol || cleanHeaders[0] || 'Name',
    role: roleCol || null,
    rating: ratingCol || null,
    basePrice: priceCol || null,
    country: countryCol || null,
    overseas: overseasCol || null,
    tier: tierCol || null
  };
}

/**
 * Parses and cleans float values preserving decimal places (e.g. 8.5 -> 8.5)
 */
export function parseDecimalValue(rawVal, fallback = 0) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return fallback;
  const str = cleanString(rawVal).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : Number(parsed.toFixed(2));
}

/**
 * Standardizes a role string to canonical ID (BAT, BOWL, AR, WK or GK, DEF, MID, FWD)
 */
export function standardizeRole(rawRole, sport = 'cricket', customMap = {}) {
  const clean = cleanString(rawRole).toUpperCase();
  if (customMap && customMap[clean]) return customMap[clean];

  if (sport === 'cricket') {
    if (/keeper|wk|wicket\s*keeper|c&b|w\.k/i.test(clean)) return 'WK';
    if (/all\s*rounder|all-rounder|allrounder|ar|a\.r/i.test(clean)) return 'AR';
    if (/bowl|bowler|pacer|spinner|fast\s*bowler|spin/i.test(clean)) return 'BOWL';
    return 'BAT'; // Default batsman
  } else {
    if (/goal|gk|goalkeeper|g\.k/i.test(clean)) return 'GK';
    if (/def|cb|lb|rb|defender|centre\s*back|full\s*back/i.test(clean)) return 'DEF';
    if (/mid|cm|cam|cdm|midfield|winger/i.test(clean)) return 'MID';
    return 'FWD'; // Default forward
  }
}

/**
 * Transforms raw sheet rows into clean player objects with decimal ratings preserved
 */
export function processRawPlayerRows(rows, detectedMap, sport = 'cricket', defaultBasePrice = 0.5) {
  if (!rows || rows.length === 0) return [];

  const colMap = detectedMap || {};

  return rows.map((rawRow, idx) => {
    const row = cleanRowKeys(rawRow);

    // 1. Name extraction
    let name = cleanString(row[colMap.name]);
    if (!name || name === 'undefined') {
      // Fallback: search for first non-numeric text column
      for (const val of Object.values(row)) {
        const cVal = cleanString(val);
        if (cVal && /[a-zA-Z]{3,}/.test(cVal) && isNaN(Number(cVal))) {
          name = cVal;
          break;
        }
      }
    }
    if (!name) name = `Player ${idx + 1}`;

    // 2. Rating extraction - PRESERVE DECIMALS (e.g. 8.5 or 85)
    let rating = 85;
    if (colMap.rating && row[colMap.rating] !== undefined) {
      const parsedRating = parseDecimalValue(row[colMap.rating], 85);
      // If rating was provided on a 1-10 scale (e.g. 8.5), we keep it as 8.5 or allow decimal ratings
      rating = parsedRating;
    }

    // 3. Base Price extraction - PRESERVE DECIMALS (e.g. 1.50)
    let basePrice = defaultBasePrice;
    if (colMap.basePrice && row[colMap.basePrice] !== undefined) {
      basePrice = parseDecimalValue(row[colMap.basePrice], defaultBasePrice);
    }

    // 4. Role standardization
    const roleRaw = colMap.role ? row[colMap.role] : 'BAT';
    const role = standardizeRole(roleRaw, sport);

    // 5. Country & Overseas flag
    const country = colMap.country ? cleanString(row[colMap.country]) : 'Domestic';
    let overseas = false;
    if (colMap.overseas && row[colMap.overseas] !== undefined) {
      const osVal = cleanString(row[colMap.overseas]);
      overseas = /yes|true|y|1|os|overseas|foreign/i.test(osVal);
    } else if (country && country !== 'Domestic') {
      overseas = sport === 'cricket' ? !/india/i.test(country) : false;
    }

    // 6. Tier
    const tier = colMap.tier && row[colMap.tier] ? cleanString(row[colMap.tier]) : 'Uploaded';

    return {
      id: `pl-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      role,
      rating,
      basePrice: basePrice > 0 ? basePrice : defaultBasePrice,
      country: country || (overseas ? 'Overseas' : 'Domestic'),
      overseas,
      tier,
      status: null
    };
  }).filter(p => p.name && p.name.length > 1 && !/^(total|s\.no|id|#)$/i.test(p.name));
}
