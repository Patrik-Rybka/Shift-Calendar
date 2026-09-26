import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar as CalendarIcon, Clock, X, Users, AlertCircle, Crown } from 'lucide-react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore, getShiftMapKey } from '@/store/useShiftStore';
import { getGroupPresets } from '@/services/db/shiftService';
import { CalendarDay } from '@/utils/calendarUtils';

import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarGrid from '@/components/calendar/CalendarGrid';

export default function CalendarScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const { currentUser, currentGroup, groupMembers } = useAuthStore();
  const {
    presets,
    setPresets,
    shifts,
    syncWithNeon,
    syncStatus,
    currentMonth,
    isEditMode,
  } = useShiftStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<CalendarDay | null>(null);

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
    } else if (!currentGroup) {
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

  // Render shift badges inside each calendar day cell (Step 5.3)
  const renderCellContent = (day: CalendarDay) => {
    const dayShifts: Array<{
      member: typeof groupMembers[0];
      preset?: typeof presets[0];
      customHours?: number | null;
      note?: string | null;
    }> = [];

    // Find shifts for all family members for this day
    for (const member of groupMembers) {
      const key = getShiftMapKey(member.id, day.dateStr);
      const shift = shifts[key];
      if (shift && shift.shift_preset_id) {
        const preset = presets.find((p) => p.id === shift.shift_preset_id);
        dayShifts.push({
          member,
          preset,
          customHours: shift.custom_hours,
          note: shift.note,
        });
      }
    }

    if (dayShifts.length === 0) return null;

    return (
      <View style={styles.cellShiftsContainer}>
        {dayShifts.slice(0, 3).map((item, idx) => {
          const presetColor = item.preset?.color || item.member.color || '#2563EB';
          const title = item.preset?.title || item.preset?.short_code || 'Směna';

          return (
            <View
              key={`${item.member.id}_${idx}`}
              style={[
                styles.shiftPill,
                {
                  backgroundColor: isDark ? `${presetColor}25` : `${presetColor}18`,
                  borderColor: isDark ? `${presetColor}50` : `${presetColor}40`,
                },
              ]}
            >
              {/* Member Color Indicator Dot */}
              <View
                style={[
                  styles.memberDot,
                  { backgroundColor: item.member.color || '#0EA5E9' },
                ]}
              />

              {/* Shift Title (clean, no brackets) */}
              <Text
                style={[
                  styles.shiftPillText,
                  { color: isDark ? '#F9FAFB' : '#0F172A' },
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
          <Text style={[styles.moreCountText, { color: ui.textMuted }]}>
            +{dayShifts.length - 3} další
          </Text>
        )}
      </View>
    );
  };

  const handleDayPress = (day: CalendarDay) => {
    if (isEditMode) {
      // In edit mode, stamping logic is handled in Phase 6
      return;
    }
    // In view mode, tap opens day detail modal
    setSelectedDayDetail(day);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: ui.bg }]}>
      {/* 1. Calendar Header (Month navigation, Sync badge, Group Code, Edit toggle) */}
      <CalendarHeader />

      {/* 2. Main Scrollable Calendar Grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        />

        {/* Legend / Quick Family Summary */}
        <View style={[styles.familySummaryBox, { backgroundColor: ui.card, borderColor: ui.border }]}>
          <View style={styles.summaryTitleRow}>
            <Users size={16} color={ui.accent} />
            <Text style={[styles.summaryTitle, { color: ui.text }]}>Členové rodiny v kalendáři</Text>
          </View>

          <View style={styles.membersListRow}>
            {groupMembers.map((member) => (
              <View key={member.id} style={[styles.memberTag, { backgroundColor: isDark ? '#161F33' : '#F1F5F9', borderColor: ui.border }]}>
                <View style={[styles.legendAvatarCircle, { backgroundColor: member.color }]}>
                  <Text style={styles.legendAvatarText}>
                    {member.display_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.memberNameText, { color: ui.text }]}>
                  {member.display_name} {member.id === currentUser.id && '(Já)'}
                </Text>
                {member.role === 'admin' && (
                  <Crown size={12} color="#F59E0B" />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 3. Day Detail Modal (when user taps a day in View Mode) */}
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
                    {selectedDayDetail.dayNumber}. {selectedDayDetail.dateStr}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: ui.bg }]}
                  onPress={() => setSelectedDayDetail(null)}
                >
                  <X size={18} color={ui.text} />
                </TouchableOpacity>
              </View>

              {/* Members Shifts List for the Day */}
              <View style={styles.modalShiftsList}>
                {groupMembers.map((member) => {
                  const key = getShiftMapKey(member.id, selectedDayDetail.dateStr);
                  const shift = shifts[key];
                  const preset = shift?.shift_preset_id
                    ? presets.find((p) => p.id === shift.shift_preset_id)
                    : null;

                  return (
                    <View
                      key={member.id}
                      style={[styles.modalMemberRow, { borderColor: ui.border }]}
                    >
                      {/* Member Info */}
                      <View style={styles.modalMemberInfo}>
                        <View style={[styles.memberAvatarSmall, { backgroundColor: member.color }]}>
                          <Text style={styles.memberAvatarInitial}>
                            {member.display_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.modalMemberName, { color: ui.text }]}>
                          {member.display_name}
                        </Text>
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
                          {preset.start_time && preset.end_time && (
                            <Text style={[styles.modalShiftTimes, { color: ui.textMuted }]}>
                              {preset.start_time} – {preset.end_time}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <Text style={[styles.noShiftText, { color: ui.textMuted }]}>
                          Bez zapsané směny
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 24,
  },
  cellShiftsContainer: {
    gap: 2,
    width: '100%',
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  memberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shiftPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  moreCountText: {
    fontSize: 8.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  familySummaryBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  summaryTitleRow: {
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
});
