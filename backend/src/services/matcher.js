function normalize(text) {
  return text.toLowerCase().trim();
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

function isFuzzyMatch(text, keyword, tolerance = 1) {
  const distance = levenshtein(normalize(text), normalize(keyword));
  return distance <= tolerance;
}

function findMatch(text, keywordSets) {
  const normalized = normalize(text);
  const combined = [...(keywordSets.local || []), ...(keywordSets.global || [])];

  for (const keywordConfig of combined) {
    const variants = keywordConfig.variants && keywordConfig.variants.length
      ? keywordConfig.variants
      : [keywordConfig.keyword];

    const match = variants.some((variant) => normalized.includes(normalize(variant)) || isFuzzyMatch(normalized, variant));

    if (match) {
      return keywordConfig;
    }
  }
  return null;
}

module.exports = { findMatch };
