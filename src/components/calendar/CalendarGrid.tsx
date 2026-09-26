import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import {
  CalendarDay,
  WEEKDAY_NAMES_CS,
  generateWeeks,
} from '@/utils/calendarUtils';
import { useShiftStore } from '@/store/useShiftStore';

interface CalendarGridProps {
  onDayPress?: (day: CalendarDay) => void;
  onDayLongPress?: (day: CalendarDay) => void;
  renderCellContent?: (day: CalendarDay) => React.ReactNode;
  isDateSelected?: (dateStr: string) => boolean;
}

export default function CalendarGrid({
  onDayPress,
  onDayLongPress,
  renderCellContent,
  isDateSelected,
}: CalendarGridProps) {
  const isDark = useColorScheme() === 'dark';
  const { currentMonth } = useShiftStore();

  const weeks = generateWeeks(currentMonth);

  const ui = {
    cardBg: isDark ? '#111827' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    headerBg: isDark ? '#161F33' : '#F1F5F9',
    cellBorder: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#64748B' : '#94A3B8',
    weekendText: isDark ? '#FBBF24' : '#D97706',
    weekendBg: isDark ? 'rgba(251, 191, 36, 0.04)' : '#FFFBEB',
    todayBg: '#3B82F6',
    todayText: '#FFFFFF',
    selectedBg: isDark ? 'rgba(59, 130, 246, 0.28)' : '#DBEAFE',
    selectedBorder: '#3B82F6',
  };

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.calendarCard, { backgroundColor: ui.cardBg, borderColor: ui.cardBorder }]}>
        {/* 1. Weekday Header Row (Po - Ne) */}
        <View style={[styles.weekdayHeaderRow, { backgroundColor: ui.headerBg, borderBottomColor: ui.cardBorder }]}>
          {WEEKDAY_NAMES_CS.map((name, index) => {
            const isWeekend = index === 5 || index === 6;
            return (
              <View key={name} style={styles.weekdayCell}>
                <Text
                  style={[
                    styles.weekdayText,
                    { color: isWeekend ? ui.weekendText : ui.textMuted },
                  ]}
                >
                  {name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 2. Calendar Matrix Rendered Row by Row (Strict 7 columns, NO WRAP) */}
        <View style={styles.weeksContainer}>
          {weeks.map((week, weekIndex) => (
            <View key={`week_${weekIndex}`} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                const isSelected = isDateSelected ? isDateSelected(day.dateStr) : false;
                const isLastCol = dayIndex === 6;
                const isLastRow = weekIndex === weeks.length - 1;

                return (
                  <TouchableOpacity
                    key={day.dateStr}
                    style={[
                      styles.dayCell,
                      {
                        borderRightColor: isLastCol ? 'transparent' : ui.cellBorder,
                        borderBottomColor: isLastRow ? 'transparent' : ui.cellBorder,
                        backgroundColor: isSelected
                          ? ui.selectedBg
                          : day.isWeekend
                          ? ui.weekendBg
                          : 'transparent',
                        opacity: day.isCurrentMonth ? 1 : 0.28,
                      },
                      isSelected && { borderWidth: 1.5, borderColor: ui.selectedBorder },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => onDayPress && onDayPress(day)}
                    onLongPress={() => onDayLongPress && onDayLongPress(day)}
                  >
                    {/* Day Number Header */}
                    <View style={styles.dayNumberRow}>
                      {day.isToday ? (
                        <View style={[styles.todayCircle, { backgroundColor: ui.todayBg }]}>
                          <Text style={[styles.dayNumberText, { color: ui.todayText }]}>
                            {day.dayNumber}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.dayNumberText,
                            {
                              color: day.isWeekend ? ui.weekendText : ui.text,
                            },
                          ]}
                        >
                          {day.dayNumber}
                        </Text>
                      )}
                    </View>

                    {/* Shift Content Slot */}
                    <View style={styles.shiftSlot}>
                      {renderCellContent && renderCellContent(day)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  calendarCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  weeksContainer: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dayCell: {
    flex: 1,
    minHeight: 82,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 4,
    justifyContent: 'flex-start',
  },
  dayNumberRow: {
    alignItems: 'center',
    marginBottom: 2,
  },
  dayNumberText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  todayCircle: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  shiftSlot: {
    flex: 1,
    gap: 2,
    marginTop: 2,
    alignItems: 'stretch',
  },
});
