/**
 * Splits a dealer feed's feature list into individual items, dropping blanks
 * and repeats.
 *
 * Feeds join features with "|" or ",". When splitting on commas, two kinds of
 * comma stay inside an item: thousands separators ("GVWR: 7,200 lbs") and a
 * comma followed by a space, which belongs to a sentence ("For Details, Visit…").
 */
export function splitFeatures(features: string | null | undefined): string[] {
  if (!features) return [];

  const parts = features.includes('|')
    ? features.split('|')
    : features.split(/,(?!\s|(?<=\d,)\d{3}(?!\d))/);

  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of parts) {
    const item = part.trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

/**
 * Returns the link normalized if it is a well-formed http(s) URL, otherwise
 * null — blocks javascript: and other unsafe schemes from the feed.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Formats a listing's price, or "Call for Price" when the feed has none. */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Call for Price';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}
