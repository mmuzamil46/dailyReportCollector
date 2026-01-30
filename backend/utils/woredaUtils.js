/**
 * Normalizes woreda strings by removing "Woreda", "woreda", "ወረዳ" prefixes,
 * trimming whitespace, and stripping leading zeros.
 * 
 * Examples:
 * "Woreda 01" -> "1"
 * "Woreda 1" -> "1"
 * "ወረዳ 1" -> "1"
 * "01" -> "1"
 * "1" -> "1"
 * 
 * @param {string} woreda 
 * @returns {string} normalized woreda
 */
const normalizeWoreda = (woreda) => {
  if (!woreda || typeof woreda !== 'string') return woreda;

  let normalized = woreda
    .replace(/woreda/gi, '')
    .replace(/ወረዳ/g, '')
    .trim();

  // Remove leading zeros from digits, but keep "0" if it's the only character (unlikely for woredas)
  normalized = normalized.replace(/^0+(?=\d)/, '');

  return normalized;
};

module.exports = { normalizeWoreda };
