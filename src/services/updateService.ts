import Constants from 'expo-constants';

/**
 * Zjistí aktuální sémantickou verzi nainstalované aplikace (např. "1.0.7")
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.8';
}
