import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Save,
  Users,
  Crown,
  UserPlus,
  RotateCcw,
  Eraser,
} from 'lucide-react-native';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';

interface EditToolbarProps {
  onSave?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onOpenAddMember?: () => void;
  onToast?: (msg: string) => void;
}

export default function EditToolbar({ onSave, onCancel, onOpenAddMember, onToast }: EditToolbarProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { currentUser, groupMembers } = useAuthStore();
  const { memberOrderIds, fontSizeScale } = useSettingsStore();
  const fontMultiplier = fontSizeScale === 'small' ? 0.88 : fontSizeScale === 'large' ? 1.18 : 1.0;
  const {
    isEditMode,
    setEditMode,
    isEraserMode,
    toggleEraserMode,
    undo,
    undoStack,
    editingUserId,
    setEditingUserId,
    clearRangeSelection,
    pendingChanges,
    syncStatus,
  } = useShiftStore();

  const orderedMembers = React.useMemo(() => {
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

  if (!isEditMode) return null;

  const currentEditingId = editingUserId || currentUser?.id;
  const isSaving = syncStatus === 'syncing';
  const pendingCount = Object.keys(pendingChanges || {}).length;
  const hasPending = pendingCount > 0;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasPending) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.07,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasPending]);

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
          <Users size={14} color={ui.accent} />
          <Text
            style={[
              styles.sectionTitle,
              { color: ui.text, fontSize: Math.min(13 * fontMultiplier, 14.5) },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.2}
          >
            Zapisuji pro:
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {/* Undo Action Button */}
          <TouchableOpacity
            style={[
              styles.toolbarIconButton,
              {
                backgroundColor: ui.cancelBg,
                borderColor: ui.border,
                opacity: undoStack.length > 0 ? 1 : 0.4,
              },
            ]}
            disabled={undoStack.length === 0}
            activeOpacity={0.7}
            onPress={() => {
              if (undoStack.length === 0) return;
              const desc = undo();
              onToast?.(`↩️ ${desc || 'Akce vrácena'}`);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Vrátit zpět"
          >
            <RotateCcw size={14} color={ui.text} />
          </TouchableOpacity>

          {/* Eraser / Smazat Tool Toggle */}
          <TouchableOpacity
            style={[
              styles.toolbarIconButton,
              isEraserMode
                ? {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
                    borderColor: '#EF4444',
                  }
                : {
                    backgroundColor: ui.cancelBg,
                    borderColor: ui.border,
                  },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              const next = !isEraserMode;
              toggleEraserMode();
              if (next) {
                onToast?.('🧹 Režim mazání aktivován. Klepněte na den pro smazání směny.');
              } else {
                onToast?.('Režim mazání vypnut.');
              }
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Režim mazání"
          >
            <Eraser
              size={14}
              color={isEraserMode ? '#EF4444' : ui.textMuted}
              strokeWidth={isEraserMode ? 2.5 : 2}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: ui.cancelBg, borderColor: ui.border }]}
            activeOpacity={0.75}
            disabled={isSaving}
            onPress={handleCancel}
          >
            <X size={13} color={ui.textMuted} strokeWidth={2.5} />
            <Text
              style={[
                styles.cancelBtnText,
                { color: ui.textMuted, fontSize: Math.min(12.5 * fontMultiplier, 13.5) },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              Zrušit
            </Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                hasPending ? styles.saveBtnPending : { backgroundColor: ui.saveBg },
                isSaving && { opacity: 0.8 },
              ]}
              activeOpacity={0.85}
              disabled={isSaving}
              onPress={handleSave}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ paddingHorizontal: 10 }} />
              ) : (
                <>
                  <Save size={13} color="#FFFFFF" strokeWidth={2.5} />
                  <Text
                    style={[
                      styles.saveBtnText,
                      { fontSize: Math.min(12.5 * fontMultiplier, 13.5) },
                    ]}
                    maxFontSizeMultiplier={1.2}
                  >
                    Uložit
                  </Text>
                  {hasPending && (
                    <View style={styles.pendingBadgeCircle}>
                      <Text style={styles.pendingBadgeCircleText} maxFontSizeMultiplier={1.2}>
                        {pendingCount}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Row 2: Horizontal scrollable member selector pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.memberPillsScroll}
      >
        {orderedMembers.map((member) => {
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
    paddingHorizontal: 12,
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
    gap: 8,
  },
  titleWithIcon: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  toolbarIconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
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
    gap: 5,
    paddingHorizontal: 12,
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
  saveBtnPending: {
    backgroundColor: '#059669',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
  },
  pendingBadgeCircle: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    marginLeft: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  pendingBadgeCircleText: {
    color: '#FFFFFF',
    fontSize: 9.5,
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
