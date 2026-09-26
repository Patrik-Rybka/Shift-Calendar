import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, User, ArrowRight, Palette } from 'lucide-react-native';
import { MemberColors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { updateUserProfile } from '@/services/db/authService';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const { currentUser, setCurrentUser, groupMembers, setGroupMembers } = useAuthStore();

  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [selectedColor, setSelectedColor] = useState(currentUser?.color || MemberColors[0]);
  const [loading, setLoading] = useState(false);

  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    inputBg: isDark ? '#161F33' : '#F1F5F9',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Chyba', 'Zadejte prosím své jméno nebo přezdívku.');
      return;
    }

    if (!currentUser) {
      router.replace('/auth' as any);
      return;
    }

    setLoading(true);
    try {
      const updated = await updateUserProfile({
        userId: currentUser.id,
        displayName,
        color: selectedColor,
      });

      setCurrentUser(updated);

      // Also update member in local group members list
      const updatedMembers = groupMembers.map((m) =>
        m.id === updated.id ? updated : m
      );
      setGroupMembers(updatedMembers);

      // Advance to main calendar screen
      router.replace('/' as any);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Chyba', 'Nepodařilo se uložit profil. Zkontrolujte připojení.');
    } finally {
      setLoading(false);
    }
  };

  const initial = displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: ui.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: ui.text }]}>Nastavení tvého profilu</Text>
            <Text style={[styles.subtitle, { color: ui.textMuted }]}>
              Vyber si jméno a barvu, pod kterou tě v kalendáři ostatní uvidí.
            </Text>
          </View>

          {/* Interactive Live Avatar Preview */}
          <View style={styles.avatarPreviewContainer}>
            <View style={[styles.avatarCircle, { backgroundColor: selectedColor }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <Text style={[styles.avatarNamePreview, { color: ui.text }]}>
              {displayName.trim() || 'Tvoje jméno'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}>
            {/* Name Input */}
            <View style={styles.inputField}>
              <Text style={[styles.inputLabel, { color: ui.textMuted }]}>Tvoje jméno v kalendáři</Text>
              <View style={[styles.inputRow, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                <User size={19} color={ui.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: ui.text }]}
                  placeholder="např. Máma, Táta, Jirka"
                  placeholderTextColor={ui.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  maxLength={25}
                />
              </View>
            </View>

            {/* Color Swatches */}
            <View style={styles.inputField}>
              <View style={styles.labelWithIcon}>
                <Palette size={16} color={ui.textMuted} />
                <Text style={[styles.inputLabel, { color: ui.textMuted }]}>Tvoje profilová barva</Text>
              </View>

              <View style={styles.paletteGrid}>
                {MemberColors.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setSelectedColor(color)}
                    >
                      {isSelected && <Check size={22} color="#FFFFFF" strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Action CTA Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: ui.accent }]}
              activeOpacity={0.88}
              disabled={loading}
              onPress={handleSave}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>Vstoupit do kalendáře</Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarNamePreview: {
    fontSize: 19,
    fontWeight: '700',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inputField: {
    gap: 10,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  colorSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  colorSwatchSelected: {
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
