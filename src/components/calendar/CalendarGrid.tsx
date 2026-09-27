import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CalendarDay,
  WEEKDAY_NAMES_CS_MON,
  WEEKDAY_NAMES_CS_SUN,
  generateWeeks,
  getIsoWeekNumber,
} from '@/utils/calendarUtils';
import { useShiftStore } from '@/store/useShiftStore';
import { useSettingsStore } from '@/store/useSettingsStore';

interface CalendarGridProps {
  onDayPress?: (day: CalendarDay) => void;
  onDayLongPress?: (day: CalendarDay) => void;
  renderCellContent?: (day: CalendarDay) => React.ReactNode;
  renderCellBg?: (day: CalendarDay) => React.ReactNode;
  renderCellCorner?: (day: CalendarDay) => React.ReactNode;
  isDateSelected?: (dateStr: string) => boolean;
  isEditMode?: boolean;
  onRangeDragChange?: (startDateStr: string, endDateStr: string) => void;
  onRangeDragComplete?: (startDateStr: string, endDateStr: string) => void;
  onDayTapInEditMode?: (day: CalendarDay) => void;
}

export default function CalendarGrid({
  onDayPress,
  onDayLongPress,
  renderCellContent,
  renderCellBg,
  renderCellCorner,
  isDateSelected,
  isEditMode = false,
  onRangeDragChange,
  onRangeDragComplete,
  onDayTapInEditMode,
}: CalendarGridProps) {
  const isDark = useColorScheme() === 'dark';
  const { currentMonth, rangeStart, rangeEnd } = useShiftStore();
  const {
    firstDayOfWeek,
    showWeekNumbers,
    highlightWeekends,
    todayHighlightStyle,
    showHolidays,
    calendarDensity,
    fontSizeScale,
  } = useSettingsStore();

  const fontMultiplier = fontSizeScale === 'small' ? 0.88 : fontSizeScale === 'large' ? 1.18 : 1.0;
  const cellMinHeight = calendarDensity === 'compact' ? 72 : 96;

  const weekdayNames = firstDayOfWeek === 'sunday' ? WEEKDAY_NAMES_CS_SUN : WEEKDAY_NAMES_CS_MON;
  const weeks = useMemo(
    () => generateWeeks(currentMonth, firstDayOfWeek, showHolidays),
    [currentMonth, firstDayOfWeek, showHolidays]
  );

  const hasRange = isEditMode && !!rangeStart;
  const minDate = hasRange ? (rangeStart < (rangeEnd || rangeStart) ? rangeStart : (rangeEnd || rangeStart)) : '';
  const maxDate = hasRange ? (rangeStart < (rangeEnd || rangeStart) ? (rangeEnd || rangeStart) : rangeStart) : '';

  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ pageX: 0, pageY: 0, width: 0, height: 0 });
  const dragStartDayRef = useRef<CalendarDay | null>(null);
  const dragCurrentDayRef = useRef<CalendarDay | null>(null);

  const updateContainerMeasure = () => {
    containerRef.current?.measureInWindow((pageX, pageY, width, height) => {
      if (width > 0 && height > 0) {
        layoutRef.current = { pageX, pageY, width, height };
      }
    });
  };

  React.useEffect(() => {
    updateContainerMeasure();
    const t = setTimeout(updateContainerMeasure, 120);
    return () => clearTimeout(t);
  }, [currentMonth]);

  const getDayFromPageCoords = (pageX: number, pageY: number): CalendarDay | null => {
    const { pageX: gX, pageY: gY, width, height } = layoutRef.current;
    if (width <= 0 || height <= 0 || weeks.length === 0) return null;

    const weekColWidth = showWeekNumbers ? 24 : 0;
    const effectiveWidth = Math.max(1, width - weekColWidth);

    const relX = Math.max(0, Math.min(width - 1, pageX - gX));
    const relY = Math.max(0, Math.min(height - 1, pageY - gY));

    if (relX < weekColWidth) return null; // over week number column

    const relXInGrid = relX - weekColWidth;
    const colWidth = effectiveWidth / 7;
    const rowHeight = height / weeks.length;

    const col = Math.max(0, Math.min(6, Math.floor(relXInGrid / colWidth)));
    const row = Math.max(0, Math.min(weeks.length - 1, Math.floor(relY / rowHeight)));

    const day = weeks[row]?.[col];
    // Strictly accept ONLY current month days - never jump or clamp to previous/next month!
    if (!day || !day.isCurrentMonth) return null;

    return day;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Do NOT capture on touch down so that single taps go directly to the cell's native onPress!
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isEditMode &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2 &&
          Math.abs(gestureState.dx) > 10,
        onPanResponderGrant: (evt, gestureState) => {
          if (!isEditMode) return;
          updateContainerMeasure();
          const startX = gestureState.x0 || evt.nativeEvent.pageX;
          const startY = gestureState.y0 || evt.nativeEvent.pageY;

          const day = getDayFromPageCoords(startX, startY);
          if (day && day.isCurrentMonth) {
            dragStartDayRef.current = day;
            dragCurrentDayRef.current = day;
            if (onRangeDragChange) {
              onRangeDragChange(day.dateStr, day.dateStr);
            }
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          if (!isEditMode || !dragStartDayRef.current) return;
          const moveX = gestureState.moveX || evt.nativeEvent.pageX;
          const moveY = gestureState.moveY || evt.nativeEvent.pageY;

          const day = getDayFromPageCoords(moveX, moveY);
          if (day && day.isCurrentMonth && day.dateStr !== dragCurrentDayRef.current?.dateStr) {
            dragCurrentDayRef.current = day;
            if (onRangeDragChange && dragStartDayRef.current) {
              onRangeDragChange(dragStartDayRef.current.dateStr, day.dateStr);
            }
          }
        },
        onPanResponderRelease: () => {
          if (!isEditMode || !dragStartDayRef.current) return;

          const start = dragStartDayRef.current.dateStr;
          const end = dragCurrentDayRef.current ? dragCurrentDayRef.current.dateStr : start;

          const minDate = start < end ? start : end;
          const maxDate = start < end ? end : start;

          dragStartDayRef.current = null;
          dragCurrentDayRef.current = null;

          if (onRangeDragComplete) {
            onRangeDragComplete(minDate, maxDate);
          }
        },
        onPanResponderTerminate: () => {
          dragStartDayRef.current = null;
          dragCurrentDayRef.current = null;
        },
      }),
    [isEditMode, weeks, onRangeDragChange, onRangeDragComplete]
  );

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
    accent: '#3B82F6',
    selectedBg: isDark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.16)',
  };

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.calendarCard, { backgroundColor: ui.cardBg, borderColor: ui.cardBorder }]}>
        {/* 1. Weekday Header Row (Po - Ne or Ne - So, plus optional week numbers column) */}
        <View style={[styles.weekdayHeaderRow, { backgroundColor: ui.headerBg, borderBottomColor: ui.cardBorder }]}>
          {showWeekNumbers && (
            <View style={[styles.weekNumberHeaderCell, { borderRightColor: ui.cardBorder }]}>
              <Text style={[styles.weekNumberHeaderText, { color: ui.textMuted }]}>#</Text>
            </View>
          )}
          {weekdayNames.map((name, index) => {
            const isWeekend = firstDayOfWeek === 'sunday' ? (index === 0 || index === 6) : (index === 5 || index === 6);
            return (
              <View key={name} style={styles.weekdayCell}>
                <Text
                  style={[
                    styles.weekdayText,
                    {
                      color: (isWeekend && highlightWeekends) ? ui.weekendText : ui.textMuted,
                      fontSize: Math.round(13 * fontMultiplier),
                    },
                  ]}
                >
                  {name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 2. Calendar Matrix Rendered Row by Row (Strict 7 columns, NO WRAP) */}
        <View
          ref={containerRef}
          style={styles.weeksContainer}
          onLayout={updateContainerMeasure}
          {...(isEditMode ? panResponder.panHandlers : {})}
        >
          {weeks.map((week, weekIndex) => {
            const midDay = week[3] || week[0];
            const [y, m, d] = midDay.dateStr.split('-').map(Number);
            const isoWeekNum = getIsoWeekNumber(new Date(y, m - 1, d));
            const isLastRow = weekIndex === weeks.length - 1;

            return (
              <View key={`week_${weekIndex}`} style={styles.weekRow}>
                {showWeekNumbers && (
                  <View
                    style={[
                      styles.weekNumberCell,
                      {
                        borderRightColor: ui.cellBorder,
                        borderBottomColor: isLastRow ? 'transparent' : ui.cellBorder,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekNumberText,
                        { color: ui.textMuted, fontSize: Math.round(10 * fontMultiplier) },
                      ]}
                    >
                      {isoWeekNum}
                    </Text>
                  </View>
                )}
                {week.map((day, dayIndex) => {
                  const isSelected = hasRange
                    ? day.dateStr >= minDate && day.dateStr <= maxDate
                    : isDateSelected ? isDateSelected(day.dateStr) : false;

                  const isStart = hasRange && day.dateStr === minDate;
                  const isEnd = hasRange && day.dateStr === maxDate;
                  const isRangeMiddle = isSelected && !isStart && !isEnd;
                  const isFirstCol = dayIndex === 0;
                  const isLastCol = dayIndex === 6;
                  const isWeekendDay = day.isWeekend && highlightWeekends;
                  const hasHoliday = Boolean(day.holidayName && showHolidays);

                  return (
                    <TouchableOpacity
                      key={day.dateStr}
                      disabled={!day.isCurrentMonth}
                      style={[
                        styles.dayCell,
                        {
                          minHeight: cellMinHeight,
                          borderRightColor: (isSelected && !isEnd && !isLastCol)
                            ? 'transparent'
                            : (isLastCol ? 'transparent' : ui.cellBorder),
                          borderBottomColor: isLastRow ? 'transparent' : ui.cellBorder,
                          backgroundColor: (isWeekendDay && !isSelected) ? ui.weekendBg : 'transparent',
                          opacity: day.isCurrentMonth ? 1 : 0.28,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (!day.isCurrentMonth) return;
                        if (isEditMode) {
                          onDayTapInEditMode?.(day);
                        } else {
                          onDayPress?.(day);
                        }
                      }}
                      onLongPress={() => {
                        if (!day.isCurrentMonth) return;
                        onDayLongPress?.(day);
                      }}
                    >
                      {/* Optional custom background (e.g. full-fill or 50/50 split) */}
                      {renderCellBg && renderCellBg(day)}

                      {/* Optional corner indicator (e.g. subtle note indicator) */}
                      {renderCellCorner && (
                        <View style={styles.cellCornerSlot} pointerEvents="none">
                          {renderCellCorner(day)}
                        </View>
                      )}

                      {/* Modern fluid ribbon background behind selected cells */}
                      {isSelected && (
                        <View
                          style={[
                            styles.selectionRibbon,
                            {
                              backgroundColor: ui.selectedBg,
                              left: isStart || isFirstCol ? 2 : -1,
                              right: isEnd || isLastCol ? 2 : -1,
                              borderTopLeftRadius: isStart || isFirstCol ? 14 : 0,
                              borderBottomLeftRadius: isStart || isFirstCol ? 14 : 0,
                              borderTopRightRadius: isEnd || isLastCol ? 14 : 0,
                              borderBottomRightRadius: isEnd || isLastCol ? 14 : 0,
                            },
                          ]}
                        />
                      )}

                      {/* Day Number Header */}
                      <View style={styles.dayNumberRow}>
                        {isStart || isEnd ? (
                          <View style={[styles.selectedDayBadge, { backgroundColor: ui.accent }]}>
                            <Text style={[styles.selectedDayBadgeText, { fontSize: Math.round(14 * fontMultiplier) }]}>
                              {day.dayNumber}
                            </Text>
                          </View>
                        ) : day.isToday ? (
                          todayHighlightStyle === 'badge' ? (
                            <View style={[styles.todayCircle, { backgroundColor: ui.todayBg }]}>
                              <Text style={[styles.dayNumberText, { color: ui.todayText, fontSize: Math.round(14.5 * fontMultiplier) }]}>
                                {day.dayNumber}
                              </Text>
                            </View>
                          ) : todayHighlightStyle === 'border' ? (
                            <View style={[styles.todayBorderBox, { borderColor: ui.todayBg }]}>
                              <Text style={[styles.dayNumberText, { color: ui.todayBg, fontWeight: '900', fontSize: Math.round(14.5 * fontMultiplier) }]}>
                                {day.dayNumber}
                              </Text>
                            </View>
                          ) : todayHighlightStyle === 'dot' ? (
                            <View style={styles.todayDotContainer}>
                              <Text style={[styles.dayNumberText, { color: ui.todayBg, fontWeight: '900', fontSize: Math.round(14.5 * fontMultiplier) }]}>
                                {day.dayNumber}
                              </Text>
                              <View style={[styles.todaySmallDot, { backgroundColor: ui.todayBg }]} />
                            </View>
                          ) : (
                            <View style={[styles.todaySubtleBox, { backgroundColor: `${ui.todayBg}25` }]}>
                              <Text style={[styles.dayNumberText, { color: ui.todayBg, fontWeight: '900', fontSize: Math.round(14.5 * fontMultiplier) }]}>
                                {day.dayNumber}
                              </Text>
                            </View>
                          )
                        ) : hasHoliday ? (
                          <View style={styles.holidayNumberRow}>
                            <Text
                              style={[
                                styles.dayNumberText,
                                {
                                  color: isDark ? '#F87171' : '#DC2626',
                                  fontWeight: '800',
                                  fontSize: Math.round(14.5 * fontMultiplier),
                                },
                              ]}
                            >
                              {day.dayNumber}
                            </Text>
                            <View style={[styles.holidayDot, { backgroundColor: isDark ? '#F87171' : '#DC2626' }]} />
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.dayNumberText,
                              {
                                color: isRangeMiddle
                                  ? ui.accent
                                  : isWeekendDay
                                  ? ui.weekendText
                                  : ui.text,
                                fontWeight: isRangeMiddle ? '800' : '700',
                                fontSize: Math.round(14.5 * fontMultiplier),
                              },
                            ]}
                          >
                            {day.dayNumber}
                          </Text>
                        )}
                      </View>

                      {/* Holiday Badge (e.g. 🇨🇿 Den české státnosti) */}
                      {hasHoliday && day.isCurrentMonth && (
                        <View style={[styles.holidayBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2' }]}>
                          <Text style={[styles.holidayBadgeText, { color: isDark ? '#FCA5A5' : '#DC2626' }]} numberOfLines={1}>
                            🇨🇿 {day.holidayName}
                          </Text>
                        </View>
                      )}

                      {/* Shift Content Slot */}
                    <View style={styles.shiftSlot}>
                      {renderCellContent && renderCellContent(day)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
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
    minHeight: 96,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 1.5,
    paddingTop: 4,
    paddingBottom: 4,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  dayNumberRow: {
    alignItems: 'center',
    marginBottom: 3,
  },
  cellCornerSlot: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 5,
  },
  dayNumberText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  todayCircle: {
    minWidth: 25,
    height: 25,
    borderRadius: 12.5,
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
    zIndex: 2,
  },
  selectionRibbon: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    zIndex: 1,
  },
  selectedDayBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 3,
  },
  selectedDayBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  // Week numbers column (Step 7.4B)
  weekNumberHeaderCell: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  weekNumberHeaderText: {
    fontSize: 10,
    fontWeight: '800',
  },
  weekNumberCell: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  weekNumberText: {
    fontSize: 10,
    fontWeight: '800',
  },
  // Today highlight variants (Step 7.4B)
  todayBorderBox: {
    minWidth: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  todayDotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  todaySmallDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  todaySubtleBox: {
    minWidth: 23,
    height: 23,
    borderRadius: 11.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  // Czech Holidays (Step 7.4B)
  holidayNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  holidayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  holidayBadge: {
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    marginBottom: 2,
    width: '100%',
    alignItems: 'center',
  },
  holidayBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    textAlign: 'center',
  },
});
