import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Eraser,
  Plus,
  Clock,
  Tag,
  Check,
  Calendar as CalendarIcon,
  Crown,
  Sparkles,
  FileText,
} from 'lucide-react-native';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ShiftPalette as PaletteColors } from '@/constants/theme';
import { createCustomPreset } from '@/services/db/shiftService';

interface ShiftPickerModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: string | null;
  endDate: string | null;
  initialNote?: string | null;
  onSelectPreset: (presetId: string | null, note?: string | null) => void;
}

function formatCzechRange(startStr: string | null, endStr: string | null): string {
  if (!startStr) return '';
  const [sY, sM, sD] = startStr.split('-').map(Number);
  const monthsCs = [
    'ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'
  ];

  if (!endStr || startStr === endStr) {
    return `${sD}. ${monthsCs[sM - 1]} ${sY}`;
  }

  const [eY, eM, eD] = endStr.split('-').map(Number);
  const d1 = new Date(sY, sM - 1, sD);
  const d2 = new Date(eY, eM - 1, eD);
  const diffDays = Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (sM === eM && sY === eY) {
    return `${sD}. – ${eD}. ${monthsCs[sM - 1]} ${sY} (${diffDays} dnů)`;
  }

  return `${sD}. ${monthsCs[sM - 1]} – ${eD}. ${monthsCs[eM - 1]} (${diffDays} dnů)`;
}

