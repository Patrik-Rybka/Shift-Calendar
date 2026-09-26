import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';

// GitHub konfigurace repozitáře
export const GITHUB_OWNER = 'Patrik-Rybka';
export const GITHUB_REPO = 'Shift-Calendar';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

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
 * Zjistí aktuální verzi nainstalované aplikace (např. "1.0.0")
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.3';
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

    // Hledáme .apk soubor v přílohách vydání
    const apkAsset = Array.isArray(data.assets)
      ? data.assets.find((a: ReleaseAsset) => a.name.toLowerCase().endsWith('.apk'))
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
 * Aktivní instance stahování umožňující sledování průběhu i zrušení
 */
let activeDownload: FileSystem.DownloadResumable | null = null;

/**
 * Spustí stahování APK souboru s průběžným hlášením
 */
export async function downloadApk(
  downloadUrl: string,
  onProgress: (percent: number, writtenBytes: number, totalBytes: number) => void
): Promise<string> {
  const fileUri = `${FileSystem.cacheDirectory}shift_calendar_update.apk`;

  // Pokud již existuje starý stažený APK soubor, smažeme ho
  try {
    const existing = await FileSystem.getInfoAsync(fileUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch {
    // Ignorujeme případnou chybu při mazání
  }

  activeDownload = FileSystem.createDownloadResumable(
    downloadUrl,
    fileUri,
    {},
    (downloadProgress) => {
      const written = downloadProgress.totalBytesWritten;
      const expected = downloadProgress.totalBytesExpectedToWrite;
      const percent = expected > 0 ? Math.min(1, Math.max(0, written / expected)) : 0;
      onProgress(percent, written, expected);
    }
  );

  const result = await activeDownload.downloadAsync();
  activeDownload = null;

  if (!result || !result.uri) {
    throw new Error('Stahování souboru se nezdařilo nebo bylo přerušeno.');
  }

  return result.uri;
}

/**
 * Zruší právě probíhající stahování
 */
export async function cancelApkDownload(): Promise<void> {
  if (activeDownload) {
    try {
      await activeDownload.cancelAsync();
    } catch {
      // Ignorovat
    } finally {
      activeDownload = null;
    }
  }
}

/**
 * Spustí systémový instalátor balíčků v Androidu pro stažený APK soubor
 */
export async function triggerApkInstall(localFileUri: string, fallbackUrl?: string | null): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // Převedeme file:// URI na content:// URI s využitím FileProvideru Expo
      const contentUri = await FileSystem.getContentUriAsync(localFileUri);

      // Spustíme standardní Android VIEW Intent pro instalaci APK
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
      return;
    } catch (error: any) {
      console.warn('Nepodařilo se spustit přímý instalátor balíčků:', error);
      // Pokud přímé spuštění selže (např. chybějící oprávnění nebo systémové omezení),
      // nabídneme otevření v prohlížeči
      if (fallbackUrl) {
        await Linking.openURL(fallbackUrl);
        return;
      }
      throw error;
    }
  } else {
    // Pro web / iOS / jiné platformy otevřeme odkaz
    if (fallbackUrl) {
      await Linking.openURL(fallbackUrl);
    }
  }
}
