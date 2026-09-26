/**
 * Simple, self-contained SHA-256 hashing utility without heavy external dependencies.
 */
export async function hashPassword(password: string): Promise<string> {
  // Use crypto.subtle if available (standard in modern React Native & Web)
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'shift_calendar_salt_2026');
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple deterministic hash
  let hash = 0;
  const str = password + 'shift_calendar_salt_2026';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
