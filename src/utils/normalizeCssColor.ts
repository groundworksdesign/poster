/**
 * Normalize user-entered colors so browsers apply them consistently.
 * - Trims whitespace
 * - Adds leading `#` for 3–8 hex digits when `#` is omitted
 * - Leaves `rgb()`, `hsl()`, named colors, and existing `#hex` unchanged
 */
export function normalizeCssColor(input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (/^#/u.test(v)) return v;
  if (/^(?:rgb|hsla?)\(/iu.test(v)) return v;
  // Hex before named colors so values like ff00aa are not treated as names.
  if (/^[0-9a-fA-F]{3,8}$/.test(v)) return `#${v}`;
  if (/^[a-z][a-z0-9]*$/iu.test(v) && v.length >= 3) return v.toLowerCase();
  return v;
}

/** Apply normalizeCssColor only for color-related CSS keys. */
export function maybeNormalizeStyleColor(key: string, value: string): string {
  if (key === 'backgroundColor' || key === 'color') {
    return normalizeCssColor(value);
  }
  return value;
}
