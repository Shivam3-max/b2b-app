/**
 * Reads an order list typed or pasted from WhatsApp, one design per line:
 *   "2603 pink 2 set", "616 - 3", "YB 1750 26-30 4 set", "2570 brown 2"
 * Returns the style code, an optional colour word, an optional size range and the number of sets.
 * Pure: matching to real products happens in the order pad.
 */
export type ListLine = { raw: string; code: string | null; colourHint: string | null; sizeHint: string[]; count: number };

export function parseOrderList(text: string): ListLine[] {
  return text
    .split(/\r?\n|;/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(raw => {
      const m = raw.match(/^(?:yb|fl)?\s*[-:.]?\s*(\d{3,5})\b(.*)$/i);
      if (!m) return { raw, code: null, colourHint: null, sizeHint: [], count: 0 };
      let rest = m[2];
      // A size range like "26-30" or "22 - 28".
      const range = rest.match(/\b(\d{1,2})\s*[-–to]+\s*(\d{1,2})\b/i);
      const sizeHint = range ? [range[1], range[2]] : [];
      if (range) rest = rest.replace(range[0], ' ');
      // The set count: "x3", "3 set", "3 sets", "3 pack", or a bare number.
      const countMatch = rest.match(/x\s*(\d+)/i) ?? rest.match(/(\d+)\s*(?:sets?|packs?|pcs?|nos?)\b/i) ?? rest.match(/\b(\d+)\b/);
      const count = countMatch ? Math.max(1, Number(countMatch[1])) : 1;
      if (countMatch) rest = rest.replace(countMatch[0], ' ');
      const words = rest.replace(/[-–:,.x]/gi, ' ').replace(/\b(sets?|packs?|pcs?|nos?|of)\b/gi, ' ').trim().split(/\s+/).filter(w => /^[a-z]{3,}$/i.test(w));
      return { raw, code: m[1], colourHint: words.length ? words.join(' ') : null, sizeHint, count };
    });
}
