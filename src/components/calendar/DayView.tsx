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
  Clock,
  FileText,
  Calendar as CalendarIcon,
  Sparkles,
  Edit3,
  X,
} from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useShiftStore, getUserShiftsForDay } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  formatLocalDate,
  getCzechHoliday,
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

interface DayViewProps {
  onEditDay?: (day: CalendarDay) => void;
  onMakeShiftForWholeFamily?: (presetId: string, dateStr: string, note?: string | null) => void;
}

export default function DayView({
  onEditDay,
  onMakeShiftForWholeFamily,
}: DayViewProps) {
  const isDark = useColorScheme() === 'dark';

  const {
    selectedDate,
    setSelectedDate,
    fontSizeScale,
    hiddenMemberIds,
    memberOrderIds,
    showHolidays,
  } = useSettingsStore();

  const { presets, shifts, setCurrentMonth } = useShiftStore();
  const { currentUser, groupMembers } = useAuthStore();

  const fontMultiplier =
    fontSizeScale === 'small' ? 0.88 : fontSizeScale === 'large' ? 1.18 : 1.0;

  const [selectedShiftDetail, setSelectedShiftDetail] = useState<{
    member: (typeof groupMembers)[0];
    shift: ReturnType<typeof getUserShiftsForDay>[0];
    preset: (typeof presets)[0] | null;
  } | null>(null);

  // Parse active date
  const activeDateObj = useMemo(() => {
    if (!selectedDate) return new Date();
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }, [selectedDate]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return formatLocalDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const isToday = selectedDate === todayStr;

  // Relative label: Dnes, Zítra, Včera or empty
  const relativeDayLabel = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const target = new Date(activeDateObj);
    target.setHours(12, 0, 0, 0);
    const diffDays = Math.round(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Dnes';
    if (diffDays === 1) return 'Zítra';
    if (diffDays === -1) return 'Včera';
    return null;
  }, [activeDateObj]);

  const holidayName = useMemo(() => {
    if (!showHolidays || !selectedDate) return null;
    return getCzechHoliday(selectedDate);
  }, [selectedDate, showHolidays]);

  // Navigate to previous day
  const handlePrevDay = () => {
    const prev = new Date(activeDateObj);
    prev.setDate(prev.getDate() - 1);
    const dateStr = formatLocalDate(
      prev.getFullYear(),
      prev.getMonth(),
      prev.getDate()
    );
    setSelectedDate(dateStr);
    setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1));
  };

  // Navigate to next day
  const handleNextDay = () => {
    const next = new Date(activeDateObj);
    next.setDate(next.getDate() + 1);
    const dateStr = formatLocalDate(
      next.getFullYear(),
      next.getMonth(),
      next.getDate()
    );
    setSelectedDate(dateStr);
    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  // Jump to today
  const handleJumpToday = () => {
    setSelectedDate(todayStr);
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Swipe gesture handling for fluid navigation between days
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 30,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 50) {
            handlePrevDay();
          } else if (gestureState.dx < -50) {
            handleNextDay();
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

  // Check for shared family event
  const sharedFamilyPreset = useMemo(() => {
    if (!visibleMembers.length || visibleMembers.length <= 1) return null;
    const safeShifts = shifts || {};
    const safePresets = Array.isArray(presets) ? presets : [];

    // Count presets across visible members
    const countByPreset: Record<string, number> = {};
    for (const member of visibleMembers) {
      const mShifts = getUserShiftsForDay(safeShifts, member.id, selectedDate);
      for (const s of mShifts) {
        if (s.shift_preset_id) {
          countByPreset[s.shift_preset_id] =
            (countByPreset[s.shift_preset_id] || 0) + 1;
        }
      }
    }

    for (const [presetId, count] of Object.entries(countByPreset)) {
      if (count === visibleMembers.length) {
        return safePresets.find((p) => p && p.id === presetId) || null;
      }
    }
    return null;
  }, [visibleMembers, shifts, selectedDate, presets]);

  // CalendarDay representation for edit modal trigger
  const currentCalendarDay: CalendarDay = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dayOfWeek = activeDateObj.getDay();
    return {
      dateStr: selectedDate,
      dayNumber: d,
      isCurrentMonth: true,
      isToday,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayOfWeek,
      holidayName,
    };
  }, [selectedDate, activeDateObj, isToday, holidayName]);

  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    headerBg: isDark ? '#0F172A' : '#FFFFFF',
  };

  const dayOfWeekName = CZECH_DAY_NAMES[activeDateObj.getDay()];
  const dayNumber = activeDateObj.getDate();
  const monthNameGenitive = CZECH_MONTHS_GENITIVE[activeDateObj.getMonth()];
  const year = activeDateObj.getFullYear();

  return (
    <View style={[styles.container, { backgroundColor: ui.bg }]} {...panResponder.panHandlers}>
      {/* ─── Day Navigation Header ────────────────────────────────────── */}
      <View style={[styles.headerCard, { backgroundColor: ui.headerBg, borderColor: ui.cardBorder }]}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.arrowBtn, { borderColor: ui.cardBorder }]}
            onPress={handlePrevDay}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={ui.text} />
          </TouchableOpacity>

          <View style={styles.dateCol}>
            <View style={styles.dateTitleRow}>
              {relativeDayLabel ? (
                <View style={[styles.relativeBadge, isToday && styles.todayRelativeBadge]}>
                  <Text style={[styles.relativeBadgeText, isToday && styles.todayRelativeBadgeText]}>
                    {relativeDayLabel}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.weekdayText, { color: ui.text, fontSize: Math.round(18 * fontMultiplier) }]}>
                {dayOfWeekName}
              </Text>
            </View>

            <Text style={[styles.dateSubText, { color: ui.textMuted, fontSize: Math.round(14 * fontMultiplier) }]}>
              {dayNumber}. {monthNameGenitive} {year}
            </Text>

            {holidayName ? (
              <View style={styles.holidayBadge}>
                <Text style={styles.holidayText}>🇨🇿 {holidayName}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.arrowBtn, { borderColor: ui.cardBorder }]}
            onPress={handleNextDay}
            activeOpacity={0.7}
          >
            <ChevronRight size={22} color={ui.text} />
          </TouchableOpacity>
        </View>

        {!isToday && (
          <TouchableOpacity
            style={[styles.todayJumpBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE' }]}
            onPress={handleJumpToday}
            activeOpacity={0.8}
          >
            <CalendarIcon size={13} color={ui.accent} />
            <Text style={[styles.todayJumpText, { color: ui.accent }]}>Skočit na dnešek</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Scrollable Day Body ────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shared Family Event Banner */}
        {sharedFamilyPreset && (
          <View
            style={[
              styles.familyBanner,
              {
                backgroundColor: isDark ? `${sharedFamilyPreset.color}25` : `${sharedFamilyPreset.color}15`,
                borderColor: sharedFamilyPreset.color,
              },
            ]}
          >
            <View style={[styles.familyBannerIcon, { backgroundColor: sharedFamilyPreset.color }]}>
              <Users size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.familyBannerTitle, { color: sharedFamilyPreset.color, fontSize: Math.round(15 * fontMultiplier) }]}>
                Společná akce: {sharedFamilyPreset.title}
              </Text>
              <Text style={[styles.familyBannerSub, { color: ui.textMuted }]}>
                Tato událost platí pro celou rodinu
              </Text>
            </View>
          </View>
        )}

        {/* Members Cards List */}
        <View style={styles.membersList}>
          {orderedMembers.map((member) => {
            const isHidden = safeHidden.includes(member.id);
            const memberShifts = getUserShiftsForDay(shifts, member.id, selectedDate);
            const presetsWithShifts = memberShifts
              .map((s) => ({
                shift: s,
                preset: s.shift_preset_id
                  ? presets.find((p) => p && p.id === s.shift_preset_id) || null
                  : null,
              }))
              .filter((item) => item.preset !== null || (item.shift.note && item.shift.note.trim().length > 0));

            return (
              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: ui.card,
                    borderColor: ui.cardBorder,
                    opacity: isHidden ? 0.6 : 1,
                  },
                ]}
              >
                {/* Member Header */}
                <View style={styles.memberCardHeader}>
                  <View style={styles.memberAvatarRow}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: isHidden ? '#64748B' : member.color || '#2563EB' },
                      ]}
                    >
                      <Text style={styles.avatarInitial}>
                        {member.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.memberName,
                          {
                            color: ui.text,
                            fontSize: Math.round(16 * fontMultiplier),
                          },
                        ]}
                      >
                        {member.display_name} {member.id === currentUser?.id ? '(Já)' : ''}
                      </Text>
                      {isHidden && (
                        <Text style={[styles.hiddenBadge, { color: ui.textMuted }]}>
                          (v kalendáři skryt)
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Shifts Count Pill */}
                  {presetsWithShifts.length > 0 ? (
                    <View
                      style={[
                        styles.shiftCountPill,
                        {
                          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                          borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                        },
                      ]}
                    >
                      <Clock size={11} color={ui.accent} />
                      <Text style={[styles.shiftCountText, { color: ui.accent }]}>
                        {presetsWithShifts.length}{' '}
                        {presetsWithShifts.length === 1 ? 'směna/akce' : 'směny/akce'}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Member Shifts List */}
                {presetsWithShifts.length > 0 ? (
                  <View style={styles.shiftsContainer}>
                    {presetsWithShifts.map(({ shift, preset }, sIdx) => {
                      const cardColor = preset?.color || (isDark ? '#93C5FD' : '#2563EB');
                      const cardTitle = preset?.title || 'Poznámka';
                      const numHours = Number(preset?.hours);
                      const hasHours = !isNaN(numHours) && numHours > 0;

                      return (
                        <TouchableOpacity
                          key={`m_shift_${shift.id || preset?.id || sIdx}_${sIdx}`}
                          style={[
                            styles.shiftItemCard,
                            {
                              backgroundColor: isDark ? `${cardColor}18` : `${cardColor}10`,
                              borderLeftColor: cardColor,
                            },
                          ]}
                          onPress={() => setSelectedShiftDetail({ member, shift, preset })}
                          activeOpacity={0.75}
                        >
                          <View style={styles.shiftMainRow}>
                            <View style={{ flex: 1, gap: 3 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {!preset && (
                                  <FileText size={13} color={cardColor} />
                                )}
                                <Text
                                  style={[
                                    styles.shiftTitleText,
                                    { color: cardColor, fontSize: Math.round(15 * fontMultiplier) },
                                  ]}
                                >
                                  {cardTitle}
                                </Text>
                              </View>

                              {preset?.start_time && preset?.end_time ? (
                                <Text style={[styles.shiftTimeText, { color: ui.textMuted }]}>
                                  🕒 {preset.start_time} – {preset.end_time}
                                  {hasHours ? ` (${numHours}h)` : ''}
                                </Text>
                              ) : hasHours ? (
                                <Text style={[styles.shiftTimeText, { color: ui.textMuted }]}>
                                  🕒 {numHours} {numHours === 1 ? 'hodina' : numHours >= 2 && numHours <= 4 ? 'hodiny' : 'hodin'}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          {/* Shift Note */}
                          {shift?.note && shift.note.trim().length > 0 && (
                            <View
                              style={[
                                styles.noteBubble,
                                {
                                  backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
                                  borderColor: ui.cardBorder,
                                },
                              ]}
                            >
                              <FileText size={12} color={cardColor} />
                              <Text style={[styles.noteText, { color: ui.text }]} numberOfLines={2}>
                                {shift.note}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noShiftRow}>
                    <View style={styles.offDot} />
                    <Text style={[styles.noShiftText, { color: ui.textMuted }]}>
                      Volno / žádná směna
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ─── Bottom Actions ─────────────────────────────────────────── */}
        {onEditDay && (
          <View style={styles.bottomActionsRow}>
            <TouchableOpacity
              style={[styles.editDayBtn, { backgroundColor: ui.accent }]}
              onPress={() => onEditDay(currentCalendarDay)}
              activeOpacity={0.8}
            >
              <Edit3 size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.editDayBtnText}>
                Upravit směny pro tento den
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ─── Shift & Note Detail Modal (Tapped in Day View) ────────── */}
      {selectedShiftDetail && (
        <Modal
          visible={!!selectedShiftDetail}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedShiftDetail(null)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
            <View style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <CalendarIcon size={18} color={ui.accent} />
                  <Text style={[styles.modalDateText, { color: ui.text }]}>
                    {dayNumber}. {monthNameGenitive} {year}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  onPress={() => setSelectedShiftDetail(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={ui.text} />
                </TouchableOpacity>
              </View>

              {/* Member Row */}
              <View style={styles.modalMemberRow}>
                <View style={[styles.modalAvatarDot, { backgroundColor: selectedShiftDetail.member.color || '#2563EB' }]}>
                  <Text style={styles.modalAvatarText}>
                    {selectedShiftDetail.member.display_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.modalMemberName, { color: ui.text }]}>
                  {selectedShiftDetail.member.display_name} {selectedShiftDetail.member.id === currentUser?.id ? '(Já)' : ''}
                </Text>
              </View>

              {/* Shift info block */}
              <View
                style={[
                  styles.modalShiftBlock,
                  {
                    backgroundColor: isDark
                      ? `${selectedShiftDetail.preset?.color || ui.accent}18`
                      : `${selectedShiftDetail.preset?.color || ui.accent}10`,
                    borderColor: selectedShiftDetail.preset?.color || ui.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalShiftTitle,
                    { color: selectedShiftDetail.preset?.color || ui.accent },
                  ]}
                >
                  {selectedShiftDetail.preset?.title || 'Poznámka'}
                </Text>

                {selectedShiftDetail.preset?.start_time && selectedShiftDetail.preset?.end_time ? (
                  <View style={styles.modalShiftTimeRow}>
                    <Clock size={13} color={ui.textMuted} />
                    <Text style={[styles.modalShiftTimeText, { color: ui.textMuted }]}>
                      {selectedShiftDetail.preset.start_time} – {selectedShiftDetail.preset.end_time}
                      {Number(selectedShiftDetail.preset.hours) > 0 ? ` (${Number(selectedShiftDetail.preset.hours)}h)` : ''}
                    </Text>
                  </View>
                ) : Number(selectedShiftDetail.preset?.hours) > 0 ? (
                  <View style={styles.modalShiftTimeRow}>
                    <Clock size={13} color={ui.textMuted} />
                    <Text style={[styles.modalShiftTimeText, { color: ui.textMuted }]}>
                      {Number(selectedShiftDetail.preset?.hours)} {Number(selectedShiftDetail.preset?.hours) === 1 ? 'hodina' : Number(selectedShiftDetail.preset?.hours) >= 2 && Number(selectedShiftDetail.preset?.hours) <= 4 ? 'hodiny' : 'hodin'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Note Content Section */}
              {selectedShiftDetail.shift.note && selectedShiftDetail.shift.note.trim().length > 0 ? (
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
                      {selectedShiftDetail.shift.note}
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
                      setSelectedShiftDetail(null);
                      onEditDay(currentCalendarDay);
                    }}
                    activeOpacity={0.8}
                  >
                    <Edit3 size={15} color="#FFFFFF" />
                    <Text style={styles.modalEditBtnText}>Upravit směnu</Text>
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
                  onPress={() => setSelectedShiftDetail(null)}
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
  dateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relativeBadge: {
    backgroundColor: '#64748B25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  relativeBadgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  todayRelativeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  todayRelativeBadgeText: {
    color: '#3B82F6',
  },
  weekdayText: {
    fontWeight: '800',
  },
  dateSubText: {
    fontWeight: '500',
  },
  holidayBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  holidayText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '600',
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
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  familyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  familyBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyBannerTitle: {
    fontWeight: '800',
  },
  familyBannerSub: {
    fontSize: 12,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  memberName: {
    fontWeight: '700',
  },
  hiddenBadge: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  shiftCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  shiftCountText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  shiftsContainer: {
    gap: 8,
  },
  shiftItemCard: {
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 10,
    gap: 6,
  },
  shiftMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  shiftTitleText: {
    fontWeight: '800',
  },
  shiftTimeText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  quickFamilyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickFamilyActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  noteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  noShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  offDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  noShiftText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bottomActionsRow: {
    marginTop: 8,
  },
  editDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  editDayBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