export default function ShiftPickerModal({
  visible,
  onClose,
  startDate,
  endDate,
  initialNote,
  onSelectPreset,
}: ShiftPickerModalProps) {
  const isDark = useColorScheme() === 'dark';
  const { currentGroup, currentUser, groupMembers } = useAuthStore();
  const { presets, setPresets, editingUserId } = useShiftStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('06:00');
  const [newEnd, setNewEnd] = useState('18:00');
  const [newHours, setNewHours] = useState('12');
  const [newColor, setNewColor] = useState<string>(PaletteColors[0].hex);
  const [creating, setCreating] = useState(false);

  const [noteText, setNoteText] = useState('');

  React.useEffect(() => {
    if (visible) {
      setNoteText(initialNote || '');
    }
  }, [visible, initialNote]);

  const activeUserId = editingUserId || currentUser?.id;
  const activeMember = groupMembers.find((m) => m.id === activeUserId) || currentUser;

  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    deleteBg: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
    deleteBorder: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
    deleteColor: isDark ? '#F87171' : '#B91C1C',
    inputBg: isDark ? '#161F33' : '#F1F5F9',
    submodalBg: isDark ? '#111827' : '#FFFFFF',
  };

  const formattedDate = formatCzechRange(startDate, endDate);

  const handleCreatePreset = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Chyba', 'Zadejte prosím název směny.');
      return;
    }
    if (!currentGroup?.id) return;

    setCreating(true);
    try {
      const created = await createCustomPreset({
        groupId: currentGroup.id,
        userId: currentUser?.id,
        title: newTitle.trim(),
        startTime: newStart.trim() || null,
        endTime: newEnd.trim() || null,
        color: newColor,
        shortCode: newTitle.trim().slice(0, 3).toUpperCase(),
        hours: parseFloat(newHours) || 8.0,
      });

      setPresets([...presets, created]);
      setCreateModalVisible(false);
      setNewTitle('');

      // Immediately apply newly created preset to selected range!
      onSelectPreset(created.id);
    } catch (e) {
      console.error('Failed to create preset:', e);
      Alert.alert('Chyba', 'Nepodařilo se vytvořit směnu.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: ui.bg }]}>
        {/* Top Header Bar */}
        <View style={[styles.headerRow, { borderBottomColor: ui.border }]}>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.screenTitle, { color: ui.text }]}>Vyberte směnu</Text>
            <View style={styles.dateBadgeRow}>
              <CalendarIcon size={14} color={ui.accent} />
              <Text style={[styles.dateBadgeText, { color: ui.accent }]}>
                {formattedDate || 'Vybrané dny'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.closeCircleBtn, { backgroundColor: ui.card, borderColor: ui.border }]}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <X size={18} color={ui.text} />
          </TouchableOpacity>
        </View>

        {/* Person Info Strip */}
        <View style={[styles.personStrip, { backgroundColor: ui.card, borderColor: ui.border }]}>
          <View style={styles.personStripLeft}>
            <View style={[styles.personAvatar, { backgroundColor: activeMember?.color || '#3B82F6' }]}>
              <Text style={styles.personAvatarText}>
                {activeMember?.display_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={[styles.personStripLabel, { color: ui.textMuted }]}>Zapisuji směnu pro</Text>
              <Text style={[styles.personStripName, { color: ui.text }]}>
                {activeMember?.display_name || 'Uživatel'}{' '}
                {activeMember?.id === currentUser?.id && '(Vy)'}
              </Text>
            </View>
          </View>

          {activeMember?.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Crown size={12} color="#F59E0B" />
              <Text style={styles.adminBadgeText}>Správce</Text>
            </View>
          )}
        </View>

        {/* Scrollable Shift Grid */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section: Optional Note for the Day/Range */}
          <View style={[styles.noteCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
            <View style={styles.noteTitleRow}>
              <FileText size={16} color={ui.accent} />
              <Text style={[styles.noteTitleText, { color: ui.text }]}>Poznámka ke dni (volitelné)</Text>
            </View>
            <View style={[styles.noteInputRow, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
              <TextInput
                style={[styles.noteInputField, { color: ui.text }]}
                placeholder="např. Doktor v 10:00, Vyzvednout ze školy v 15:00..."
                placeholderTextColor={ui.textMuted}
                value={noteText}
                onChangeText={setNoteText}
              />
              {noteText.length > 0 && (
                <TouchableOpacity onPress={() => setNoteText('')} style={{ padding: 4 }}>
                  <X size={15} color={ui.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {noteText.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.saveNoteBtn, { backgroundColor: ui.accent }]}
                activeOpacity={0.8}
                onPress={() => onSelectPreset('__NOTE_ONLY__', noteText.trim())}
              >
                <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.saveNoteBtnText}>Uložit pouze poznámku</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Section: Presets Grid */}
          <Text style={[styles.sectionHeading, { color: ui.textMuted }]}>DOSTUPNÉ SMĚNY</Text>

          <View style={styles.presetsList}>
            {presets.map((preset) => {
              const bg = preset.color;

              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    {
                      backgroundColor: isDark ? `${bg}18` : `${bg}10`,
                      borderColor: isDark ? `${bg}55` : `${bg}40`,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => onSelectPreset(preset.id, noteText.trim() || null)}
                >
                  <View style={[styles.cardColorBar, { backgroundColor: bg }]} />

                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: ui.text }]}>
                      {preset.title}
                    </Text>
                    {preset.start_time && preset.end_time ? (
                      <View style={styles.cardTimeRow}>
                        <Clock size={12} color={ui.textMuted} />
                        <Text style={[styles.cardTimeText, { color: ui.textMuted }]}>
                          {preset.start_time} – {preset.end_time}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.cardTimeText, { color: ui.textMuted }]}>
                        Celodenní / flexibilní
                      </Text>
                    )}
                  </View>

                  <View style={[styles.hoursPill, { backgroundColor: `${bg}25`, borderColor: `${bg}60` }]}>
                    <Text style={[styles.hoursPillText, { color: bg }]}>
                      {preset.hours}h
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Volno / Smazat Card */}
            <TouchableOpacity
              style={[
                styles.presetCard,
                styles.deleteCard,
                {
                  backgroundColor: ui.deleteBg,
                  borderColor: ui.deleteBorder,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => onSelectPreset('__DELETE__', null)}
            >
              <View style={[styles.cardColorBar, { backgroundColor: ui.deleteColor }]} />

              <View style={styles.cardContent}>
                <View style={styles.deleteTitleRow}>
                  <Eraser size={16} color={ui.deleteColor} />
                  <Text style={[styles.cardTitle, { color: ui.deleteColor }]}>
                    Volno / Smazat směnu
                  </Text>
                </View>
                <Text style={[styles.cardTimeText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  Odstraní jakoukoli zapsanou směnu z vybraných dnů
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section: Add Custom Shift Button */}
          <TouchableOpacity
            style={[styles.addCustomBtn, { backgroundColor: ui.card, borderColor: ui.border }]}
            activeOpacity={0.8}
            onPress={() => setCreateModalVisible(true)}
          >
            <View style={[styles.addCustomIconCircle, { backgroundColor: `${ui.accent}20` }]}>
              <Plus size={18} color={ui.accent} strokeWidth={2.5} />
            </View>
            <View style={styles.addCustomTextBox}>
              <Text style={[styles.addCustomTitle, { color: ui.text }]}>Vytvořit novou směnu</Text>
              <Text style={[styles.addCustomSubtitle, { color: ui.textMuted }]}>
                Vlastní název, časy a barva pro celou rodinu
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Nested Modal: Add New Custom Shift */}
        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.submodalCard, { backgroundColor: ui.submodalBg, borderColor: ui.border }]}>
              {/* Header */}
              <View style={styles.submodalHeader}>
                <View style={styles.submodalTitleRow}>
                  <Sparkles size={20} color={ui.accent} />
                  <Text style={[styles.submodalTitle, { color: ui.text }]}>Nová směna</Text>
                </View>
                <TouchableOpacity
                  style={styles.submodalClose}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <X size={18} color={ui.text} />
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Název směny</Text>
                <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
                  <Tag size={16} color={ui.textMuted} />
                  <TextInput
                    style={[styles.inputField, { color: ui.text }]}
                    placeholder="např. Noční Jirka, Zástup..."
                    placeholderTextColor={ui.textMuted}
                    value={newTitle}
                    onChangeText={setNewTitle}
                    autoCapitalize="sentences"
                  />
                </View>
              </View>

              {/* Times Row */}
              <View style={styles.timesRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Začátek</Text>
                  <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
                    <Clock size={15} color={ui.textMuted} />
                    <TextInput
                      style={[styles.inputField, { color: ui.text }]}
                      placeholder="06:00"
                      placeholderTextColor={ui.textMuted}
                      value={newStart}
                      onChangeText={setNewStart}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Konec</Text>
                  <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
                    <Clock size={15} color={ui.textMuted} />
                    <TextInput
                      style={[styles.inputField, { color: ui.text }]}
                      placeholder="18:00"
                      placeholderTextColor={ui.textMuted}
                      value={newEnd}
                      onChangeText={setNewEnd}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { width: 75 }]}>
                  <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Hodin</Text>
                  <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
                    <TextInput
                      style={[styles.inputField, { color: ui.text, textAlign: 'center' }]}
                      placeholder="12"
                      placeholderTextColor={ui.textMuted}
                      value={newHours}
                      onChangeText={setNewHours}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Color Swatches */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Barva směny</Text>
                <View style={styles.colorsGrid}>
                  {PaletteColors.map((c) => {
                    const isSelected = newColor === c.hex;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c.hex },
                          isSelected && styles.colorCircleSelected,
                        ]}
                        onPress={() => setNewColor(c.hex)}
                      >
                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submodalSubmitBtn, { backgroundColor: ui.accent }]}
                activeOpacity={0.88}
                disabled={creating}
                onPress={handleCreatePreset}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submodalSubmitText}>Uložit a zapsat směnu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleBox: {
    gap: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateBadgeText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  closeCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  personStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  personStripLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  personStripName: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 10,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  noteTitleText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  noteInputField: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  saveNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  saveNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 2,
  },
  presetsList: {
    gap: 10,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  cardColorBar: {
    width: 6,
    height: 36,
    borderRadius: 3,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTimeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  hoursPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  hoursPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  deleteCard: {
    marginTop: 4,
  },
  deleteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addCustomIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomTextBox: {
    gap: 2,
    flex: 1,
  },
  addCustomTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  addCustomSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  submodalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  submodalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submodalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submodalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  submodalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
  },
  timesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  submodalSubmitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submodalSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
