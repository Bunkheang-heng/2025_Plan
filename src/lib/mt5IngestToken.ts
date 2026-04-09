/** Cryptographically random token for MT5 EA → POST /api/mt5/trades (Bearer). */
export function generateMt5IngestToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
