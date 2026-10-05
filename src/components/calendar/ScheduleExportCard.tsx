import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Calendar,
  Clock,
  FileText,
  Users,
  CalendarDays,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore, getUserShiftsForDay } from '@/store/useShiftStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getCzechHoliday, formatLocalDate } from '@/utils/calendarUtils';
import type { ShareConfig, ShareRangeType } from './ShareScheduleModal';

export interface ScheduleExportCardProps {
  config: ShareConfig;
  currentDate?: Date;
}

const CZECH_DAYS_LONG = [
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

const CZECH_MONTHS_NOMINATIVE = [
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

interface ExportDayItem {
  dateStr: string;
  dayNumber: number;
  dayOfWeekName: string;
  fullCzechDate: string;
  isWeekend: boolean;
  holidayName: string | null;
}

function computeDays(rangeType: ShareRangeType, baseDate: Date): ExportDayItem[] {
  const safe = baseDate instanceof Date && !isNaN(baseDate.getTime()) ? baseDate : new Date();
  const days: ExportDayItem[] = [];

  if (rangeType === 'current_week' || rangeType === 'next_week') {
    const monday = new Date(safe.getFullYear(), safe.getMonth(), safe.getDate(), 12, 0, 0);
    const dayOfWeek = (monday.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const offset = rangeType === 'next_week' ? (7 - dayOfWeek) : -dayOfWeek;
    monday.setDate(monday.getDate() + offset);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const dayNum = d.getDate();
      const dateStr = formatLocalDate(y, m, dayNum);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      days.push({
        dateStr,
        dayNumber: dayNum,
        dayOfWeekName: CZECH_DAYS_LONG[d.getDay()],
        fullCzechDate: `${dayNum}. ${CZECH_MONTHS_GENITIVE[m]} ${y}`,
        isWeekend,
        holidayName: getCzechHoliday(dateStr),
      });
    }
  } else {
    // Current month
    const year = safe.getFullYear();
    const month = safe.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum, 12, 0, 0);
      const dateStr = formatLocalDate(year, month, dayNum);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      days.push({
        dateStr,
        dayNumber: dayNum,
        dayOfWeekName: CZECH_DAYS_LONG[d.getDay()],
        fullCzechDate: `${dayNum}. ${CZECH_MONTHS_GENITIVE[month]} ${year}`,
        isWeekend,
        holidayName: getCzechHoliday(dateStr),
      });
    }
  }

  return days;
}

