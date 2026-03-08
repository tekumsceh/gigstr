/**
 * Flatten nested message object to dot-notation keys.
 * Only leaf string values are included; objects become keys like "languages.en".
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @returns {Record<string, string>}
 */
export function flattenMessages(obj, prefix = '') {
  const out = {};
  if (obj == null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out[key] = v;
    } else if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenMessages(v, key));
    }
  }
  return out;
}
