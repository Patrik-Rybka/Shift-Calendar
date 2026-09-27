import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { checkNeonConnection } from './db/neonClient';
import { useAuthStore } from '../store/useAuthStore';
import { useShiftStore } from '../store/useShiftStore';

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string or HH:MM:SS
  timeShort: string;
  level: LogLevel;
  tag: string; // e.g. 'BOOT', 'SYNC', 'AUTH', 'DB', 'STORAGE', 'UPDATE', 'ERROR'
  message: string;
  details?: string | null;
}

const STORAGE_KEY = '@shift_calendar_debug_logs';
const MAX_IN_MEMORY_LOGS = 120;
const MAX_SAVED_LOGS = 40;

class DiagnosticLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-MAX_SAVED_LOGS);
        }
      }
    } catch {
      // Quietly ignore storage read error on init
    } finally {
      this.isLoaded = true;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    const copy = [...this.logs];
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch {}
    }
  }

  private async persistImportantLogs() {
    try {
      const important = this.logs
        .filter((l) => l.level === 'error' || l.level === 'warn')
        .slice(-MAX_SAVED_LOGS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(important));
    } catch {}
  }

  public subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public log(level: LogLevel, tag: string, message: string, details?: any) {
    const now = new Date();
    const timeShort = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let detailsStr: string | null = null;
    if (details !== undefined && details !== null) {
      if (details instanceof Error) {
        detailsStr = `${details.message}\n${details.stack || ''}`;
      } else if (typeof details === 'object') {
        try {
          detailsStr = JSON.stringify(details, null, 2);
        } catch {
          detailsStr = String(details);
        }
      } else {
        detailsStr = String(details);
      }
    }

    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      timeShort,
      level,
      tag: tag.toUpperCase(),
      message,
      details: detailsStr,
    };

    // Mirror to standard JS console with clean formatting
    const consoleMsg = `[${entry.timeShort}] [${entry.tag}] ${entry.message}`;
    if (level === 'error') {
      console.error(consoleMsg, details || '');
    } else if (level === 'warn') {
      console.warn(consoleMsg, details || '');
    } else {
      console.log(consoleMsg);
    }

    this.logs.unshift(entry);
    if (this.logs.length > MAX_IN_MEMORY_LOGS) {
      this.logs = this.logs.slice(0, MAX_IN_MEMORY_LOGS);
    }

    this.notifyListeners();

    if (level === 'error' || level === 'warn') {
      this.persistImportantLogs();
    }
  }

  public info(tag: string, message: string, details?: any) {
    this.log('info', tag, message, details);
  }

  public success(tag: string, message: string, details?: any) {
    this.log('success', tag, message, details);
  }

  public warn(tag: string, message: string, details?: any) {
    this.log('warn', tag, message, details);
  }

  public error(tag: string, message: string, details?: any) {
    this.log('error', tag, message, details);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public async clearLogs(): Promise<void> {
    this.logs = [];
    this.notifyListeners();
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.info('SYSTEM', 'Historie logů byla smazána správcem.');
  }

  /**
   * Generates a comprehensive markdown report for troubleshooting.
   */
  public async generateDiagnosticReport(): Promise<string> {
    const authState = useAuthStore.getState();
    const shiftState = useShiftStore.getState();

    // Perform live DB test
    const startTime = Date.now();
    let dbStatus = '⏳ Testuji...';
    try {
      const ok = await checkNeonConnection();
      const latency = Date.now() - startTime;
      dbStatus = ok ? `🟢 Připojeno (odezva: ${latency} ms)` : '🔴 Chyba spojení s Neon DB';
    } catch (e: any) {
      dbStatus = `🔴 Selhalo (${e?.message || 'Neznámá chyba'})`;
    }

    const appVersion = Constants.expoConfig?.version || '1.0.6';
    const totalShifts = Object.keys(shiftState.shifts || {}).length;
    const pendingChangesCount = Object.keys(shiftState.pendingChanges || {}).length;

    let report = `========================================\n`;
    report += `  DIAGNOSTICKÝ REPORT — KALENDÁŘ SMĚN\n`;
    report += `========================================\n`;
    report += `Čas vygenerování: ${new Date().toLocaleString('cs-CZ')}\n`;
    report += `Verze aplikace:   v${appVersion} (SDK 57, React Native 0.86)\n`;
    report += `Platforma / OS:   ${Platform.OS} (verze: ${Platform.Version})\n`;
    report += `Stav databáze:    ${dbStatus}\n\n`;

    report += `--- [UŽIVATEL & SKUPINA] ---\n`;
    if (authState.currentUser) {
      report += `Uživatel:   ${authState.currentUser.display_name} (ID: ${authState.currentUser.id})\n`;
      report += `Role:       ${authState.currentUser.role} | Status: ${authState.currentUser.status}\n`;
      report += `Email/Tel:  ${authState.currentUser.email_or_phone}\n`;
    } else {
      report += `Uživatel:   Nepřihlášen (null)\n`;
    }

    if (authState.currentGroup) {
      report += `Skupina:    ${authState.currentGroup.name} (Kód: ${authState.currentGroup.join_code})\n`;
      report += `Skupina ID: ${authState.currentGroup.id}\n`;
      report += `Počet členů: ${authState.groupMembers?.length || 0}\n`;
    } else {
      report += `Skupina:    Žádná (null)\n`;
    }

    report += `\n--- [PAMĚŤ & SYNCHRONIZACE] ---\n`;
    report += `Lokální směny:    ${totalShifts} směn v mezipaměti\n`;
    report += `Předvolby:        ${shiftState.presets?.length || 0} typů směn\n`;
    report += `Čeká k odeslání:  ${pendingChangesCount} změn (offline fronta)\n`;
    report += `Poslední sync:    ${shiftState.lastSyncedAt ? new Date(shiftState.lastSyncedAt).toLocaleString('cs-CZ') : 'Zatím nesynchronizováno'}\n`;
    report += `Hydratace stavu:  ${authState.isHydrated ? '✅ Dokončena' : '⏳ Čeká'}\n`;

    report += `\n--- [ZÁZNAMNÍK UDÁLOSTÍ (${this.logs.length})] ---\n`;
    if (this.logs.length === 0) {
      report += `Žádné zaznamenané události.\n`;
    } else {
      for (const log of this.logs) {
        const symbol =
          log.level === 'error' ? '❌ [CHYBA]' :
          log.level === 'warn' ? '⚠️ [VAROV]' :
          log.level === 'success' ? '✅ [ÚSPĚCH]' : 'ℹ️ [INFO]';
        report += `${log.timeShort} ${symbol} [${log.tag}] ${log.message}\n`;
        if (log.details) {
          report += `   └─ Detail: ${log.details.replace(/\n/g, '\n      ')}\n`;
        }
      }
    }

    report += `\n========================================\n`;
    return report;
  }
}

export const logger = new DiagnosticLogger();
