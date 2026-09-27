import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// GitHub konfigurace repozitáře
export const GITHUB_OWNER = 'Patrik-Rybka';
export const GITHUB_REPO = 'Shift-Calendar';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

const DISMISSED_KEY = '@shift_calendar_update_dismissed_until';

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
}

export interface ReleaseInfo {
  tagName: string;
  version: string;
  name: string;
  notes: string;
  publishedAt: string;
  htmlUrl: string;
  apkDownloadUrl: string | null;
  apkSize: number | null;
  isNewer: boolean;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  release?: ReleaseInfo;
  message?: string;
  error?: string;
}

/**
 * Zjistí aktuální verzi nainstalované aplikace (např. "1.0.7")
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.7';
}

/**
 * Uloží odložení automatického vyskakování aktualizace na 24 hodin
 */
export async function dismissUpdateFor24Hours(): Promise<void> {
  try {
    const nextPromptTime = Date.now() + 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(DISMISSED_KEY, String(nextPromptTime));
  } catch {}
}

/**
 * Zjistí, zda je automatické upozornění na aktualizaci ještě odloženo (méně než 24 h)
 */
export async function isUpdateDismissed(): Promise<boolean> {
  try {
    const item = await AsyncStorage.getItem(DISMISSED_KEY);
    if (!item) return false;
    const until = parseInt(item, 10);
    return Date.now() < until;
  } catch {
    return false;
  }
}

/**
 * Porovnání sémantických verzí (např. 1.0.1 > 1.0.0)
 */
export function isNewerVersion(currentVersion: string, remoteVersion: string): boolean {
  const cleanCurrent = currentVersion.replace(/^v/i, '').trim();
  const cleanRemote = remoteVersion.replace(/^v/i, '').trim();

  const currentParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);
  const remoteParts = cleanRemote.split('.').map((p) => parseInt(p, 10) || 0);

  const length = Math.max(currentParts.length, remoteParts.length);
  for (let i = 0; i < length; i++) {
    const c = currentParts[i] || 0;
    const r = remoteParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Zkontroluje GitHub Releases API na přítomnost novější verze
 */
export async function checkForUpdate(manualVersion?: string): Promise<CheckUpdateResult> {
  const currentVersion = manualVersion || getCurrentAppVersion();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(GITHUB_RELEASES_API, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ShiftCalendarApp',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Pokud ještě nebylo žádné vydání publikováno (404 Not Found)
    if (response.status === 404) {
      return {
        hasUpdate: false,
        currentVersion,
        message: 'Aplikace je aktuální. Na GitHubu zatím nebyla vydána žádná novější verze.',
      };
    }

    if (!response.ok) {
      if (response.status === 403) {
        return {
          hasUpdate: false,
          currentVersion,
          error: 'GitHub API limit vyčerpán. Zkuste to prosím za chvíli.',
        };
      }
      return {
        hasUpdate: false,
        currentVersion,
        error: `Chyba serveru (${response.status}). Nepodařilo se ověřit aktualizace.`,
      };
    }

    const data = await response.json();
    const rawTag = (data.tag_name || '').trim();
    const remoteVersion = rawTag.replace(/^v/i, '');

    if (!remoteVersion) {
      return {
        hasUpdate: false,
        currentVersion,
        message: 'Aplikace je aktuální.',
      };
    }

    const isNewer = isNewerVersion(currentVersion, remoteVersion);

    // Hledáme .apk soubor v přílohách vydání (upřednostníme ten s verzí v názvu, např. kalendar-smen-v1.0.6.apk)
    const apkAsset = Array.isArray(data.assets)
      ? data.assets.find((a: ReleaseAsset) => a.name.toLowerCase().includes(`v${remoteVersion}`) && a.name.toLowerCase().endsWith('.apk'))
        || data.assets.find((a: ReleaseAsset) => a.name.toLowerCase().endsWith('.apk'))
      : null;

    const releaseInfo: ReleaseInfo = {
      tagName: rawTag,
      version: remoteVersion,
      name: data.name || `Verze ${rawTag}`,
      notes: data.body || 'Žádné poznámky k vydání nebyly zadány.',
      publishedAt: data.published_at || '',
      htmlUrl: data.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      apkDownloadUrl: apkAsset ? apkAsset.browser_download_url : null,
      apkSize: apkAsset ? apkAsset.size : null,
      isNewer,
    };

    if (isNewer) {
      return {
        hasUpdate: true,
        currentVersion,
        release: releaseInfo,
      };
    }

    return {
      hasUpdate: false,
      currentVersion,
      release: releaseInfo,
      message: `Máte nainstalovanou nejnovější verzi (v${currentVersion}).`,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        hasUpdate: false,
        currentVersion,
        error: 'Časový limit pro ověření aktualizace vypršel. Zkontrolujte připojení k internetu.',
      };
    }
    return {
      hasUpdate: false,
      currentVersion,
      error: 'Nepodařilo se připojit k serveru GitHub. Zkontrolujte internetové připojení.',
    };
  }
}

/**
 * Otevře přímý odkaz ke stažení APK souboru v prohlížeči (např. v Chromu),
 * odkud si ho uživatel jedním klikem stáhne a nainstaluje.
 */
export async function openUpdateDownload(downloadUrl: string | null, fallbackHtmlUrl: string): Promise<void> {
  const targetUrl = downloadUrl || fallbackHtmlUrl;
  if (targetUrl) {
    try {
      await Linking.openURL(targetUrl);
    } catch (err) {
      console.warn('Nepodařilo se otevřít odkaz ke stažení:', err);
    }
  }
}
