import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Save,
  Users,
  Crown,
  UserPlus,
} from 'lucide-react-native';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';

interface EditToolbarProps {
  onSave?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onOpenAddMember?: () => void;
}

export default function EditToolbar({ onSave, onCancel, onOpenAddMember }: EditToolbarProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { currentUser, groupMembers } = useAuthStore();
  const {
    isEditMode,
    setEditMode,
    editingUserId,
    setEditingUserId,
    clearRangeSelection,
    pendingChanges,
    syncStatus,
  } = useShiftStore();

  if (!isEditMode) return null;

  const currentEditingId = editingUserId || currentUser?.id;
  const isSaving = syncStatus === 'syncing';

  const ui = {
    barBg: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    saveBg: '#10B981',
    cancelBg: isDark ? '#161F33' : '#F1F5F9',
  };

  const handleCancel = () => {
    if (isSaving) return;
    const hasPending = Object.keys(pendingChanges).length > 0;
    if (hasPending) {
      Alert.alert(
        'Zahodit neuložené změny?',
        'V kalendáři máte provedené úpravy. Chcete je zahodit a vrátit se do původního stavu?',
        [
          { text: 'Pokračovat v úpravách', style: 'cancel' },
          {
            text: 'Zahodit',
            style: 'destructive',
            onPress: async () => {
              clearRangeSelection();
              if (onCancel) {
                await onCancel();
              } else {
                setEditMode(false);
              }
            },
          },
        ]
      );
    } else {
      clearRangeSelection();
      setEditMode(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (onSave) {
      await onSave();
    } else {
      setEditMode(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: ui.barBg,
          borderColor: ui.border,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom + 14, 38) : Math.max(insets.bottom, 16),
          paddingTop: 14,
        },
      ]}
    >
      {/* Row 1: Header with "Zapisuji pro" and Action buttons (Cancel / Save) */}
      <View style={styles.topRow}>
        <View style={styles.titleWithIcon}>
          <Users size={15} color={ui.accent} />
          <Text style={[styles.sectionTitle, { color: ui.text }]}>Zapisuji směny pro:</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: ui.cancelBg, borderColor: ui.border }]}
            activeOpacity={0.75}
            disabled={isSaving}
            onPress={handleCancel}
          >
            <X size={14} color={ui.textMuted} strokeWidth={2.5} />
            <Text style={[styles.cancelBtnText, { color: ui.textMuted }]}>Zrušit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: ui.saveBg }, isSaving && { opacity: 0.8 }]}
            activeOpacity={0.85}
            disabled={isSaving}
            onPress={handleSave}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ paddingHorizontal: 10 }} />
            ) : (
              <>
                <Save size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.saveBtnText}>Uložit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2: Horizontal scrollable member selector pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.memberPillsScroll}
      >
        {groupMembers.map((member) => {
          const isActive = currentEditingId === member.id;
          const memberColor = member.color || '#3B82F6';

          return (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberPill,
                {
                  backgroundColor: isActive
                    ? isDark
                      ? `${memberColor}25`
                      : `${memberColor}15`
                    : ui.cancelBg,
                  borderColor: isActive ? memberColor : ui.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setEditingUserId(member.id)}
            >
              <View style={[styles.memberAvatar, { backgroundColor: memberColor }]}>
                <Text style={styles.memberAvatarText}>
                  {member.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text
                style={[
                  styles.memberName,
                  {
                    color: isActive ? ui.text : ui.textMuted,
                    fontWeight: isActive ? '800' : '600',
                  },
                ]}
              >
                {member.display_name} {member.id === currentUser?.id && '(Já)'}
              </Text>

              {member.role === 'admin' && (
                <Crown size={12} color="#F59E0B" />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add Child / Member button right in the selector */}
        {onOpenAddMember && (
          <TouchableOpacity
            style={[styles.addMemberPill, { backgroundColor: ui.cancelBg, borderColor: ui.border }]}
            activeOpacity={0.8}
            onPress={onOpenAddMember}
          >
            <UserPlus size={13} color={ui.accent} />
            <Text style={[styles.addMemberText, { color: ui.accent }]}>+ Člen / Dítě</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  memberPillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  memberAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 13,
  },
  addMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addMemberText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
