import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  Settings,
  Copy,
  Check,
  CloudOff,
  Users,
} from 'lucide-react-native';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';

const CZECH_MONTHS = [
  'Leden',
  'Únor',
  'Březen',
  'Duben',
  'Květen',
  'Červen',
  'Červenec',
  'Srpen',
  'Září',
  'Říjen',
  'Listopad',
  'Prosinec',
];

interface CalendarHeaderProps {
  onSave?: () => Promise<void>;
}

export default function CalendarHeader({ onSave }: CalendarHeaderProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const { currentGroup } = useAuthStore();
  const {
    currentMonth,
    nextMonth,
    prevMonth,
    setCurrentMonth,
    isEditMode,
    setEditMode,
    syncStatus,
    syncWithNeon,
  } = useShiftStore();

  const [copied, setCopied] = useState(false);
  const [syncingManual, setSyncingManual] = useState(false);

  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    accentLight: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
    editActiveBg: '#10B981', // Emerald for save
    badgeBg: isDark ? '#161F33' : '#F1F5F9',
  };

  const monthName = CZECH_MONTHS[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  const now = new Date();
  const isCurrentMonthNow =
    now.getMonth() === currentMonth.getMonth() &&
    now.getFullYear() === currentMonth.getFullYear();

  const handleCopyCode = async () => {
    if (!currentGroup?.join_code) return;
    await Clipboard.setStringAsync(currentGroup.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSync = async () => {
    if (!currentGroup?.id || syncingManual) return;
    setSyncingManual(true);
    await syncWithNeon(currentGroup.id);
    setSyncingManual(false);
  };

  const handleEditToggle = async () => {
    if (isEditMode) {
      if (onSave) {
        await onSave();
      }
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const renderSyncIndicator = () => {
    if (syncStatus === 'syncing' || syncingManual) {
      return (
        <View style={[styles.syncBadge, { backgroundColor: ui.badgeBg, borderColor: ui.border }]}>
          <ActivityIndicator size="small" color={ui.accent} style={{ transform: [{ scale: 0.65 }] }} />
          <Text style={[styles.syncText, { color: ui.accent }]}>Ukládám</Text>
        </View>
      );
    }

    if (syncStatus === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.syncBadge, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}
          onPress={handleManualSync}
        >
          <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.syncText, { color: '#92400E' }]}>K odeslání</Text>
        </TouchableOpacity>
      );
    }

    if (syncStatus === 'offline') {
      return (
        <TouchableOpacity
          style={[styles.syncBadge, { backgroundColor: ui.badgeBg, borderColor: ui.border }]}
          onPress={handleManualSync}
        >
          <CloudOff size={12} color={ui.textMuted} />
          <Text style={[styles.syncText, { color: ui.textMuted }]}>Offline</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.syncBadge,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#DCFCE7',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#86EFAC',
          },
        ]}
        onPress={handleManualSync}
      >
        <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
        <Text style={[styles.syncText, { color: isDark ? '#34D399' : '#15803D' }]}>Uloženo</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Status & Quick Bar */}
      <View style={styles.topRow}>
        {/* Group Join Code Pill */}
        <TouchableOpacity
          style={[styles.groupCodePill, { backgroundColor: ui.card, borderColor: ui.border }]}
          activeOpacity={0.7}
          onPress={handleCopyCode}
        >
          <Users size={14} color={ui.accent} />
          <Text style={[styles.groupCodeText, { color: ui.text }]}>
            {currentGroup?.join_code || '------'}
          </Text>
          {copied ? (
            <Check size={13} color="#10B981" strokeWidth={2.5} />
          ) : (
            <Copy size={12} color={ui.textMuted} />
          )}
        </TouchableOpacity>

        {/* Sync Status Badge */}
        {renderSyncIndicator()}

        <View style={styles.actionsRight}>
          {/* Settings Button */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: ui.card, borderColor: ui.border }]}
            onPress={() => router.push('/settings' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Settings size={18} color={ui.text} />
          </TouchableOpacity>

          {/* Edit / Save Toggle Button */}
          <TouchableOpacity
            style={[
              styles.editButton,
              isEditMode
                ? { backgroundColor: ui.editActiveBg }
                : { backgroundColor: ui.accent },
            ]}
            activeOpacity={0.85}
            onPress={handleEditToggle}
          >
            {isEditMode ? (
              <>
                <Save size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.editButtonText}>Uložit</Text>
              </>
            ) : (
              <>
                <Pencil size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.editButtonText}>Upravit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Navigator Pill Card */}
      <View style={[styles.navCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
        <TouchableOpacity
          style={[styles.navArrow, { backgroundColor: ui.badgeBg }]}
          onPress={prevMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={20} color={ui.text} />
        </TouchableOpacity>

        <View style={styles.monthDisplayCenter}>
          <Text style={[styles.monthTitle, { color: ui.text }]}>
            {monthName} <Text style={[styles.yearTitle, { color: ui.textMuted }]}>{year}</Text>
          </Text>

          {!isCurrentMonthNow && (
            <TouchableOpacity
              style={[styles.todayButton, { backgroundColor: ui.accentLight }]}
              onPress={() => setCurrentMonth(new Date())}
            >
              <Text style={[styles.todayButtonText, { color: ui.accent }]}>Dnes</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.navArrow, { backgroundColor: ui.badgeBg }]}
          onPress={nextMonth}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={20} color={ui.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  groupCodeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  navArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisplayCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  yearTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  todayButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
