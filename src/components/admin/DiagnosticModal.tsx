import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Clipboard from 'expo-clipboard';
import {
  Terminal,
  X,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Database,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  HardDrive,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';
import { logger, LogEntry, LogLevel } from '@/services/logger';
import { checkNeonConnection } from '@/services/db/neonClient';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import Constants from 'expo-constants';

interface DiagnosticModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DiagnosticModal({ visible, onClose }: DiagnosticModalProps) {
  const isDark = useColorScheme() === 'dark';
  const { currentUser, currentGroup } = useAuthStore();
  const { shifts, pendingChanges, presets, syncWithNeon } = useShiftStore();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; latency: number; message: string } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    // Auto-test DB latency on modal open
    runDbTest();

    return () => {
      unsubscribe();
    };
  }, [visible]);

  const runDbTest = async () => {
    setTestingDb(true);
    const start = Date.now();
    try {
      const ok = await checkNeonConnection();
      const latency = Date.now() - start;
      setDbStatus({
        ok,
        latency,
        message: ok ? `Neon DB v pořádku (${latency} ms)` : 'Neon DB nedostupná',
      });
      if (ok) {
        logger.success('DB', `Test připojení: Neon DB odpověděla za ${latency} ms`);
      } else {
        logger.error('DB', 'Test připojení selhal: Neon DB neodpovídá');
      }
    } catch (e: any) {
      const latency = Date.now() - start;
      setDbStatus({
        ok: false,
        latency,
        message: `Chyba spojení (${e?.message || 'Timeout'})`,
      });
      logger.error('DB', 'Výjimka při testu Neon DB', e);
    } finally {
      setTestingDb(false);
    }
  };

  const handleCopyReport = async () => {
    try {
      const report = await logger.generateDiagnosticReport();
      await Clipboard.setStringAsync(report);
      setCopied(true);
      logger.info('SYSTEM', 'Diagnostický report byl zkopírován do schránky.');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      Alert.alert('Chyba', 'Nepodařilo se zkopírovat report do schránky.');
    }
  };

  const handleClearLogs = () => {
    Alert.alert('Smazat záznamy?', 'Opravdu chcete vymazat historii diagnostických logů?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: () => {
          logger.clearLogs();
        },
      },
    ]);
  };

  const handleCleanCache = () => {
    if (!currentGroup?.id) return;

    Alert.alert(
      'Obnovit mezipaměť?',
      'Aplikace vyčistí lokálně uložené směny a stáhne čerstvá data přímo z cloudu. Vaše přihlášení i data na serveru zůstanou nedotčeny.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Obnovit mezipaměť',
          onPress: async () => {
            setClearingCache(true);
            logger.info('STORAGE', 'Správce vyžádal vyčištění mezipaměti směn.');
            try {
              useShiftStore.getState().setShifts([]);
              await syncWithNeon(currentGroup.id);
              logger.success('STORAGE', 'Mezipaměť úspěšně obnovena z Neon DB.');
              Alert.alert('Hotovo', 'Mezipaměť kalendáře byla úspěšně obnovena ze serveru.');
            } catch (e) {
              logger.error('STORAGE', 'Obnova mezipaměti selhala', e);
              Alert.alert('Chyba', 'Nepodařilo se obnovit data ze serveru.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    if (filterLevel === 'error') return log.level === 'error';
    if (filterLevel === 'warn') return log.level === 'warn';
    if (filterLevel === 'info') return log.level === 'info' || log.level === 'success';
    return true;
  });

  const errCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;
  const infoCount = logs.filter((l) => l.level === 'info' || l.level === 'success').length;

  const totalLocalShifts = Object.keys(shifts || {}).length;
  const pendingCount = Object.keys(pendingChanges || {}).length;
  const appVersion = Constants.expoConfig?.version || '1.0.6';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.terminalContainer, { backgroundColor: isDark ? '#0A0F1D' : '#0F172A' }]}>
          {/* Terminal Title Bar */}
          <View style={styles.titleBar}>
            <View style={styles.titleLeft}>
              <View style={styles.terminalIconBadge}>
                <Terminal size={17} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.terminalTitle}>Diagnostická konzole</Text>
                <Text style={styles.terminalSubtitle}>Přehled logů a stavu pro správce</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* System Status Dashboard Strip */}
          <View style={styles.statusDashboard}>
            {/* Database status */}
            <View style={styles.statusBox}>
              <View style={styles.statusBoxTop}>
                <Database size={13} color="#94A3B8" />
                <Text style={styles.statusBoxLabel}>Neon Databáze</Text>
              </View>
              <View style={styles.statusBoxBottom}>
                {testingDb ? (
                  <ActivityIndicator size="small" color="#38BDF8" style={{ transform: [{ scale: 0.8 }] }} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View
                      style={[
                        styles.indicatorDot,
                        { backgroundColor: dbStatus?.ok ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusBoxValue,
                        { color: dbStatus?.ok ? '#34D399' : '#F87171' },
                      ]}
                      numberOfLines={1}
                    >
                      {dbStatus?.ok ? `${dbStatus.latency} ms` : 'Chyba'}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={runDbTest} disabled={testingDb} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <RefreshCw size={12} color="#38BDF8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Storage status */}
            <View style={styles.statusBox}>
              <View style={styles.statusBoxTop}>
                <HardDrive size={13} color="#94A3B8" />
                <Text style={styles.statusBoxLabel}>Mezipaměť</Text>
              </View>
              <View style={styles.statusBoxBottom}>
                <Text style={styles.statusBoxValue}>
                  {totalLocalShifts} směn
                </Text>
                {pendingCount > 0 ? (
                  <Text style={[styles.statusBoxValue, { color: '#FBBF24' }]}>
                    ({pendingCount} offline)
                  </Text>
                ) : (
                  <Text style={[styles.statusBoxValue, { color: '#10B981' }]}>
                    (Sync OK)
                  </Text>
                )}
              </View>
            </View>

            {/* Version & Device */}
            <View style={styles.statusBox}>
              <View style={styles.statusBoxTop}>
                <Cpu size={13} color="#94A3B8" />
                <Text style={styles.statusBoxLabel}>Aplikace / OS</Text>
              </View>
              <View style={styles.statusBoxBottom}>
                <Text style={styles.statusBoxValue}>v{appVersion}</Text>
                <Text style={[styles.statusBoxValue, { color: '#94A3B8' }]}>
                  {Platform.OS === 'android' ? 'Android' : 'iOS'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Row */}
          <View style={styles.actionsBar}>
            <TouchableOpacity
              style={[styles.actionBtn, copied && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
              onPress={handleCopyReport}
              activeOpacity={0.75}
            >
              {copied ? <Check size={14} color="#34D399" /> : <Copy size={14} color="#38BDF8" />}
              <Text style={[styles.actionBtnText, { color: copied ? '#34D399' : '#38BDF8' }]}>
                {copied ? 'Zkopírováno!' : 'Kopírovat report'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleCleanCache}
              disabled={clearingCache}
              activeOpacity={0.75}
            >
              {clearingCache ? (
                <ActivityIndicator size="small" color="#FBBF24" />
              ) : (
                <>
                  <RefreshCw size={13} color="#FBBF24" />
                  <Text style={[styles.actionBtnText, { color: '#FBBF24' }]}>Obnovit paměť</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              onPress={handleClearLogs}
              activeOpacity={0.75}
            >
              <Trash2 size={13} color="#F87171" />
              <Text style={[styles.actionBtnText, { color: '#F87171' }]}>Smazat logy</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              style={[styles.filterTab, filterLevel === 'all' && styles.filterTabActive]}
              onPress={() => setFilterLevel('all')}
            >
              <Text style={[styles.filterTabText, filterLevel === 'all' && styles.filterTabTextActive]}>
                Vše ({logs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterLevel === 'error' && styles.filterTabActive]}
              onPress={() => setFilterLevel('error')}
            >
              <Text style={[styles.filterTabText, { color: errCount > 0 ? '#F87171' : '#94A3B8' }]}>
                Chyby ({errCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterLevel === 'warn' && styles.filterTabActive]}
              onPress={() => setFilterLevel('warn')}
            >
              <Text style={[styles.filterTabText, { color: warnCount > 0 ? '#FBBF24' : '#94A3B8' }]}>
                Varování ({warnCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterLevel === 'info' && styles.filterTabActive]}
              onPress={() => setFilterLevel('info')}
            >
              <Text style={[styles.filterTabText, filterLevel === 'info' && styles.filterTabTextActive]}>
                Info ({infoCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Log Console Output Stream */}
          <ScrollView
            style={styles.terminalBody}
            contentContainerStyle={styles.terminalBodyContent}
            showsVerticalScrollIndicator={true}
          >
            {filteredLogs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Info size={28} color="#475569" />
                <Text style={styles.emptyText}>Žádné zaznamenané události v této kategorii</Text>
              </View>
            ) : (
              filteredLogs.map((item) => {
                const isExpanded = expandedLogId === item.id;
                const badgeColor =
                  item.level === 'error'
                    ? '#EF4444'
                    : item.level === 'warn'
                    ? '#F59E0B'
                    : item.level === 'success'
                    ? '#10B981'
                    : '#38BDF8';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.logLineBox,
                      isExpanded && styles.logLineBoxExpanded,
                      item.level === 'error' && styles.logLineErrorBg,
                    ]}
                    onPress={() => setExpandedLogId(isExpanded ? null : item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.logHeaderLine}>
                      <Text style={styles.logTime}>{item.timeShort}</Text>
                      <View style={[styles.logLevelBadge, { backgroundColor: `${badgeColor}22`, borderColor: badgeColor }]}>
                        <Text style={[styles.logLevelBadgeText, { color: badgeColor }]}>
                          {item.tag}
                        </Text>
                      </View>
                      <Text style={[styles.logMessage, { color: item.level === 'error' ? '#FCA5A5' : '#E2E8F0' }]} numberOfLines={isExpanded ? undefined : 2}>
                        {item.message}
                      </Text>
                      {item.details && (
                        <View style={{ marginLeft: 'auto' }}>
                          {isExpanded ? (
                            <ChevronDown size={14} color="#94A3B8" />
                          ) : (
                            <ChevronRight size={14} color="#94A3B8" />
                          )}
                        </View>
                      )}
                    </View>

                    {/* Expandable Technical Details / Stack Trace */}
                    {isExpanded && item.details && (
                      <View style={styles.detailsContainer}>
                        <Text style={styles.detailsText} selectable>
                          {item.details}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  terminalContainer: {
    width: '100%',
    height: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  terminalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  terminalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.2,
  },
  terminalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDashboard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 3,
  },
  statusBoxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBoxLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  statusBoxBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  statusBoxValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  indicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  filterTab: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterTabActive: {
    backgroundColor: '#38BDF8',
  },
  filterTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterTabTextActive: {
    color: '#0F172A',
  },
  terminalBody: {
    flex: 1,
    backgroundColor: '#050811',
  },
  terminalBodyContent: {
    padding: 12,
    gap: 6,
    paddingBottom: 32,
  },
  logLineBox: {
    borderRadius: 8,
    padding: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 6,
  },
  logLineBoxExpanded: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  logLineErrorBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTime: {
    fontSize: 10.5,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  logLevelBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 0.5,
  },
  logLevelBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  logMessage: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  detailsContainer: {
    marginTop: 4,
    padding: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailsText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#CBD5E1',
    lineHeight: 15,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
