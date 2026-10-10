// The last answer of each screen, kept while the app is open: a screen opens
// at once with what it showed last time, and refreshes behind it.
export const cache = new Map<string, unknown>();
export const keyOf = (name: string, days?: number, query?: Record<string, string>) => `${name}|${days ?? ''}|${query ? JSON.stringify(query) : ''}`;
export const clearPageCache = () => cache.clear();
