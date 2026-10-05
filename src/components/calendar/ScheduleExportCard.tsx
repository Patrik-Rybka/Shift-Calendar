import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Calendar,
  Clock,
  FileText,
  Users,
  CalendarDays,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore, getUserShiftsForDay } from '@/store/useShiftStore';
import { getCzechHoliday, formatLocalDate, generateMonthDays, CalendarDay } from '@/utils/calendarUtils';
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

const CZECH_DAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

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

function computeWeekDays(rangeType: 'current_week' | 'next_week', baseDate: Date): ExportDayItem[] {
  const safe = baseDate instanceof Date && !isNaN(baseDate.getTime()) ? baseDate : new Date();
  const days: ExportDayItem[] = [];

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

  return days;
}

export const ScheduleExportCard = forwardRef<View, ScheduleExportCardProps>(
  ({ config, currentDate = new Date() }, ref) => {
    const { groupMembers, currentGroup } = useAuthStore();
    const { shifts, presets } = useShiftStore();

    // Filter to ONLY selected members (e.g. if Dad selects only Hanka, only Hanka will be included!)
    const activeMembers = (groupMembers || []).filter((m) =>
      config.selectedMemberIds && config.selectedMemberIds.length > 0
        ? config.selectedMemberIds.includes(m.id)
        : true
    );

    const isAllMembers = activeMembers.length === (groupMembers || []).length;
    const isSingleMember = activeMembers.length === 1;

    // Header Member badge text
    let memberBadgeText = 'Celá rodina';
    if (isSingleMember) {
      memberBadgeText = activeMembers[0].display_name;
    } else if (!isAllMembers) {
      memberBadgeText = activeMembers.map((m) => m.display_name).join(' & ');
    } else {
      memberBadgeText = `Celá rodina (${activeMembers.length})`;
    }

    const isMonthView = config.rangeType === 'current_month';

    // -------------------------------------------------------------
    // 1. MONTH VIEW (CALENDAR POSTER WITH NOTES UNDER TABLE)
    // -------------------------------------------------------------
    if (isMonthView) {
      const safe = currentDate instanceof Date && !isNaN(currentDate.getTime()) ? currentDate : new Date();
      const monthIdx = safe.getMonth();
      const year = safe.getFullYear();
      const monthName = CZECH_MONTHS_NOMINATIVE[monthIdx];
      const monthDays = generateMonthDays(safe, 'monday', true);

      // Group days into 7-day week chunks
      const weekRows: CalendarDay[][] = [];
      for (let i = 0; i < monthDays.length; i += 7) {
        weekRows.push(monthDays.slice(i, i + 7));
      }

      // Collect all notes in the month for active (selected) members only
      const monthNotesList: {
        dateStr: string;
        dayNumber: number;
        dayOfWeekName: string;
        member: (typeof activeMembers)[0];
        note: string;
      }[] = [];

      if (config.includeNotes) {
        for (const cell of monthDays) {
          if (!cell.isCurrentMonth) continue;
          for (const m of activeMembers) {
            const mShifts = getUserShiftsForDay(shifts, m.id, cell.dateStr);
            for (const s of mShifts) {
              if (s.note && s.note.trim().length > 0) {
                monthNotesList.push({
                  dateStr: cell.dateStr,
                  dayNumber: cell.dayNumber,
                  dayOfWeekName: CZECH_DAYS_SHORT[cell.dayOfWeek],
                  member: m,
                  note: s.note.trim(),
                });
              }
            }
          }
        }
      }

      return (
        <View ref={ref} style={styles.monthCardContainer} collapsable={false}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <Calendar size={20} color="#38BDF8" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.brandAppName}>Shift Calendar</Text>
                <Text style={styles.brandGroupTitle}>
                  {currentGroup?.name || 'Rodinný plánovač'}
                </Text>
              </View>
            </View>

            {/* Member Badge in Header */}
            <View style={styles.memberHeaderPill}>
              {isSingleMember ? (
                <View
                  style={[
                    styles.miniAvatar,
                    { backgroundColor: activeMembers[0]?.color || '#3B82F6' },
                  ]}
                >
                  <Text style={styles.miniAvatarText}>
                    {activeMembers[0]?.display_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              ) : (
                <Users size={15} color="#C4B5FD" />
              )}
              <Text style={styles.memberHeaderPillText} numberOfLines={1}>
                {memberBadgeText}
              </Text>
            </View>
          </View>

          {/* Banner Title */}
          <View style={styles.monthTitleBanner}>
            <Text style={styles.monthBannerTitleText}>
              {monthName.toUpperCase()} {year}
            </Text>
            <Text style={styles.monthBannerSubText}>
              Měsíční rozpis směn • {activeMembers.length}{' '}
              {activeMembers.length === 1 ? 'osoba' : activeMembers.length < 5 ? 'osoby' : 'osob'}
            </Text>
          </View>

          {/* 7 Column Weekday Header */}
          <View style={styles.monthGridHeaderRow}>
            {CZECH_DAYS_SHORT.map((dayName, idx) => {
              const isWeekend = idx >= 5;
              return (
                <View
                  key={dayName}
                  style={[
                    styles.monthGridHeaderCell,
                    isWeekend && styles.monthGridHeaderCellWeekend,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthGridHeaderText,
                      isWeekend && styles.monthGridHeaderTextWeekend,
                    ]}
                  >
                    {dayName}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Calendar Grid Matrix */}
          <View style={styles.monthGridMatrix}>
            {weekRows.map((week, wIdx) => (
              <View key={`week_${wIdx}`} style={styles.monthWeekRow}>
                {week.map((cell) => {
                  const dayShiftsByMember = activeMembers.map((m) => {
                    const shiftsForDay = getUserShiftsForDay(shifts, m.id, cell.dateStr).filter((s) => {
                      if (!config.includeNotes && !s.shift_preset_id) return false;
                      return true;
                    });
                    return {
                      member: m,
                      shifts: shiftsForDay.map((s) => ({
                        shift: s,
                        preset: s.shift_preset_id
                          ? presets.find((p) => p.id === s.shift_preset_id)
                          : null,
                      })),
                    };
                  });

                  const hasAnyShifts = dayShiftsByMember.some((item) => item.shifts.length > 0);

                  return (
                    <View
                      key={cell.dateStr}
                      style={[
                        styles.monthCell,
                        !cell.isCurrentMonth && styles.monthCellOtherMonth,
                        cell.isWeekend && cell.isCurrentMonth && styles.monthCellWeekend,
                        cell.holidayName && styles.monthCellHoliday,
                      ]}
                    >
                      {/* Cell Header: Day Number & Holiday */}
                      <View style={styles.monthCellTop}>
                        <Text
                          style={[
                            styles.monthCellDayNumber,
                            !cell.isCurrentMonth && styles.monthCellDayNumberDim,
                            cell.isWeekend && cell.isCurrentMonth && styles.monthCellDayNumberWeekend,
                            cell.holidayName && styles.monthCellDayNumberHoliday,
                          ]}
                        >
                          {cell.dayNumber}
                        </Text>
                      </View>

                      {cell.holidayName && cell.isCurrentMonth && (
                        <Text style={styles.monthCellHolidayText} numberOfLines={1}>
                          🇨🇿 {cell.holidayName}
                        </Text>
                      )}

                      {/* Shifts in this Day Cell */}
                      <View style={styles.monthCellShiftsArea}>
                        {cell.isCurrentMonth && hasAnyShifts && (
                          dayShiftsByMember.map(({ member, shifts: mShifts }) => {
                            if (mShifts.length === 0) return null;
                            return mShifts.map(({ shift, preset }, sIdx) => {
                              const badgeColor = preset?.color || member.color || '#38BDF8';
                              return (
                                <View
                                  key={`ms_${member.id}_${sIdx}`}
                                  style={[
                                    styles.monthShiftMiniBadge,
                                    { backgroundColor: `${badgeColor}25`, borderColor: badgeColor },
                                  ]}
                                >
                                  {!isSingleMember && (
                                    <View
                                      style={[
                                        styles.memberMiniDot,
                                        { backgroundColor: member.color || '#38BDF8' },
                                      ]}
                                    />
                                  )}
                                  <Text
                                    style={[styles.monthShiftMiniText, { color: badgeColor }]}
                                    numberOfLines={1}
                                  >
                                    {!isSingleMember ? `${member.display_name.charAt(0)}: ` : ''}
                                    {preset?.title || (shift.note ? 'Pozn.' : 'Směna')}
                                  </Text>
                                  {config.includeNotes && shift.note && (
                                    <FileText size={8} color="#F59E0B" style={{ marginLeft: 1 }} />
                                  )}
                                </View>
                              );
                            });
                          })
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Month Notes Section (Placed UNDER table so it's 100% readable and grid stays clean!) */}
          {config.includeNotes && monthNotesList.length > 0 && (
            <View style={styles.monthNotesSection}>
              <View style={styles.monthNotesHeader}>
                <FileText size={15} color="#F59E0B" />
                <Text style={styles.monthNotesTitle}>
                  POZNÁMKY K MĚSÍCI ({monthNotesList.length})
                </Text>
              </View>

              <View style={styles.monthNotesGrid}>
                {monthNotesList.map((item, idx) => (
                  <View key={`mnote_${idx}`} style={styles.monthNoteCard}>
                    <View style={styles.monthNoteDateRow}>
                      <Text style={styles.monthNoteDateText}>
                        {item.dayNumber}. {item.dayOfWeekName}
                      </Text>
                      {!isSingleMember && (
                        <View style={styles.monthNoteMemberTag}>
                          <View
                            style={[
                              styles.memberMiniDot,
                              { backgroundColor: item.member.color || '#38BDF8' },
                            ]}
                          />
                          <Text style={styles.monthNoteMemberName}>
                            {item.member.display_name}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.monthNoteContentText}>{item.note}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Footer info */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>
              Vytvořeno v rodinné aplikaci Shift Calendar pro babičku a rodinu
            </Text>
          </View>
        </View>
      );
    }

    // -------------------------------------------------------------
    // 2. WEEK VIEW (CLEAN 7-DAY LIST FOR SELECTED MEMBERS)
    // -------------------------------------------------------------
    const weekRange = config.rangeType === 'next_week' ? 'next_week' : 'current_week';
    const days = computeWeekDays(weekRange, currentDate);
    let mainTitle = 'ROZPIS SMĚN NA TENTO TÝDEN';
    let subtitle = '';

    if (config.rangeType === 'current_week') {
      mainTitle = 'ROZPIS SMĚN NA TENTO TÝDEN';
      if (days.length >= 7) {
        subtitle = `${days[0].fullCzechDate} – ${days[6].fullCzechDate}`;
      }
    } else {
      mainTitle = 'ROZPIS SMĚN NA PŘÍŠTÍ TÝDEN';
      if (days.length >= 7) {
        subtitle = `${days[0].fullCzechDate} – ${days[6].fullCzechDate}`;
      }
    }

    return (
      <View ref={ref} style={styles.weekCardContainer} collapsable={false}>
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
            {isSingleMember ? (
              <View
                style={[
                  styles.miniAvatar,
                  { backgroundColor: activeMembers[0]?.color || '#3B82F6' },
                ]}
              >
                <Text style={styles.miniAvatarText}>
                  {activeMembers[0]?.display_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            ) : (
              <Users size={14} color="#C4B5FD" />
            )}
            <Text style={styles.memberHeaderPillText} numberOfLines={1}>
              {memberBadgeText}
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
                    const memberShifts = getUserShiftsForDay(shifts, member.id, day.dateStr).filter((s) => {
                      if (!config.includeNotes && !s.shift_preset_id) return false;
                      return true;
                    });

                    const shiftsWithPreset = memberShifts.map((s) => ({
                      shift: s,
                      preset: s.shift_preset_id
                        ? presets.find((p) => p.id === s.shift_preset_id)
                        : null,
                    }));

                    const hasShifts = shiftsWithPreset.length > 0;

                    return (
                      <View key={`${day.dateStr}_${member.id}`} style={styles.memberShiftLine}>
                        {!isSingleMember && (
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
                              const badgeColor = preset?.color || member.color || '#38BDF8';
                              const numHours = Number(preset?.hours);
                              const hasHours = !isNaN(numHours) && numHours > 0;

                              return (
                                <View key={`s_${sIdx}`} style={styles.singleShiftWrapper}>
                                  {preset ? (
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
                                        {preset.title}
                                      </Text>
                                      {preset.start_time && preset.end_time ? (
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
                                  ) : null}

                                  {/* Prominent Note Display with exact text */}
                                  {config.includeNotes && shift.note && shift.note.trim().length > 0 && (
                                    <View style={styles.noteBox}>
                                      <FileText size={12} color="#F59E0B" />
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
  // WEEK CARD STYLES
  weekCardContainer: {
    width: 490,
    backgroundColor: '#0F172A',
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
    maxWidth: 220,
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
    width: 78,
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
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 2,
  },
  noteBoxText: {
    color: '#FEF08A',
    fontSize: 11.5,
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

  // MONTH POSTER GRID STYLES
  monthCardContainer: {
    width: 820,
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 22,
    borderWidth: 2,
    borderColor: '#334155',
  },
  monthTitleBanner: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  monthBannerTitleText: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  monthBannerSubText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  monthGridHeaderRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#161F33',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  monthGridHeaderCell: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGridHeaderCellWeekend: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  monthGridHeaderText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  monthGridHeaderTextWeekend: {
    color: '#F43F5E',
  },
  monthGridMatrix: {
    gap: 4,
  },
  monthWeekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  monthCell: {
    flex: 1,
    minHeight: 88,
    backgroundColor: '#161F33',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 5,
  },
  monthCellOtherMonth: {
    opacity: 0.35,
    backgroundColor: '#0F172A',
  },
  monthCellWeekend: {
    backgroundColor: '#17203A',
    borderColor: '#253352',
  },
  monthCellHoliday: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  monthCellTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  monthCellDayNumber: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '800',
  },
  monthCellDayNumberDim: {
    color: '#64748B',
  },
  monthCellDayNumberWeekend: {
    color: '#F43F5E',
  },
  monthCellDayNumberHoliday: {
    color: '#F87171',
  },
  monthCellHolidayText: {
    color: '#FCA5A5',
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 2,
  },
  monthCellShiftsArea: {
    gap: 2,
    flex: 1,
  },
  monthShiftMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 3,
  },
  memberMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monthShiftMiniText: {
    fontSize: 9.5,
    fontWeight: '800',
    flex: 1,
  },

  // MONTH NOTES SECTION UNDER GRID
  monthNotesSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  monthNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  monthNotesTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  monthNotesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthNoteCard: {
    width: '49%',
    backgroundColor: '#161F33',
    borderColor: 'rgba(245, 158, 11, 0.28)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    gap: 4,
  },
  monthNoteDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNoteDateText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  monthNoteMemberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthNoteMemberName: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  monthNoteContentText: {
    color: '#FEF08A',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
