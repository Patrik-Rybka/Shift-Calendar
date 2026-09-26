import React, { useState, useRef, useEffect } from 'react';
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
  Pressable,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CalendarDays,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { loginUser, registerUser } from '@/services/db/authService';

export default function AuthScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const { setCurrentUser, setCurrentGroup, setGroupMembers } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = login, 1 = register
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);

  // Modern UI palette
  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    inputBg: isDark ? '#161F33' : '#F1F5F9',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    accentGlow: 'rgba(59, 130, 246, 0.15)',
    segmentBg: isDark ? '#141D30' : '#E2E8F0',
    segmentIndicator: isDark ? '#1E293B' : '#FFFFFF',
  };

  const switchMode = (newMode: 'login' | 'register') => {
    if (newMode === mode) return;

    // Smooth layout expansion for inputs
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Fade transition for form
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.6,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    // Slide pill transition
    Animated.spring(slideAnim, {
      toValue: newMode === 'login' ? 0 : 1,
      damping: 18,
      stiffness: 160,
      useNativeDriver: true,
    }).start();

    setMode(newMode);
  };

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      damping: 12,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleSubmit = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('Chybějící údaj', 'Zadejte prosím e-mail nebo telefon.');
      return;
    }
    if (!password || password.length < 4) {
      Alert.alert('Krátké heslo', 'Heslo musí mít alespoň 4 znaky.');
      return;
    }
    if (mode === 'register' && !displayName.trim()) {
      Alert.alert('Chybějící jméno', 'Zadejte prosím své jméno nebo přezdívku.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await loginUser(emailOrPhone, password);
        if (!result) {
          Alert.alert('Přihlášení selhalo', 'Zadaný e-mail/telefon nebo heslo není správné.');
          setLoading(false);
          return;
        }

        setCurrentUser(result.user);
        setCurrentGroup(result.group);
        setGroupMembers(result.members);

        if (result.group) {
          router.replace('/' as any);
        } else {
          router.replace('/group-choice' as any);
        }
      } else {
        const newUser = await registerUser({
          emailOrPhone,
          password,
          displayName,
        });

        setCurrentUser(newUser);
        setCurrentGroup(null);
        setGroupMembers([newUser]);

        router.replace('/group-choice' as any);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error?.message?.includes('unique') || error?.code === '23505') {
        Alert.alert('Účet existuje', 'Uživatel s tímto e-mailem nebo telefonem již existuje. Přihlaste se.');
      } else {
        Alert.alert('Chyba spojení', 'Nepodařilo se připojit k databázi. Zkontrolujte připojení k internetu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (segmentWidth - 8) / 2],
  });

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
          {/* Top Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ArrowLeft size={20} color={ui.text} />
            </TouchableOpacity>
          </View>

          {/* Brand Icon & Welcome */}
          <View style={styles.brandHero}>
            <View style={[styles.appLogoBox, { backgroundColor: ui.accentGlow, borderColor: `${ui.accent}40` }]}>
              <CalendarDays size={38} color={ui.accent} strokeWidth={2.2} />
            </View>
            <Text style={[styles.title, { color: ui.text }]}>
              {mode === 'login' ? 'Přihlášení k rodině' : 'Vytvoření nového profilu'}
            </Text>
            <Text style={[styles.subtitle, { color: ui.textMuted }]}>
              {mode === 'login'
                ? 'Zadejte své údaje a mějte rodinný rozpis směn okamžitě po ruce.'
                : 'Založte si profil, abyste mohli okamžitě zapisovat a sdílet směny.'}
            </Text>
          </View>

          {/* Animated Segmented Switcher */}
          <View
            style={[styles.segmentedWrapper, { backgroundColor: ui.segmentBg, borderColor: ui.cardBorder }]}
            onLayout={(e) => setSegmentWidth(e.nativeEvent.layout.width)}
          >
            {segmentWidth > 0 && (
              <Animated.View
                style={[
                  styles.animatedPill,
                  {
                    width: (segmentWidth - 8) / 2,
                    backgroundColor: ui.segmentIndicator,
                    transform: [{ translateX: pillTranslateX }],
                  },
                ]}
              />
            )}

            <Pressable
              style={styles.segmentItem}
              onPress={() => switchMode('login')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: mode === 'login' ? ui.text : ui.textMuted },
                  mode === 'login' && styles.segmentTextActive,
                ]}
              >
                Přihlášení
              </Text>
            </Pressable>

            <Pressable
              style={styles.segmentItem}
              onPress={() => switchMode('register')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: mode === 'register' ? ui.text : ui.textMuted },
                  mode === 'register' && styles.segmentTextActive,
                ]}
              >
                Registrace
              </Text>
            </Pressable>
          </View>

          {/* Animated Input Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              {
                backgroundColor: ui.card,
                borderColor: ui.cardBorder,
                opacity: fadeAnim,
              },
            ]}
          >
            {mode === 'register' && (
              <View style={styles.inputField}>
                <Text style={[styles.inputLabel, { color: ui.textMuted }]}>Jméno / Přezdívka</Text>
                <View style={[styles.inputRow, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                  <User size={19} color={ui.textMuted} />
                  <TextInput
                    style={[styles.textInput, { color: ui.text }]}
                    placeholder="např. Tomáš, Petr..."
                    placeholderTextColor={ui.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputField}>
              <Text style={[styles.inputLabel, { color: ui.textMuted }]}>E-mail nebo Telefon</Text>
              <View style={[styles.inputRow, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                <Mail size={19} color={ui.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: ui.text }]}
                  placeholder="např. email@email.cz"
                  placeholderTextColor={ui.textMuted}
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputField}>
              <Text style={[styles.inputLabel, { color: ui.textMuted }]}>Heslo</Text>
              <View style={[styles.inputRow, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                <Lock size={19} color={ui.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: ui.text }]}
                  placeholder="Zadejte heslo"
                  placeholderTextColor={ui.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOff size={19} color={ui.textMuted} />
                  ) : (
                    <Eye size={19} color={ui.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Tactile Animated CTA Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: ui.accent }]}
                activeOpacity={0.9}
                disabled={loading}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Quick Switcher Link */}
          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={[styles.switchLinkText, { color: ui.textMuted }]}>
              {mode === 'login' ? 'Nemáte ještě účet? ' : 'Již máte svůj účet? '}
              <Text style={{ color: ui.accent, fontWeight: '700' }}>
                {mode === 'login' ? 'Zaregistrujte se' : 'Přihlaste se'}
              </Text>
            </Text>
          </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 32,
  },
  navRow: {
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appLogoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  segmentedWrapper: {
    position: 'relative',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    height: 48,
    alignItems: 'center',
  },
  animatedPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  segmentItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inputField: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  switchLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  switchLinkText: {
    fontSize: 14,
  },
});
