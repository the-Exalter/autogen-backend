const fs = require('fs');
const path = require('path');

let KB = [];
try {
  const raw = fs.readFileSync(
    path.join(__dirname, '../data/vehicleKnowledgeBase.json'),
    'utf8'
  );
  KB = JSON.parse(raw);
  console.log(`[KB] Vehicle knowledge base loaded: ${KB.length} entries`);
} catch (e) {
  console.warn('[KB] vehicleKnowledgeBase.json not found — suggestions will use DB only');
  KB = [];
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function searchKB(query, limit = 6) {
  if (!query || KB.length === 0) return [];
  const q = query.toLowerCase().trim();
  const scored = [];

  for (const entry of KB) {
    const makeModel = `${entry.make} ${entry.model}`.toLowerCase();
    const full = `${entry.make} ${entry.model} ${entry.variant}`.toLowerCase();

    if (full.startsWith(q) || makeModel.startsWith(q)) {
      scored.push({ entry, score: 0 });
      continue;
    }
    if (full.includes(q) || makeModel.includes(q)) {
      scored.push({ entry, score: 1 });
      continue;
    }
    const qWords = q.split(' ').filter(w => w.length >= 3);
    const entryWords = full.split(' ');
    const wordMatch = qWords.some(qw =>
      entryWords.some(ew => ew.startsWith(qw) || levenshtein(qw, ew) <= 2)
    );
    if (wordMatch) scored.push({ entry, score: 2 });
  }

  scored.sort((a, b) =>
    a.score - b.score ||
    a.entry.make.localeCompare(b.entry.make) ||
    a.entry.model.localeCompare(b.entry.model)
  );

  return scored.slice(0, limit).map(s => s.entry);
}

function correctMake(query) {
  if (!query || KB.length === 0) return null;

  const words = query.trim().split(/\s+/);
  const firstWord = words[0].toLowerCase();

  if (firstWord.length < 6) return null;

  const makes = [...new Set(KB.map(e => e.make))];

  const exactMatch = makes.find(m => m.toLowerCase() === firstWord);
  if (exactMatch) return null;

  const prefixMatch = makes.find(m =>
    m.toLowerCase().startsWith(firstWord) && firstWord.length >= 5
  );
  if (prefixMatch) return null;

  let best = null;
  let bestDist = Infinity;

  for (const make of makes) {
    const lenDiff = Math.abs(firstWord.length - make.toLowerCase().length);
    if (lenDiff > 4) continue;

    const dist = levenshtein(firstWord, make.toLowerCase());
    if (dist < bestDist && dist <= 2) {
      bestDist = dist;
      best = make;
    }
  }

  if (!best) return null;

  const rest = words.slice(1).join(' ');
  return {
    corrected: true,
    make: best,
    correctedQuery: rest ? `${best} ${rest}` : best,
  };
}

module.exports = { searchKB, correctMake };
