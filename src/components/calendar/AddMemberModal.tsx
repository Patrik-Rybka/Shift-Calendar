import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { X, UserPlus, Sparkles, Check, Heart } from 'lucide-react-native';
import { MemberColors } from '@/constants/theme';
import { addVirtualFamilyMember } from '@/services/db/groupService';
import type { DbUser } from '@/services/db/neonClient';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  onMemberAdded: (member: DbUser) => void;
}

export default function AddMemberModal({
  visible,
  onClose,
  groupId,
  onMemberAdded,
}: AddMemberModalProps) {
  const isDark = useColorScheme() === 'dark';

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(MemberColors[2]); // Default emerald
  const [loading, setLoading] = useState(false);

  const ui = {
    modalOverlay: 'rgba(0, 0, 0, 0.65)',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    inputBg: isDark ? '#161F33' : '#F1F5F9',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Chybí jméno', 'Zadejte prosím jméno člena rodiny.');
      return;
    }

    setLoading(true);
    try {
      const newMember = await addVirtualFamilyMember({
        groupId,
        displayName: cleanName,
        color: selectedColor,
      });

      setName('');
      onMemberAdded(newMember);
      onClose();
    } catch (error) {
      console.error('Failed to create virtual family member:', error);
      Alert.alert('Chyba', 'Nepodařilo se přidat člena rodiny. Zkontrolujte připojení k internetu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.modalOverlay, { backgroundColor: ui.modalOverlay }]}
      >
        <View style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <View style={[styles.iconCircle, { backgroundColor: `${ui.accent}15` }]}>
                <UserPlus size={20} color={ui.accent} />
              </View>
              <Text style={[styles.title, { color: ui.text }]}>Přidat člena rodiny</Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: ui.inputBg }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={ui.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: ui.textMuted }]}>
            Přidejte dítě nebo člena rodiny bez vlastního chytrého telefonu (např. pro kroužky, školu, směny).
          </Text>

          {/* Name Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Jméno člena</Text>
            <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
              <TextInput
                style={[styles.textInput, { color: ui.text }]}
                placeholder="např. Petřík, Anička, Babička..."
                placeholderTextColor={ui.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Barva profilu v kalendáři</Text>
            <View style={styles.colorsGrid}>
              {MemberColors.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      isSelected && styles.colorCircleSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: ui.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: ui.textMuted }]}>Zrušit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: selectedColor || ui.accent }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Sparkles size={17} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Přidat člena</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  inputBox: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    fontWeight: '600',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.12 }],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
