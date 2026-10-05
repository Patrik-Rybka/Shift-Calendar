import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  X,
  Share2,
  Calendar,
  FileText,
  Check,
  CalendarDays,
  Camera,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';

export type ShareRangeType = 'current_week' | 'next_week' | 'current_month';

export interface ShareConfig {
  rangeType: ShareRangeType;
  selectedMemberIds: string[]; // List of IDs to include (e.g. ['jirka', 'hanka'])
  includeNotes: boolean;
}

interface ShareScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmShare: (config: ShareConfig) => void;
}

export default function ShareScheduleModal({
  visible,
  onClose,
  onConfirmShare,
}: ShareScheduleModalProps) {
  const isDark = useColorScheme() === 'dark';
  const { groupMembers, currentUser } = useAuthStore();

  const [rangeType, setRangeType] = useState<ShareRangeType>('current_week');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [includeNotes, setIncludeNotes] = useState<boolean>(false);

  const members = Array.isArray(groupMembers) ? groupMembers : [];

  // Initialize all members selected by default when modal opens
  useEffect(() => {
    if (visible && members.length > 0) {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  }, [visible, members.length]);

  const ui = {
    modalOverlay: 'rgba(0, 0, 0, 0.65)',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    itemBg: isDark ? '#161F33' : '#F8FAFC',
    itemBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    selectedBorder: '#3B82F6',
    selectedBg: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    success: '#10B981',
  };

  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length === 1) {
        Alert.alert('Výběr', 'V rozpisu musí zůstat alespoň jeden člen rodiny.');
        return;
      }
      setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedMemberIds(members.map((m) => m.id));
  };

  const handleSelectOnlyMe = () => {
    if (currentUser?.id) {
      setSelectedMemberIds([currentUser.id]);
    }
  };

  const handleShare = () => {
    if (selectedMemberIds.length === 0) {
      Alert.alert('Chyba', 'Vyberte alespoň jednoho člena rodiny.');
      return;
    }
    onConfirmShare({
      rangeType,
      selectedMemberIds,
      includeNotes,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: ui.modalOverlay }]}>
        <View style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <View style={[styles.iconPill, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE' }]}>
                <Camera size={18} color={ui.accent} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: ui.text }]}>Sdílet rozpis jako fotku</Text>
                <Text style={[styles.modalSubtitle, { color: ui.textMuted }]}>
                  Vytvoří přehledný obrázek pro WhatsApp nebo zprávy
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: ui.itemBg }]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={ui.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 1. Range Selection */}
            <Text style={[styles.sectionLabel, { color: ui.textMuted }]}>1. VYBERTE OBDOBÍ</Text>
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: rangeType === 'current_week' ? ui.selectedBg : ui.itemBg,
                    borderColor: rangeType === 'current_week' ? ui.selectedBorder : ui.itemBorder,
                  },
                ]}
                onPress={() => setRangeType('current_week')}
                activeOpacity={0.75}
              >
                <View style={styles.optionHeader}>
                  <CalendarDays size={16} color={rangeType === 'current_week' ? ui.accent : ui.textMuted} />
                  <Text style={[styles.optionTitle, { color: rangeType === 'current_week' ? ui.accent : ui.text }]}>
                    Tento týden
                  </Text>
                </View>
                <Text style={[styles.optionDesc, { color: ui.textMuted }]}>
                  7 dní (velká přehledná písmena pro babičku)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: rangeType === 'next_week' ? ui.selectedBg : ui.itemBg,
                    borderColor: rangeType === 'next_week' ? ui.selectedBorder : ui.itemBorder,
                  },
                ]}
                onPress={() => setRangeType('next_week')}
                activeOpacity={0.75}
              >
                <View style={styles.optionHeader}>
                  <CalendarDays size={16} color={rangeType === 'next_week' ? ui.accent : ui.textMuted} />
                  <Text style={[styles.optionTitle, { color: rangeType === 'next_week' ? ui.accent : ui.text }]}>
                    Příští týden
                  </Text>
                </View>
                <Text style={[styles.optionDesc, { color: ui.textMuted }]}>
                  Plán směn na následující týden
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: rangeType === 'current_month' ? ui.selectedBg : ui.itemBg,
                    borderColor: rangeType === 'current_month' ? ui.selectedBorder : ui.itemBorder,
                  },
                ]}
                onPress={() => setRangeType('current_month')}
                activeOpacity={0.75}
              >
                <View style={styles.optionHeader}>
                  <Calendar size={16} color={rangeType === 'current_month' ? ui.accent : ui.textMuted} />
                  <Text style={[styles.optionTitle, { color: rangeType === 'current_month' ? ui.accent : ui.text }]}>
                    Celý měsíc
                  </Text>
                </View>
                <Text style={[styles.optionDesc, { color: ui.textMuted }]}>
                  Přehledná tabulka měsíce (jako nástěnný kalendář)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Target Member Multi-Selection */}
            <View style={styles.memberHeaderRow}>
              <Text style={[styles.sectionLabel, { color: ui.textMuted }]}>
                2. KOHO ZAHRNOUT DO FOTKY ({selectedMemberIds.length}/{members.length})
              </Text>
              <View style={styles.quickSelectBtns}>
                <TouchableOpacity
                  style={[styles.quickSelectBtn, { borderColor: ui.border }]}
                  onPress={handleSelectAll}
                >
                  <Text style={[styles.quickSelectBtnText, { color: ui.accent }]}>Všichni</Text>
                </TouchableOpacity>
                {currentUser && (
                  <TouchableOpacity
                    style={[styles.quickSelectBtn, { borderColor: ui.border }]}
                    onPress={handleSelectOnlyMe}
                  >
                    <Text style={[styles.quickSelectBtnText, { color: ui.accent }]}>Jen já</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.membersList}>
              {members.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberRowCard,
                      {
                        backgroundColor: isSelected ? ui.selectedBg : ui.itemBg,
                        borderColor: isSelected ? ui.selectedBorder : ui.itemBorder,
                      },
                    ]}
                    onPress={() => toggleMember(m.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.memberLeft}>
                      <View style={[styles.avatarCircle, { backgroundColor: m.color || '#2563EB' }]}>
                        <Text style={styles.avatarChar}>
                          {m.display_name.trim().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.memberName, { color: isSelected ? ui.accent : ui.text }]}>
                          {m.display_name} {m.id === currentUser?.id ? '(Já)' : ''}
                        </Text>
                        <Text style={[styles.memberSub, { color: ui.textMuted }]}>
                          {isSelected ? '✓ Bude na fotce' : '✕ Vynechán z fotky'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.checkboxBox,
                        {
                          backgroundColor: isSelected ? ui.accent : 'transparent',
                          borderColor: isSelected ? ui.accent : ui.textMuted,
                        },
                      ]}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Notes Toggle Switch */}
            <Text style={[styles.sectionLabel, { color: ui.textMuted, marginTop: 14 }]}>3. VOLBY ZOBRAZENÍ</Text>
            <View style={[styles.switchCard, { backgroundColor: ui.itemBg, borderColor: ui.itemBorder }]}>
              <View style={styles.switchLeft}>
                <View style={[styles.switchIconBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                  <FileText size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: ui.text }]}>
                    Zahrnout do fotky i poznámky
                  </Text>
                  <Text style={[styles.switchSubtitle, { color: ui.textMuted }]}>
                    {includeNotes
                      ? '✓ Poznámky budou na fotce zobrazeny'
                      : '✕ Bez poznámek (čistý rozpis jen se směnami)'}
                  </Text>
                </View>
              </View>
              <Switch
                value={includeNotes}
                onValueChange={setIncludeNotes}
                trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: ui.accent }]}
            onPress={handleShare}
            activeOpacity={0.88}
          >
            <Share2 size={16} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              Pokračovat k odeslání fotky ({selectedMemberIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollArea: {
    maxHeight: 460,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  optionsGrid: {
    gap: 6,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    marginLeft: 24,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 2,
  },
  quickSelectBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  quickSelectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickSelectBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  membersList: {
    gap: 6,
  },
  memberRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberSub: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