export const ScheduleExportCard = forwardRef<View, ScheduleExportCardProps>(
  ({ config, currentDate = new Date() }, ref) => {
    const { groupMembers, currentGroup } = useAuthStore();
    const { shifts, presets } = useShiftStore();
    const { hiddenMemberIds } = useSettingsStore();

    const isAllFamily = config.targetUserId === '__ALL__';
    const activeMembers = (groupMembers || []).filter(
      (m) => isAllFamily ? !hiddenMemberIds.includes(m.id) : m.id === config.targetUserId
    );

    const targetMember = !isAllFamily
      ? groupMembers.find((m) => m.id === config.targetUserId)
      : null;

    const days = computeDays(config.rangeType, currentDate);

    // Compute title & header range subtitle
    let mainTitle = 'TÝDENNÍ ROZPIS SMĚN';
    let subtitle = '';

    if (config.rangeType === 'current_week') {
      mainTitle = 'ROZPIS SMĚN NA TENTO TÝDEN';
      if (days.length >= 7) {
        subtitle = `${days[0].fullCzechDate} – ${days[6].fullCzechDate}`;
      }
    } else if (config.rangeType === 'next_week') {
      mainTitle = 'ROZPIS SMĚN NA PŘÍŠTÍ TÝDEN';
      if (days.length >= 7) {
        subtitle = `${days[0].fullCzechDate} – ${days[6].fullCzechDate}`;
      }
    } else {
      const monthIdx = currentDate.getMonth();
      const year = currentDate.getFullYear();
      mainTitle = `MĚSÍČNÍ ROZPIS SMĚN • ${CZECH_MONTHS_NOMINATIVE[monthIdx].toUpperCase()} ${year}`;
      subtitle = `Kompletní přehled (${days.length} dnů)`;
    }

    return (
      <View ref={ref} style={styles.cardContainer} collapsable={false}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogoBox}>
              <Calendar size={18} color="#38BDF8" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.brandAppName}>Shift Calendar</Text>
              <Text style={styles.brandGroupTitle}>
                {currentGroup?.name || 'Rodinný kalendář'}
              </Text>
            </View>
          </View>

          {/* Member Badge in Header */}
          <View style={styles.memberHeaderPill}>
            {isAllFamily ? (
              <Users size={14} color="#C4B5FD" />
            ) : (
              <View
                style={[
                  styles.miniAvatar,
                  { backgroundColor: targetMember?.color || '#3B82F6' },
                ]}
              >
                <Text style={styles.miniAvatarText}>
                  {targetMember?.display_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <Text style={styles.memberHeaderPillText}>
              {isAllFamily ? 'Celá rodina' : targetMember?.display_name || 'Člen'}
            </Text>
          </View>
        </View>

        {/* Title & Subtitle Banner */}
        <View style={styles.titleBanner}>
          <Text style={styles.mainTitleText}>{mainTitle}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>

        {/* Days List */}
        <View style={styles.daysList}>
          {days.map((day) => {
            return (
              <View
                key={day.dateStr}
                style={[
                  styles.dayRow,
                  day.isWeekend && styles.dayRowWeekend,
                  day.holidayName && styles.dayRowHoliday,
                ]}
              >
                {/* Left Date Column */}
                <View style={styles.dateCol}>
                  <Text
                    style={[
                      styles.dayOfWeekText,
                      day.isWeekend && styles.dayOfWeekWeekend,
                      day.holidayName && styles.dayOfWeekHoliday,
                    ]}
                  >
                    {day.dayOfWeekName}
                  </Text>
                  <Text style={styles.dayDateNumberText}>
                    {day.dayNumber}. {CZECH_MONTHS_GENITIVE[Number(day.dateStr.split('-')[1]) - 1]}
                  </Text>

                  {day.holidayName && (
                    <View style={styles.holidayBadge}>
                      <Text style={styles.holidayBadgeText} numberOfLines={1}>
                        🇨🇿 {day.holidayName}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Right Shifts Column */}
                <View style={styles.shiftsCol}>
                  {activeMembers.map((member) => {
                    const memberShifts = getUserShiftsForDay(shifts, member.id, day.dateStr);
                    const shiftsWithPreset = memberShifts.map((s) => ({
                      shift: s,
                      preset: s.shift_preset_id
                        ? presets.find((p) => p.id === s.shift_preset_id)
                        : null,
                    }));

                    const hasShifts = shiftsWithPreset.length > 0;

                    return (
                      <View key={`${day.dateStr}_${member.id}`} style={styles.memberShiftLine}>
                        {isAllFamily && (
                          <View style={styles.memberNameTag}>
                            <View
                              style={[
                                styles.memberDot,
                                { backgroundColor: member.color || '#3B82F6' },
                              ]}
                            />
                            <Text style={styles.memberNameTagText} numberOfLines={1}>
                              {member.display_name}
                            </Text>
                          </View>
                        )}

                        {hasShifts ? (
                          <View style={styles.shiftBadgesGroup}>
                            {shiftsWithPreset.map(({ shift, preset }, sIdx) => {
                              const badgeColor = preset?.color || '#38BDF8';
                              const numHours = Number(preset?.hours);
                              const hasHours = !isNaN(numHours) && numHours > 0;

                              return (
                                <View key={`s_${sIdx}`} style={styles.singleShiftWrapper}>
                                  <View
                                    style={[
                                      styles.shiftPill,
                                      {
                                        backgroundColor: `${badgeColor}22`,
                                        borderColor: badgeColor,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[styles.shiftPillTitle, { color: badgeColor }]}
                                    >
                                      {preset?.title || 'Poznámka'}
                                    </Text>
                                    {preset?.start_time && preset?.end_time ? (
                                      <Text style={styles.shiftPillTimes}>
                                        {preset.start_time} – {preset.end_time}
                                        {hasHours ? ` (${numHours}h)` : ''}
                                      </Text>
                                    ) : hasHours ? (
                                      <Text style={styles.shiftPillTimes}>
                                        {numHours}h
                                      </Text>
                                    ) : null}
                                  </View>

                                  {/* Optional Note Display */}
                                  {config.includeNotes && shift.note && shift.note.trim().length > 0 && (
                                    <View style={styles.noteBox}>
                                      <FileText size={11} color="#F59E0B" />
                                      <Text style={styles.noteBoxText}>{shift.note}</Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={styles.noShiftBadgeText}>— Volno —</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer info */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>
            Vytvořeno v rodinné aplikaci Shift Calendar pro babičku a rodinu
          </Text>
        </View>
      </View>
    );
  }
);

ScheduleExportCard.displayName = 'ScheduleExportCard';

const styles = StyleSheet.create({
  cardContainer: {
    width: 480,
    backgroundColor: '#0F172A', // High contrast navy blue
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0369A1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAppName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandGroupTitle: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '500',
  },
  memberHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  memberHeaderPillText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  titleBanner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  mainTitleText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  daysList: {
    paddingTop: 10,
    gap: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161F33',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dayRowWeekend: {
    backgroundColor: '#17203A',
    borderColor: '#253352',
  },
  dayRowHoliday: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  dateCol: {
    width: 130,
    paddingRight: 8,
  },
  dayOfWeekText: {
    color: '#F1F5F9',
    fontSize: 13.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dayOfWeekWeekend: {
    color: '#F43F5E',
  },
  dayOfWeekHoliday: {
    color: '#F87171',
  },
  dayDateNumberText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  holidayBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  holidayBadgeText: {
    color: '#FCA5A5',
    fontSize: 9.5,
    fontWeight: '700',
  },
  shiftsCol: {
    flex: 1,
    gap: 6,
  },
  memberShiftLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberNameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: 80,
  },
  memberDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  memberNameTagText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '700',
  },
  shiftBadgesGroup: {
    flex: 1,
    gap: 4,
  },
  singleShiftWrapper: {
    gap: 3,
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  shiftPillTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  shiftPillTimes: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  noteBoxText: {
    color: '#FDE68A',
    fontSize: 10.5,
    fontWeight: '600',
    flex: 1,
  },
  noShiftBadgeText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    alignItems: 'center',
  },
  cardFooterText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
  },
});
