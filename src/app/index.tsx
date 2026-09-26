import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  Users,
  AlertCircle,
  Crown,
  FileText,
  UserPlus,
  Pencil,
  Eye,
  EyeOff,
} from 'lucide-react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore, getShiftMapKey } from '@/store/useShiftStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getGroupPresets } from '@/services/db/shiftService';
import { fetchGroupShiftsRange } from '@/services/db/syncService';
import { CalendarDay, getDatesBetween, formatLocalDate } from '@/utils/calendarUtils';

import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import EditToolbar from '@/components/calendar/EditToolbar';
import ShiftPickerModal from '@/components/calendar/ShiftPickerModal';
import SuccessConfettiModal from '@/components/common/SuccessConfettiModal';
import AddMemberModal from '@/components/calendar/AddMemberModal';
import { getCurrentAppVersion } from '@/services/updateService';

function formatCzechDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const daysCs = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const monthsCs = [
    'ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
  ];
  const dayName = daysCs[dateObj.getDay()];
  return `${dayName}, ${d}. ${monthsCs[m - 1]} ${y}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const { currentUser, currentGroup, groupMembers, setGroupMembers } = useAuthStore();
  const {
    cellStyle,
    hiddenMemberIds,
    toggleMemberVisibility,
    setAllMembersVisible,
    memberOrderIds,
    fontSizeScale,
    calendarDensity,
  } = useSettingsStore();

  const fontMultiplier = fontSizeScale === 'small' ? 0.88 : fontSizeScale === 'large' ? 1.18 : 1.0;
  const {
    presets,
    setPresets,
    shifts,
    syncWithNeon,
    syncStatus,
    currentMonth,
    isEditMode,
    setEditMode,
    rangeStart,
    rangeEnd,
    setRangeStart,
    setRangeEnd,
    clearRangeSelection,
    discardPendingChanges,
    applyShift,
    removeShift,
    editingUserId,
    setEditingUserId,
    pendingChanges,
  } = useShiftStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<CalendarDay | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [confettiSubtitle, setConfettiSubtitle] = useState('Vše je úspěšně synchronizováno v cloudu');
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [currentInitialNote, setCurrentInitialNote] = useState<string | null>(null);

  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    modalOverlay: 'rgba(0, 0, 0, 0.65)',
  };

  // Auth gatekeeper
  useEffect(() => {
    if (!currentUser) {
      router.replace('/welcome');
    } else if (!currentGroup || currentUser.status === 'pending') {
      router.replace('/group-choice' as any);
    }
  }, [currentUser, currentGroup]);

  // Load presets & sync initial shifts
  useEffect(() => {
    if (!currentGroup?.id) return;

    const initData = async () => {
      try {
        if (presets.length === 0) {
          const loadedPresets = await getGroupPresets(currentGroup.id);
          setPresets(loadedPresets);
        }
        await syncWithNeon(currentGroup.id);
      } catch (e) {
        console.warn('Initial calendar sync error:', e);
      }
    };

    initData();
  }, [currentGroup?.id, currentMonth]);

  // Auto-sync whenever user returns to the app from background
  useEffect(() => {
    if (!currentGroup?.id) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncWithNeon(currentGroup.id).catch((e) => {
          console.warn('Background foreground sync notice:', e);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentGroup?.id, syncWithNeon]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    if (!currentGroup?.id) return;
    setRefreshing(true);
    try {
      const loadedPresets = await getGroupPresets(currentGroup.id);
      setPresets(loadedPresets);
      await syncWithNeon(currentGroup.id);
    } finally {
      setRefreshing(false);
    }
  }, [currentGroup?.id, currentMonth]);

  if (!currentUser || !currentGroup) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: ui.bg }]}>
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  // 7.4C: Ordered and filtered members
  const orderedMembers = React.useMemo(() => {
    if (!groupMembers || groupMembers.length === 0) return [];
    if (!memberOrderIds || memberOrderIds.length === 0) return groupMembers;

    return [...groupMembers].sort((a, b) => {
      const idxA = memberOrderIds.indexOf(a.id);
      const idxB = memberOrderIds.indexOf(b.id);
      const sortA = idxA === -1 ? 9999 : idxA;
      const sortB = idxB === -1 ? 9999 : idxB;
      return sortA - sortB;
    });
  }, [groupMembers, memberOrderIds]);

  // Helper to extract shifts for a given calendar day (Step 7.4C respects ordering and hidden filter)
  const getDayShifts = (day: CalendarDay) => {
    const list: Array<{
      member: typeof groupMembers[0];
      preset?: typeof presets[0];
      customHours?: number | null;
      note?: string | null;
      color: string;
      title: string;
    }> = [];

    for (const member of orderedMembers) {
      // Step 7.4C: Skip if member is hidden from calendar view
      if (hiddenMemberIds.includes(member.id)) {
        continue;
      }

      const key = getShiftMapKey(member.id, day.dateStr);
      const shift = shifts[key];
      if (shift && (shift.shift_preset_id || (shift.note && shift.note.trim().length > 0))) {
        const preset = shift.shift_preset_id ? presets.find((p) => p.id === shift.shift_preset_id) : undefined;
        const color = preset?.color || member.color || '#2563EB';
        const title = preset?.title || preset?.short_code || shift.note || 'Poznámka';
        list.push({
          member,
          preset,
          customHours: shift.custom_hours,
          note: shift.note,
          color,
          title,
        });
      }
    }
    return list;
  };

  // Render background for day cell (Step 7.4A - full_fill / 50-50 split)
  const renderCellBg = (day: CalendarDay) => {
    if (cellStyle !== 'full_fill') return null;
    const dayShifts = getDayShifts(day);
    if (dayShifts.length === 0) return null;

    if (dayShifts.length === 1) {
      const col = dayShifts[0].color;
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? `${col}40` : `${col}24`,
              borderLeftWidth: 3.5,
              borderLeftColor: col,
            },
          ]}
        />
      );
    }

    if (dayShifts.length === 2) {
      // 50/50 split exactly as user requested: "půl na půl zabarvené"
      const col1 = dayShifts[0].color;
      const col2 = dayShifts[1].color;
      return (
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? `${col1}40` : `${col1}24`,
              borderLeftWidth: 3,
              borderLeftColor: col1,
            }}
          />
          <View
            style={{
              width: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            }}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? `${col2}40` : `${col2}24`,
              borderRightWidth: 3,
              borderRightColor: col2,
            }}
          />
        </View>
      );
    }

    // 3 or more shifts: divided vertical columns
    return (
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
        {dayShifts.slice(0, 3).map((item, idx) => (
          <View
            key={`fill_${idx}`}
            style={{
              flex: 1,
              backgroundColor: isDark ? `${item.color}40` : `${item.color}24`,
              borderLeftWidth: idx === 0 ? 3 : 0,
              borderLeftColor: item.color,
            }}
          />
        ))}
      </View>
    );
  };

  // Render shift items inside each calendar day cell (Step 5.3 & Step 7.4A)
  const renderCellContent = (day: CalendarDay) => {
    const dayShifts = getDayShifts(day);
    if (dayShifts.length === 0) return null;

    // Style 0: Classic Blocks with FULL text (Maminka / Směny style)
    if (cellStyle === 'blocks') {
      return (
        <View style={styles.blocksContainer}>
          {dayShifts.slice(0, 2).map((item, idx) => {
            const blockBg = isDark ? `${item.color}35` : `${item.color}22`;
            const textColor = isDark ? '#FFFFFF' : '#0F172A';

            return (
              <View
                key={`${item.member.id}_${idx}`}
                style={[
                  styles.blockRow,
                  {
                    backgroundColor: blockBg,
                    borderLeftColor: item.color,
                    paddingVertical: calendarDensity === 'compact' ? 1 : 2,
                    paddingHorizontal: 2.5,
                  },
                ]}
              >
                {/* Line 1: Shift Title */}
                <Text
                  style={[
                    styles.blockTitleText,
                    {
                      color: textColor,
                      fontSize: Math.round(8.5 * fontMultiplier),
                      lineHeight: Math.round(10.5 * fontMultiplier),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                {/* Line 2: Member Name / Note */}
                <View style={styles.blockSubRow}>
                  {item.note && (
                    <FileText size={7} color={item.color} style={{ marginRight: 2 }} />
                  )}
                  <Text
                    style={[
                      styles.blockMemberText,
                      {
                        color: isDark ? '#E2E8F0' : '#475569',
                        fontSize: Math.round(7.5 * fontMultiplier),
                        lineHeight: Math.round(9 * fontMultiplier),
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.member.display_name}
                  </Text>
                </View>
              </View>
            );
          })}
          {dayShifts.length > 2 && (
            <Text style={[styles.moreCountText, { color: ui.textMuted, fontSize: Math.round(8 * fontMultiplier) }]}>
              +{dayShifts.length - 2}
            </Text>
          )}
        </View>
      );
    }

    // Style 1: Minimalist Dots
    if (cellStyle === 'dots') {
      const hasAnyNote = dayShifts.some((s) => s.note && s.note.trim().length > 0);
      return (
        <View style={styles.dotsContainer}>
          <View style={styles.dotsRow}>
            {dayShifts.slice(0, 4).map((item, idx) => (
              <View
                key={`${item.member.id}_${idx}`}
                style={[
                  styles.shiftDot,
                  {
                    backgroundColor: item.color,
                    borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.15)',
                  },
                ]}
              />
            ))}
            {dayShifts.length > 4 && (
              <Text style={[styles.dotsMoreText, { color: ui.textMuted }]}>
                +{dayShifts.length - 4}
              </Text>
            )}
          </View>
          {hasAnyNote && (
            <View style={styles.dotsNoteRow}>
              <FileText size={9} color={isDark ? '#93C5FD' : '#2563EB'} />
            </View>
          )}
        </View>
      );
    }

    // Style 2: Bottom Strip / Bars
    if (cellStyle === 'bottom_strip') {
      return (
        <View style={styles.stripContainer}>
          <View style={styles.stripItemsList}>
            {dayShifts.slice(0, 2).map((item, idx) => (
              <View
                key={`${item.member.id}_${idx}`}
                style={[
                  styles.stripChip,
                  {
                    backgroundColor: isDark ? `${item.color}25` : `${item.color}18`,
                    borderLeftColor: item.color,
                    paddingVertical: calendarDensity === 'compact' ? 1 : 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.memberDot,
                    { backgroundColor: item.member.color || item.color },
                  ]}
                />
                <Text
                  style={[
                    styles.stripChipText,
                    {
                      color: isDark ? '#F9FAFB' : '#0F172A',
                      fontSize: Math.round(8 * fontMultiplier),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.note && (
                  <FileText size={7.5} color={item.color} style={{ marginLeft: 1 }} />
                )}
              </View>
            ))}
          </View>

          {/* Crisp bottom color track running along cell bottom */}
          <View style={styles.bottomStripeTrack}>
            {dayShifts.slice(0, 3).map((item, idx) => (
              <View
                key={`bar_${idx}`}
                style={[styles.bottomStripeSegment, { backgroundColor: item.color }]}
              />
            ))}
          </View>
        </View>
      );
    }

    // Style 3: Full Fill
    if (cellStyle === 'full_fill') {
      return (
        <View style={styles.fullFillContainer}>
          {dayShifts.slice(0, 2).map((item, idx) => (
            <View
              key={`${item.member.id}_${idx}`}
              style={[
                styles.fullFillChip,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  paddingVertical: calendarDensity === 'compact' ? 1 : 2,
                },
              ]}
            >
              <View
                style={[
                  styles.memberDot,
                  { backgroundColor: item.member.color || item.color },
                ]}
              />
              <Text
                style={[
                  styles.fullFillChipText,
                  {
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    fontSize: Math.round(8.5 * fontMultiplier),
                  },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.note && (
                <FileText size={7.5} color={isDark ? '#93C5FD' : '#2563EB'} style={{ marginLeft: 1 }} />
              )}
            </View>
          ))}
          {dayShifts.length > 2 && (
            <Text style={[styles.moreCountText, { color: isDark ? '#FFFFFF' : '#0F172A', fontSize: Math.round(8 * fontMultiplier) }]}>
              +{dayShifts.length - 2}
            </Text>
          )}
        </View>
      );
    }

    // Style 4: Classic Badge / Pills (default)
    return (
      <View style={styles.cellShiftsContainer}>
        {dayShifts.slice(0, 3).map((item, idx) => {
          const pillColor = item.color;
          const title = item.title;

          return (
            <View
              key={`${item.member.id}_${idx}`}
              style={[
                styles.shiftPill,
                {
                  backgroundColor: isDark ? `${pillColor}25` : `${pillColor}18`,
                  borderColor: isDark ? `${pillColor}50` : `${pillColor}40`,
                  paddingVertical: calendarDensity === 'compact' ? 1 : 2.5,
                },
              ]}
            >
              <View
                style={[
                  styles.memberDot,
                  { backgroundColor: item.member.color || '#0EA5E9' },
                ]}
              />
              {item.note && (
                <FileText
                  size={8.5}
                  color={isDark ? '#93C5FD' : '#2563EB'}
                  strokeWidth={2.5}
                />
              )}
              <Text
                style={[
                  styles.shiftPillText,
                  {
                    color: isDark ? '#F9FAFB' : '#0F172A',
                    fontSize: Math.round(8.5 * fontMultiplier),
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            </View>
          );
        })}

        {dayShifts.length > 3 && (
          <Text style={[styles.moreCountText, { color: ui.textMuted, fontSize: Math.round(8 * fontMultiplier) }]}>
            +{dayShifts.length - 3} další
          </Text>
        )}
      </View>
    );
  };

  const isDateSelected = useCallback(
    (dateStr: string) => {
      if (!isEditMode) return false;
      if (!rangeStart) return false;
      if (!rangeEnd) return dateStr === rangeStart;

      const min = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const max = rangeStart < rangeEnd ? rangeEnd : rangeStart;
      return dateStr >= min && dateStr <= max;
    },
    [isEditMode, rangeStart, rangeEnd]
  );

  const handleRangeDragChange = useCallback(
    (startDateStr: string, endDateStr: string) => {
      const minDate = startDateStr < endDateStr ? startDateStr : endDateStr;
      const maxDate = startDateStr < endDateStr ? endDateStr : startDateStr;
      setRangeStart(minDate);
      setRangeEnd(maxDate);
    },
    [setRangeStart, setRangeEnd]
  );

  const handleRangeDragComplete = useCallback(
    (startDateStr: string, endDateStr: string) => {
      const minDate = startDateStr < endDateStr ? startDateStr : endDateStr;
      const maxDate = startDateStr < endDateStr ? endDateStr : startDateStr;
      const targetUserId = editingUserId || currentUser?.id;
      const key = targetUserId ? getShiftMapKey(targetUserId, minDate) : '';
      const existingShift = key ? shifts[key] : null;

      setCurrentInitialNote(existingShift?.note || null);
      setRangeStart(minDate);
      setRangeEnd(maxDate);
      setSelectedRange({ start: minDate, end: maxDate });
      setPickerVisible(true);
    },
    [setRangeStart, setRangeEnd, editingUserId, currentUser?.id, shifts]
  );

  const handleDayTapInEditMode = useCallback(
    (day: CalendarDay) => {
      if (!day.isCurrentMonth) return;

      const targetUserId = editingUserId || currentUser?.id;
      const key = targetUserId ? getShiftMapKey(targetUserId, day.dateStr) : '';
      const existingShift = key ? shifts[key] : null;

      setCurrentInitialNote(existingShift?.note || null);
      setRangeStart(day.dateStr);
      setRangeEnd(day.dateStr);
      setSelectedRange({ start: day.dateStr, end: day.dateStr });
      setPickerVisible(true);
    },
    [setRangeStart, setRangeEnd, editingUserId, currentUser?.id, shifts]
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  const handleApplyPresetFromModal = useCallback(
    (presetId: string | null, note?: string | null) => {
      const targetUserId = editingUserId || currentUser?.id;
      if (!currentGroup?.id || !targetUserId || !selectedRange) return;

      // Safely generate exact date strings without any UTC/timezone skew
      const dates = getDatesBetween(selectedRange.start, selectedRange.end);

      for (const dStr of dates) {
        if (presetId === '__DELETE__' || presetId === null) {
          removeShift(currentGroup.id, targetUserId, dStr);
        } else if (presetId === '__NOTE_ONLY__') {
          const existingKey = getShiftMapKey(targetUserId, dStr);
          const existingShift = shifts[existingKey];
          applyShift({
            groupId: currentGroup.id,
            userId: targetUserId,
            date: dStr,
            presetId: existingShift?.shift_preset_id || null,
            note: note !== undefined ? note : null,
          });
        } else {
          applyShift({
            groupId: currentGroup.id,
            userId: targetUserId,
            date: dStr,
            presetId,
            note: note !== undefined ? note : null,
          });
        }
      }

      setPickerVisible(false);
      clearRangeSelection();
      setSelectedRange(null);
      setCurrentInitialNote(null);

      const presetObj = presets.find((p) => p.id === presetId);
      const title =
        presetId === '__DELETE__'
          ? 'Volno'
          : presetId === '__NOTE_ONLY__'
          ? 'Poznámka'
          : presetObj?.title || 'Směna';
      showToast(`✓ ${title} uložena`);
    },
    [
      editingUserId,
      currentUser?.id,
      currentGroup?.id,
      selectedRange,
      shifts,
      removeShift,
      applyShift,
      clearRangeSelection,
      presets,
      showToast,
    ]
  );

  const handleSaveShifts = useCallback(async () => {
    if (!currentGroup?.id) {
      setEditMode(false);
      return;
    }

    const hasPending = Object.keys(pendingChanges).length > 0;
    if (!hasPending) {
      setEditMode(false);
      return;
    }

    try {
      const ok = await syncWithNeon(currentGroup.id);
      setEditMode(false);
      if (ok) {
        setConfettiSubtitle('Vše je úspěšně uloženo a synchronizováno v cloudu');
        setConfettiVisible(true);
      } else {
        setConfettiSubtitle('Směny jsou uloženy v paměti telefonu (offline)');
        setConfettiVisible(true);
      }
    } catch (e) {
      console.warn('Save error:', e);
      setEditMode(false);
      setConfettiSubtitle('Směny jsou uloženy v paměti telefonu');
      setConfettiVisible(true);
    }
  }, [currentGroup?.id, pendingChanges, syncWithNeon, setEditMode]);

  const handleCancelEdit = useCallback(async () => {
    if (!currentGroup?.id) {
      discardPendingChanges();
      setEditMode(false);
      return;
    }

    discardPendingChanges();
    setEditMode(false);

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = formatLocalDate(year, month - 1, 20);
      const endDate = formatLocalDate(year, month + 2, 10);
      const remoteShifts = await fetchGroupShiftsRange(currentGroup.id, startDate, endDate);
      useShiftStore.getState().setShifts(remoteShifts);
      showToast('Úpravy byly zrušeny');
    } catch (e) {
      console.warn('Failed to revert shifts:', e);
    }
  }, [currentGroup?.id, currentMonth, discardPendingChanges, setEditMode, showToast]);

  const handleDayPress = (day: CalendarDay) => {
    if (isEditMode) {
      handleDayTapInEditMode(day);
      return;
    }

    // In view mode, tap opens day detail modal
    setSelectedDayDetail(day);
  };

  const handleEditThisDay = (day: CalendarDay) => {
    setSelectedDayDetail(null);
    setEditMode(true);
    handleDayTapInEditMode(day);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: ui.bg }]}>
      {/* 1. Calendar Header (Month navigation, Sync badge, Group Code, Edit toggle) */}
      <CalendarHeader onSave={handleSaveShifts} />

      {/* 2. Main Scrollable Calendar Grid (Never blocked by EditMode, zero layout jump) */}
      <ScrollView
        scrollEnabled={true}
        contentContainerStyle={[styles.scrollContent, isEditMode && { paddingBottom: 180 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ui.accent}
            colors={[ui.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <CalendarGrid
          onDayPress={handleDayPress}
          renderCellContent={renderCellContent}
          renderCellBg={renderCellBg}
          isDateSelected={isDateSelected}
          isEditMode={isEditMode}
          onRangeDragChange={handleRangeDragChange}
          onRangeDragComplete={handleRangeDragComplete}
          onDayTapInEditMode={handleDayTapInEditMode}
        />

        {/* Legend / Quick Family Summary (Visible in View Mode only) */}
        {!isEditMode && (
          <View style={[styles.familySummaryBox, { backgroundColor: ui.card, borderColor: ui.border }]}>
            <View style={styles.summaryTitleRow}>
              <View style={styles.summaryTitleLeft}>
                <Users size={16} color={ui.accent} />
                <Text style={[styles.summaryTitle, { color: ui.text }]}>
                  Rodina ({groupMembers.length})
                </Text>
              </View>
              <View style={styles.summaryActionsRight}>
                {hiddenMemberIds.length > 0 && (
                  <TouchableOpacity
                    style={[styles.showAllBtnSmall, { borderColor: ui.border, backgroundColor: isDark ? '#161F33' : '#F1F5F9' }]}
                    onPress={setAllMembersVisible}
                    activeOpacity={0.75}
                  >
                    <Eye size={12} color={ui.accent} />
                    <Text style={[styles.showAllBtnSmallText, { color: ui.accent }]}>
                      Zobrazit vše ({hiddenMemberIds.length} skryto)
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.addMemberBtnSmall, { borderColor: ui.border, backgroundColor: isDark ? '#161F33' : '#F1F5F9' }]}
                  onPress={() => setAddMemberModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <UserPlus size={13} color={ui.accent} />
                  <Text style={[styles.addMemberBtnSmallText, { color: ui.accent }]}>+ Přidat člena</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.membersListRow}>
              {orderedMembers.map((member) => {
                const isHidden = hiddenMemberIds.includes(member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberTag,
                      {
                        backgroundColor: isDark ? '#161F33' : '#F1F5F9',
                        borderColor: isHidden ? (isDark ? 'rgba(255,255,255,0.06)' : '#CBD5E1') : ui.border,
                        opacity: isHidden ? 0.45 : 1,
                      },
                    ]}
                    onPress={() => toggleMemberVisibility(member.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.legendAvatarCircle, { backgroundColor: isHidden ? '#64748B' : member.color }]}>
                      <Text style={styles.legendAvatarText}>
                        {member.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.memberNameText,
                        {
                          color: isHidden ? ui.textMuted : ui.text,
                          textDecorationLine: isHidden ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {member.display_name} {member.id === currentUser?.id && '(Já)'}
                    </Text>
                    {member.role === 'admin' && (
                      <Crown size={12} color={isHidden ? ui.textMuted : '#F59E0B'} />
                    )}
                    {isHidden ? (
                      <EyeOff size={12} color={ui.textMuted} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Full-Screen Shift Picker Modal (revealed on tap or drag in Edit Mode) */}
      <ShiftPickerModal
        visible={pickerVisible}
        onClose={() => {
          setPickerVisible(false);
          clearRangeSelection();
          setSelectedRange(null);
          setCurrentInitialNote(null);
        }}
        startDate={selectedRange?.start || null}
        endDate={selectedRange?.end || null}
        initialNote={currentInitialNote}
        onSelectPreset={handleApplyPresetFromModal}
      />

      {/* 4. Center Celebration Modal with Confetti Explosion */}
      <SuccessConfettiModal
        visible={confettiVisible}
        onDismiss={() => setConfettiVisible(false)}
        title="Směny uloženy!"
        subtitle={confettiSubtitle}
      />

      {/* 5. Floating Toast Notification for quick notices */}
      {toastMessage && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={[styles.toastPill, { backgroundColor: isDark ? '#1E293B' : '#0F172A' }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* 6. Day Detail Modal (when user taps a day in View Mode) */}
      {selectedDayDetail && (
        <Modal
          visible={!!selectedDayDetail}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedDayDetail(null)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: ui.modalOverlay }]}>
            <View style={[styles.modalContentCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleBox}>
                  <CalendarIcon size={20} color={ui.accent} />
                  <Text style={[styles.modalDateTitle, { color: ui.text }]}>
                    {formatCzechDateFull(selectedDayDetail.dateStr)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: ui.bg }]}
                  onPress={() => setSelectedDayDetail(null)}
                >
                  <X size={18} color={ui.text} />
                </TouchableOpacity>
              </View>

              {/* Czech Holiday Banner if this day is a national holiday */}
              {selectedDayDetail.holidayName && (
                <View
                  style={[
                    styles.modalHolidayBanner,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalHolidayBannerText,
                      { color: isDark ? '#FCA5A5' : '#B91C1C' },
                    ]}
                  >
                    🇨🇿 Státní svátek: {selectedDayDetail.holidayName}
                  </Text>
                </View>
              )}

              {/* Members Shifts List for the Day */}
              <View style={styles.modalShiftsList}>
                {orderedMembers.map((member) => {
                  const isHidden = hiddenMemberIds.includes(member.id);
                  const key = getShiftMapKey(member.id, selectedDayDetail.dateStr);
                  const shift = shifts[key];
                  const preset = shift?.shift_preset_id
                    ? presets.find((p) => p.id === shift.shift_preset_id)
                    : null;

                  return (
                    <View key={member.id} style={{ gap: 4, opacity: isHidden ? 0.6 : 1 }}>
                      <View
                        style={[styles.modalMemberRow, { borderColor: ui.border }]}
                      >
                        {/* Member Info */}
                        <View style={styles.modalMemberInfo}>
                          <View style={[styles.memberAvatarSmall, { backgroundColor: isHidden ? '#64748B' : member.color }]}>
                            <Text style={styles.memberAvatarInitial}>
                              {member.display_name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.modalMemberName, { color: ui.text }]}>
                              {member.display_name} {member.id === currentUser?.id && '(Já)'}
                            </Text>
                            {isHidden && (
                              <Text style={{ fontSize: 10.5, color: ui.textMuted, fontStyle: 'italic' }}>
                                (v kalendáři skryt)
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Shift Badge or Off */}
                        {preset ? (
                          <View
                            style={[
                              styles.modalShiftBadge,
                              {
                                backgroundColor: `${preset.color}20`,
                                borderColor: preset.color,
                              },
                            ]}
                          >
                            <Text style={[styles.modalShiftTitle, { color: preset.color }]}>
                              {preset.title}
                            </Text>
                            {preset.start_time && preset.end_time ? (
                              <Text style={[styles.modalShiftTimes, { color: ui.textMuted }]}>
                                {preset.start_time} – {preset.end_time} ({preset.hours}h)
                              </Text>
                            ) : preset.hours !== undefined && preset.hours !== null && preset.hours > 0 ? (
                              <Text style={[styles.modalShiftTimes, { color: ui.textMuted }]}>
                                {preset.hours}h
                              </Text>
                            ) : null}
                          </View>
                        ) : (
                          <Text style={[styles.noShiftText, { color: ui.textMuted }]}>
                            Bez zapsané směny
                          </Text>
                        )}
                      </View>

                      {/* Display shift note if any */}
                      {shift?.note && shift.note.trim().length > 0 && (
                        <View style={[styles.modalNoteBubble, { backgroundColor: isDark ? '#161F33' : '#F1F5F9', borderColor: ui.border }]}>
                          <FileText size={12} color={ui.accent} />
                          <Text style={[styles.modalNoteText, { color: ui.text }]}>
                            {shift.note}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Action Button: Edit shifts/notes for this day */}
              <TouchableOpacity
                style={[styles.modalEditDayBtn, { backgroundColor: ui.accent }]}
                activeOpacity={0.88}
                onPress={() => handleEditThisDay(selectedDayDetail)}
              >
                <Pencil size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.modalEditDayBtnText}>Upravit směny a poznámky dne</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* 7. Add Family Member Modal (Kids, relatives without app) */}
      <AddMemberModal
        visible={addMemberModalVisible}
        onClose={() => setAddMemberModalVisible(false)}
        groupId={currentGroup?.id || ''}
        onMemberAdded={(newMember) => {
          setGroupMembers([...groupMembers, newMember]);
          setEditingUserId(newMember.id);
          showToast(`Člen „${newMember.display_name}“ byl úspěšně přidán`);
        }}
      />

      {/* 8. Docked Editing Toolbar (slides up at the bottom without displacing the calendar!) */}
      {isEditMode && (
        <EditToolbar
          onSave={handleSaveShifts}
          onCancel={handleCancelEdit}
          onOpenAddMember={() => setAddMemberModalVisible(true)}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Classic Blocks styles (Maminka / Směny style - Step 7.4A)
  blocksContainer: {
    width: '100%',
    gap: 2,
    flex: 1,
    justifyContent: 'flex-start',
  },
  blockRow: {
    width: '100%',
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderLeftWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitleText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  blockSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0.5,
  },
  blockMemberText: {
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 10.5,
  },
  cellShiftsContainer: {
    gap: 2,
    width: '100%',
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2.5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  memberDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  shiftPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  moreCountText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Full Fill styles (Step 7.4A)
  fullFillContainer: {
    gap: 2,
    width: '100%',
    paddingTop: 1,
  },
  fullFillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  fullFillChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    flexShrink: 1,
  },
  // Bottom Strip styles (Step 7.4A)
  stripContainer: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  stripItemsList: {
    gap: 2,
    width: '100%',
  },
  stripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderLeftWidth: 2.5,
  },
  stripChipText: {
    fontSize: 9,
    fontWeight: '700',
    flexShrink: 1,
  },
  bottomStripeTrack: {
    flexDirection: 'row',
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
    gap: 1.5,
  },
  bottomStripeSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 1.5,
  },
  // Dots styles (Step 7.4A)
  dotsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  shiftDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
  },
  dotsMoreText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  dotsNoteRow: {
    marginTop: 1,
  },
  familySummaryBox: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  membersListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  legendAvatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  memberNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContentCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDateTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalShiftsList: {
    gap: 10,
  },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modalMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalMemberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalShiftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-end',
  },
  modalShiftTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalShiftTimes: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  noShiftText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  toastPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalNoteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 6,
  },
  modalNoteText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  modalEditDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modalEditDayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addMemberBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  addMemberBtnSmallText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalHolidayBanner: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHolidayBannerText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showAllBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  showAllBtnSmallText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
