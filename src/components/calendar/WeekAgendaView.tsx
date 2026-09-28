import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Modal,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Edit3,
  X,
} from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useShiftStore, getUserShiftsForDay } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  formatLocalDate,
  getWeekDays,
  getIsoWeekNumber,
  CalendarDay,
} from '@/utils/calendarUtils';

const CZECH_DAY_NAMES = [
  'Neděle',
  'Pondělí',
  'Úterý',
  'Středa',
  'Čtvrtek',
  'Pátek',
  'Sobota',
];

const CZECH_DAY_NAMES_SHORT = [
  'Ne',
  'Po',
  'Út',
  'St',
  'Čt',
  'Pá',
  'So',
];

const CZECH_MONTHS_GENITIVE = [
  'ledna',
  'února',
  'března',
  'dubna',
  'května',
  'června',
  'července',
  'srpna',
  'září',
  'října',
  'listopadu',
  'prosince',
];

interface WeekAgendaViewProps {
  onEditDay?: (day: CalendarDay) => void;
  onDayPress?: (day: CalendarDay) => void;
}

export default function WeekAgendaView({
  onEditDay,
  onDayPress,
}: WeekAgendaViewProps) {
  const isDark = useColorScheme() === 'dark';

  const {
    selectedDate,
    setSelectedDate,
    firstDayOfWeek,
    showHolidays,
    fontSizeScale,
    hiddenMemberIds,
    memberOrderIds,
    setCalendarView,
  } = useSettingsStore();

  const { presets, shifts, setCurrentMonth } = useShiftStore();
  const { currentUser, groupMembers } = useAuthStore();

  const fontMultiplier =
    fontSizeScale === 'small' ? 0.88 : fontSizeScale === 'large' ? 1.18 : 1.0;

  const [detailItem, setDetailItem] = useState<{
    member: (typeof groupMembers)[0];
    shift: ReturnType<typeof getUserShiftsForDay>[0];
    preset: (typeof presets)[0] | null;
    day: CalendarDay;
  } | null>(null);

  // Active date object
  const activeDateObj = useMemo(() => {
    if (!selectedDate) return new Date();
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }, [selectedDate]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return formatLocalDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // 7 days for the active week
  const weekDays = useMemo(() => {
    return getWeekDays(activeDateObj, firstDayOfWeek, showHolidays);
  }, [activeDateObj, firstDayOfWeek, showHolidays]);

  // Week range label (e.g. 28. 9. – 4. 10. 2026)
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const first = weekDays[0];
    const last = weekDays[6];
    const [, m1, d1] = first.dateStr.split('-').map(Number);
    const [y2, m2, d2] = last.dateStr.split('-').map(Number);

    if (m1 === m2) {
      return `${d1}. – ${d2}. ${m2}. ${y2}`;
    }
    return `${d1}. ${m1}. – ${d2}. ${m2}. ${y2}`;
  }, [weekDays]);

  const isoWeekNumber = useMemo(() => {
    return getIsoWeekNumber(activeDateObj);
  }, [activeDateObj]);

  const isCurrentWeek = useMemo(() => {
    return weekDays.some((d) => d.dateStr === todayStr);
  }, [weekDays, todayStr]);

  // Navigate to previous week
  const handlePrevWeek = () => {
    const prev = new Date(activeDateObj);
    prev.setDate(prev.getDate() - 7);
    const dateStr = formatLocalDate(
      prev.getFullYear(),
      prev.getMonth(),
      prev.getDate()
    );
    setSelectedDate(dateStr);
    setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1));
  };

  // Navigate to next week
  const handleNextWeek = () => {
    const next = new Date(activeDateObj);
    next.setDate(next.getDate() + 7);
    const dateStr = formatLocalDate(
      next.getFullYear(),
      next.getMonth(),
      next.getDate()
    );
    setSelectedDate(dateStr);
    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  // Jump to current week
  const handleJumpCurrentWeek = () => {
    setSelectedDate(todayStr);
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Swipe gesture handling for switching weeks
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 35 && Math.abs(gestureState.dy) < 30,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 50) {
            handlePrevWeek();
          } else if (gestureState.dx < -50) {
            handleNextWeek();
          }
        },
      }),
    [activeDateObj, todayStr]
  );

  // Ordered & visible members
  const orderedMembers = useMemo(() => {
    if (!groupMembers || groupMembers.length === 0) return [];
    if (!memberOrderIds || memberOrderIds.length === 0) return groupMembers;

    return [...groupMembers].sort((a, b) => {
      const idxA = memberOrderIds.indexOf(a.id);
      const idxB = memberOrderIds.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [groupMembers, memberOrderIds]);

  const safeHidden = useMemo(
    () => (Array.isArray(hiddenMemberIds) ? hiddenMemberIds : []),
    [hiddenMemberIds]
  );
  const visibleMembers = useMemo(
    () => orderedMembers.filter((m) => m && m.id && !safeHidden.includes(m.id)),
    [orderedMembers, safeHidden]
  );

  const safeShifts = shifts || {};
  const safePresets = Array.isArray(presets) ? presets : [];

  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    headerBg: isDark ? '#0F172A' : '#FFFFFF',
    todayBorder: '#3B82F6',
  };

  const handleOpenDayDetail = (day: CalendarDay) => {
    setSelectedDate(day.dateStr);
    setCalendarView('day');
  };

  return (
    <View style={[styles.container, { backgroundColor: ui.bg }]} {...panResponder.panHandlers}>
      {/* ─── Week Navigation Header ────────────────────────────────────── */}
      <View style={[styles.headerCard, { backgroundColor: ui.headerBg, borderColor: ui.cardBorder }]}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.arrowBtn, { borderColor: ui.cardBorder }]}
            onPress={handlePrevWeek}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={ui.text} />
          </TouchableOpacity>

          <View style={styles.dateCol}>
            <View style={styles.weekTitleRow}>
              <Text style={[styles.weekRangeText, { color: ui.text, fontSize: Math.round(17 * fontMultiplier) }]}>
                {weekRangeLabel}
              </Text>
            </View>
            <Text style={[styles.weekSubText, { color: ui.textMuted }]}>
              {isoWeekNumber}. týden roku
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.arrowBtn, { borderColor: ui.cardBorder }]}
            onPress={handleNextWeek}
            activeOpacity={0.7}
          >
            <ChevronRight size={22} color={ui.text} />
          </TouchableOpacity>
        </View>

        {!isCurrentWeek && (
          <TouchableOpacity
            style={[styles.todayJumpBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE' }]}
            onPress={handleJumpCurrentWeek}
            activeOpacity={0.8}
          >
            <CalendarIcon size={13} color={ui.accent} />
            <Text style={[styles.todayJumpText, { color: ui.accent }]}>Tento týden</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Vertical 7-Day Agenda Stream ────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {weekDays.map((day) => {
          const isTodayDay = day.dateStr === todayStr;
          const [y, m, d] = day.dateStr.split('-').map(Number);
          const dayDateObj = new Date(y, m - 1, d, 12, 0, 0);
          const dayNameFull = CZECH_DAY_NAMES[dayDateObj.getDay()];
          const dayNameShort = CZECH_DAY_NAMES_SHORT[dayDateObj.getDay()];

          // Check if there is a shared family event on this day
          let sharedPreset: typeof presets[0] | null = null;
          if (visibleMembers.length > 1) {
            const countByPreset: Record<string, number> = {};
            for (const member of visibleMembers) {
              const mShifts = getUserShiftsForDay(safeShifts, member.id, day.dateStr);
              for (const s of mShifts) {
                if (s.shift_preset_id) {
                  countByPreset[s.shift_preset_id] = (countByPreset[s.shift_preset_id] || 0) + 1;
                }
              }
            }
            for (const [presetId, count] of Object.entries(countByPreset)) {
              if (count === visibleMembers.length) {
                sharedPreset = safePresets.find((p) => p && p.id === presetId) || null;
                break;
              }
            }
          }

          return (
            <View
              key={day.dateStr}
              style={[
                styles.dayCard,
                {
                  backgroundColor: ui.card,
                  borderColor: isTodayDay ? ui.todayBorder : ui.cardBorder,
                  borderWidth: isTodayDay ? 2 : 1,
                },
              ]}
            >
              {/* Day Header Bar */}
              <View style={[styles.dayCardHeader, { borderBottomColor: ui.cardBorder }]}>
                <TouchableOpacity
                  style={styles.dayTitleTouch}
                  onPress={() => handleOpenDayDetail(day)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dayNumberPill, isTodayDay && { backgroundColor: ui.accent }]}>
                    <Text
                      style={[
                        styles.dayNumberText,
                        { color: isTodayDay ? '#FFFFFF' : ui.text },
                      ]}
                    >
                      {d}
                    </Text>
                  </View>

                  <View style={{ gap: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.dayNameText,
                          {
                            color: isTodayDay ? ui.accent : ui.text,
                            fontSize: Math.round(15 * fontMultiplier),
                          },
                        ]}
                      >
                        {dayNameFull}
                      </Text>
                      {isTodayDay && (
                        <View style={styles.todayPill}>
                          <Text style={styles.todayPillText}>DNES</Text>
                        </View>
                      )}
                    </View>

                    {day.holidayName ? (
                      <Text style={styles.dayHolidayText}>
                        🇨🇿 {day.holidayName}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                {/* Quick Edit Action */}
                {onEditDay && (
                  <TouchableOpacity
                    style={[styles.quickEditBtn, { borderColor: ui.cardBorder, backgroundColor: isDark ? '#161F33' : '#F1F5F9' }]}
                    onPress={() => onEditDay(day)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={13} color={ui.accent} />
                    <Text style={[styles.quickEditBtnText, { color: ui.accent }]}>Upravit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Shared Family Event Banner */}
              {sharedPreset && (
                <View
                  style={[
                    styles.sharedEventBanner,
                    {
                      backgroundColor: isDark ? `${sharedPreset.color}25` : `${sharedPreset.color}15`,
                      borderLeftColor: sharedPreset.color,
                    },
                  ]}
                >
                  <Users size={14} color={sharedPreset.color} />
                  <Text style={[styles.sharedEventText, { color: sharedPreset.color }]}>
                    Celá rodina: {sharedPreset.title}
                  </Text>
                </View>
              )}

              {/* Members Rows */}
              <View style={styles.membersRowsList}>
                {orderedMembers.map((member) => {
                  const isHidden = safeHidden.includes(member.id);
                  const memberShifts = getUserShiftsForDay(safeShifts, member.id, day.dateStr);
                  const presetsWithShifts = memberShifts
                    .map((s) => ({
                      shift: s,
                      preset: s.shift_preset_id
                        ? safePresets.find((p) => p && p.id === s.shift_preset_id) || null
                        : null,
                    }))
                    .filter((item) => item.preset !== null || (item.shift.note && item.shift.note.trim().length > 0));

                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.memberRow,
                        { opacity: isHidden ? 0.45 : 1 },
                      ]}
                    >
                      {/* Left: Avatar & Name */}
                      <View style={styles.memberLeftInfo}>
                        <View
                          style={[
                            styles.memberAvatarDot,
                            { backgroundColor: isHidden ? '#64748B' : member.color || '#2563EB' },
                          ]}
                        >
                          <Text style={styles.memberAvatarDotText}>
                            {member.display_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.memberRowName,
                            { color: ui.text, fontSize: Math.round(13.5 * fontMultiplier) },
                          ]}
                          numberOfLines={1}
                        >
                          {member.display_name}
                        </Text>
                      </View>

                      {/* Right: Shifts or Off */}
                      <View style={styles.memberRightShifts}>
                        {presetsWithShifts.length > 0 ? (
                          presetsWithShifts.map(({ shift, preset }, sIdx) => {
                            const chipColor = preset?.color || (isDark ? '#93C5FD' : '#2563EB');
                            const chipTitle = preset?.title || 'Poznámka';
                            const numHours = Number(preset?.hours);
                            const hasHours = !isNaN(numHours) && numHours > 0;

                            return (
                              <TouchableOpacity
                                key={`w_shift_${shift.id || preset?.id || sIdx}_${sIdx}`}
                                style={styles.shiftChipGroup}
                                onPress={() => setDetailItem({ member, shift, preset, day })}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={[
                                    styles.shiftChip,
                                    {
                                      backgroundColor: isDark ? `${chipColor}25` : `${chipColor}16`,
                                      borderColor: chipColor,
                                    },
                                  ]}
                                >
                                  {!preset && (
                                    <FileText size={11} color={chipColor} style={{ marginRight: 2 }} />
                                  )}
                                  <Text
                                    style={[
                                      styles.shiftChipTitle,
                                      { color: chipColor, fontSize: Math.round(12.5 * fontMultiplier) },
                                    ]}
                                  >
                                    {chipTitle}
                                  </Text>

                                  {preset?.start_time && preset?.end_time ? (
                                    <Text style={[styles.shiftChipTimes, { color: ui.textMuted }]}>
                                      {preset.start_time}–{preset.end_time}
                                    </Text>
                                  ) : hasHours ? (
                                    <Text style={[styles.shiftChipTimes, { color: ui.textMuted }]}>
                                      {numHours}h
                                    </Text>
                                  ) : null}

                                  {preset && shift.note ? (
                                    <FileText size={10} color={chipColor} style={{ marginLeft: 2 }} />
                                  ) : null}
                                </View>

                                {/* Visible Note Preview Bubble */}
                                {shift.note && shift.note.trim().length > 0 ? (
                                  <View
                                    style={[
                                      styles.weekNotePreview,
                                      {
                                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                                        borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
                                      },
                                    ]}
                                  >
                                    <FileText size={9.5} color={isDark ? '#93C5FD' : '#2563EB'} style={{ marginRight: 3 }} />
                                    <Text
                                      style={[
                                        styles.weekNotePreviewText,
                                        {
                                          color: isDark ? '#E2E8F0' : '#1E293B',
                                          fontSize: Math.round(10.5 * fontMultiplier),
                                        },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {shift.note}
                                    </Text>
                                  </View>
                                ) : null}
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <Text style={[styles.memberOffText, { color: ui.textMuted }]}>
                            Volno
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ─── Shift & Note Detail Modal (Tapped in Week Agenda) ────────── */}
      {detailItem && (
        <Modal
          visible={!!detailItem}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailItem(null)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
            <View style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <CalendarIcon size={18} color={ui.accent} />
                  <Text style={[styles.modalDateText, { color: ui.text }]}>
                    {detailItem.day.dayNumber}. {CZECH_MONTHS_GENITIVE[new Date(detailItem.day.dateStr).getMonth()] || ''} {new Date(detailItem.day.dateStr).getFullYear()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  onPress={() => setDetailItem(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={ui.text} />
                </TouchableOpacity>
              </View>

              {/* Member Row */}
              <View style={styles.modalMemberRow}>
                <View style={[styles.modalAvatarDot, { backgroundColor: detailItem.member.color || '#2563EB' }]}>
                  <Text style={styles.modalAvatarText}>
                    {detailItem.member.display_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.modalMemberName, { color: ui.text }]}>
                  {detailItem.member.display_name} {detailItem.member.id === currentUser?.id ? '(Já)' : ''}
                </Text>
              </View>

              {/* Shift info block */}
              <View
                style={[
                  styles.modalShiftBlock,
                  {
                    backgroundColor: isDark
                      ? `${detailItem.preset?.color || ui.accent}18`
                      : `${detailItem.preset?.color || ui.accent}10`,
                    borderColor: detailItem.preset?.color || ui.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalShiftTitle,
                    { color: detailItem.preset?.color || ui.accent },
                  ]}
                >
                  {detailItem.preset?.title || 'Poznámka'}
                </Text>

                {detailItem.preset?.start_time && detailItem.preset?.end_time ? (
                  <View style={styles.modalShiftTimeRow}>
                    <Clock size={13} color={ui.textMuted} />
                    <Text style={[styles.modalShiftTimeText, { color: ui.textMuted }]}>
                      {detailItem.preset.start_time} – {detailItem.preset.end_time}
                      {Number(detailItem.preset.hours) > 0 ? ` (${Number(detailItem.preset.hours)}h)` : ''}
                    </Text>
                  </View>
                ) : Number(detailItem.preset?.hours) > 0 ? (
                  <View style={styles.modalShiftTimeRow}>
                    <Clock size={13} color={ui.textMuted} />
                    <Text style={[styles.modalShiftTimeText, { color: ui.textMuted }]}>
                      {Number(detailItem.preset?.hours)} h
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Note Content Section */}
              {detailItem.shift.note && detailItem.shift.note.trim().length > 0 ? (
                <View
                  style={[
                    styles.modalNoteSection,
                    {
                      backgroundColor: isDark ? '#161F33' : '#F1F5F9',
                      borderColor: ui.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.modalNoteHeader}>
                    <FileText size={14} color={ui.accent} />
                    <Text style={[styles.modalNoteLabel, { color: ui.accent }]}>Poznámka:</Text>
                  </View>
                  <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                    <Text style={[styles.modalNoteText, { color: ui.text }]} selectable>
                      {detailItem.shift.note}
                    </Text>
                  </ScrollView>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                {onEditDay && (
                  <TouchableOpacity
                    style={[styles.modalEditBtn, { backgroundColor: ui.accent }]}
                    onPress={() => {
                      const d = detailItem.day;
                      setDetailItem(null);
                      onEditDay(d);
                    }}
                    activeOpacity={0.8}
                  >
                    <Edit3 size={15} color="#FFFFFF" />
                    <Text style={styles.modalEditBtnText}>Upravit den</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.modalCloseButton,
                    {
                      borderColor: ui.cardBorder,
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    },
                  ]}
                  onPress={() => setDetailItem(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalCloseButtonText, { color: ui.text }]}>Zavřít</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekRangeText: {
    fontWeight: '800',
  },
  weekSubText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  todayJumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'center',
  },
  todayJumpText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  dayCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dayTitleTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dayNumberPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#64748B20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 15,
    fontWeight: '800',
  },
  dayNameText: {
    fontWeight: '800',
  },
  todayPill: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  dayHolidayText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  quickEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sharedEventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderLeftWidth: 4,
  },
  sharedEventText: {
    fontWeight: '700',
    fontSize: 13,
  },
  membersRowsList: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 10,
  },
  memberLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  memberAvatarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarDotText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  memberRowName: {
    fontWeight: '600',
    flex: 1,
  },
  memberRightShifts: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  shiftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  shiftChipTitle: {
    fontWeight: '700',
  },
  shiftChipTimes: {
    fontSize: 11,
    fontWeight: '500',
  },
  memberOffText: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  shiftChipGroup: {
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 2,
  },
  weekNotePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 160,
  },
  weekNotePreviewText: {
    fontWeight: '500',
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalDateText: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalAvatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalMemberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalShiftBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  modalShiftTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalShiftTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalShiftTimeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalNoteSection: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  modalNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalNoteLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalNoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  modalEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalEditBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
