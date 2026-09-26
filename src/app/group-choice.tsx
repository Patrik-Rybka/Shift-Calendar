import React, { useState, useRef } from 'react';
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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Users,
  PlusCircle,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Share2,
  Copy,
  Crown,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { createFamilyGroup, joinFamilyGroup } from '@/services/db/groupService';
import type { DbGroup } from '@/services/db/neonClient';

export default function GroupChoiceScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const { currentUser, setCurrentUser, setCurrentGroup, setGroupMembers } = useAuthStore();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('Naše rodina');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<DbGroup | null>(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [tabBarWidth, setTabBarWidth] = useState(0);

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
    codeBg: isDark ? '#1E293B' : '#EFF6FF',
    codeBorder: isDark ? '#3B82F6' : '#93C5FD',
    successBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
    successText: isDark ? '#34D399' : '#15803D',
  };

  const switchTab = (newTab: 'create' | 'join') => {
    if (newTab === tab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(slideAnim, {
      toValue: newTab === 'create' ? 0 : 1,
      damping: 18,
      stiffness: 160,
      useNativeDriver: true,
    }).start();
    setTab(newTab);
  };

  const handleCreate = async () => {
    if (!currentUser) {
      Alert.alert('Chyba', 'Nejste přihlášeni.');
      router.replace('/auth' as any);
      return;
    }

    setLoading(true);
    try {
      const { group, user } = await createFamilyGroup({
        groupName,
        userId: currentUser.id,
      });

      setCurrentGroup(group);
      setCurrentUser(user);
      setGroupMembers([user]);

      // Show share modal with the generated code
      setCreatedGroup(group);
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('Chyba', 'Nepodařilo se vytvořit rodinnou skupinu. Zkontrolujte připojení.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareCode = async () => {
    if (!createdGroup) return;
    try {
      await Share.share({
        title: 'Pozvánka do rodinného kalendáře směn',
        message: `Ahoj! Založil(a) jsem náš rodinný kalendář směn „${createdGroup.name}“. Stáhni si aplikaci a připoj se pomocí kódu: ${createdGroup.join_code}`,
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const handleJoin = async () => {
    if (!currentUser) {
      Alert.alert('Chyba', 'Nejste přihlášeni.');
      router.replace('/auth' as any);
      return;
    }

    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length < 6) {
      Alert.alert('Neúplný kód', 'Zadejte prosím celý 6místný kód rodiny.');
      return;
    }

    setLoading(true);
    try {
      const result = await joinFamilyGroup({
        joinCode: cleanCode,
        userId: currentUser.id,
      });

      if (!result) {
        Alert.alert('Kód nenalezen', 'Zadaný 6místný kód neexistuje. Zkontrolujte jej u člena rodiny.');
        setLoading(false);
        return;
      }

      setCurrentGroup(result.group);
      setCurrentUser(result.user);
      setGroupMembers(result.members);

      // Move to profile setup
      router.replace('/profile-setup' as any);
    } catch (error) {
      console.error('Failed to join group:', error);
      Alert.alert('Chyba', 'Nepodařilo se připojit k rodině. Zkontrolujte připojení.');
    } finally {
      setLoading(false);
    }
  };

  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (tabBarWidth - 8) / 2],
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
          {/* Brand Header */}
          <View style={styles.brandHero}>
            <View style={[styles.iconBox, { backgroundColor: ui.accentGlow, borderColor: `${ui.accent}40` }]}>
              <Users size={38} color={ui.accent} strokeWidth={2.2} />
            </View>
            <Text style={[styles.title, { color: ui.text }]}>Rodinný kalendář</Text>
            <Text style={[styles.subtitle, { color: ui.textMuted }]}>
              Propojte se s rodinou. Založte nový kalendář nebo zadejte kód od člena rodiny.
            </Text>
          </View>

          {/* Success / Share Dialog when Group is Created */}
          {createdGroup ? (
            <View style={[styles.card, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}>
              <View style={styles.successBadgeRow}>
                <View style={[styles.adminTag, { backgroundColor: `${ui.accent}15` }]}>
                  <Crown size={15} color={ui.accent} />
                  <Text style={[styles.adminTagText, { color: ui.accent }]}>Jste správce kalendáře</Text>
                </View>
              </View>

              <Text style={[styles.cardHeading, { color: ui.text, textAlign: 'center', fontSize: 20 }]}>
                Kalendář „{createdGroup.name}“ byl vytvořen! 🎉
              </Text>
              <Text style={[styles.infoText, { color: ui.textMuted, textAlign: 'center' }]}>
                Pošlete tento 6místný kód rodičům nebo rodině, aby se mohli připojit ke kalendáři:
              </Text>

              {/* Big Join Code Box */}
              <View style={[styles.codeDisplayBox, { backgroundColor: ui.codeBg, borderColor: ui.codeBorder }]}>
                <Text style={[styles.codeDisplayText, { color: ui.text }]}>{createdGroup.join_code}</Text>
              </View>

              {/* Share Button (Native Android Share Dialog) */}
              <TouchableOpacity
                style={[styles.shareBtn, { backgroundColor: '#10B981' }]}
                activeOpacity={0.88}
                onPress={handleShareCode}
              >
                <Share2 size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Sdílet kód rodině (WhatsApp, SMS...)</Text>
              </TouchableOpacity>

              {/* Continue to Profile */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: ui.accent, marginTop: 4 }]}
                activeOpacity={0.88}
                onPress={() => router.replace('/profile-setup' as any)}
              >
                <Text style={styles.actionBtnText}>Pokračovat do profilu</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Animated Tab Bar */}
              <View
                style={[styles.segmentedWrapper, { backgroundColor: ui.segmentBg, borderColor: ui.cardBorder }]}
                onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
              >
                {tabBarWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.animatedPill,
                      {
                        width: (tabBarWidth - 8) / 2,
                        backgroundColor: ui.segmentIndicator,
                        transform: [{ translateX: pillTranslateX }],
                      },
                    ]}
                  />
                )}

                <Pressable
                  style={styles.segmentItem}
                  onPress={() => switchTab('create')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: tab === 'create' ? ui.text : ui.textMuted },
                      tab === 'create' && styles.segmentTextActive,
                    ]}
                  >
                    Vytvořit nový
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.segmentItem}
                  onPress={() => switchTab('join')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: tab === 'join' ? ui.text : ui.textMuted },
                      tab === 'join' && styles.segmentTextActive,
                    ]}
                  >
                    Mám kód
                  </Text>
                </Pressable>
              </View>

              {/* Tab 1: Create Group */}
              {tab === 'create' ? (
                <View style={[styles.card, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}>
                  <View style={styles.cardHeaderRow}>
                    <Sparkles size={22} color={ui.accent} />
                    <Text style={[styles.cardHeading, { color: ui.text }]}>Založit rodinný kalendář</Text>
                  </View>

                  <View style={styles.inputField}>
                    <Text style={[styles.inputLabel, { color: ui.textMuted }]}>Název kalendáře / rodiny</Text>
                    <View style={[styles.inputRow, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                      <TextInput
                        style={[styles.textInput, { color: ui.text }]}
                        placeholder="např. Kovářovi, Naše rodina"
                        placeholderTextColor={ui.textMuted}
                        value={groupName}
                        onChangeText={setGroupName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={[styles.infoBanner, { backgroundColor: `${ui.accent}12`, borderColor: `${ui.accent}30` }]}>
                    <Crown size={18} color={ui.accent} />
                    <Text style={[styles.infoText, { color: ui.text }]}>
                      Jako zakladatel budete <Text style={{ fontWeight: '700' }}>správce</Text> kalendáře (můžete přidávat vlastní směny a spravovat členy).
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: ui.accent }]}
                    activeOpacity={0.88}
                    disabled={loading}
                    onPress={handleCreate}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.actionBtnText}>Vytvořit a vygenerovat kód</Text>
                        <ArrowRight size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                /* Tab 2: Join Group */
                <View style={[styles.card, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}>
                  <View style={styles.cardHeaderRow}>
                    <KeyRound size={22} color={ui.accent} />
                    <Text style={[styles.cardHeading, { color: ui.text }]}>Zadejte 6místný kód rodiny</Text>
                  </View>

                  <View style={styles.inputField}>
                    <Text style={[styles.inputLabel, { color: ui.textMuted }]}>Kód kalendáře</Text>
                    <View style={[styles.codeInputRow, { backgroundColor: ui.codeBg, borderColor: ui.codeBorder }]}>
                      <TextInput
                        style={[styles.codeInput, { color: ui.text }]}
                        placeholder="NAPŘ. K7X9P2"
                        placeholderTextColor={ui.textMuted}
                        value={joinCode}
                        onChangeText={(val) => setJoinCode(val.toUpperCase())}
                        maxLength={6}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  <View style={[styles.infoBanner, { backgroundColor: `${ui.accent}12`, borderColor: `${ui.accent}30` }]}>
                    <CheckCircle2 size={18} color={ui.accent} />
                    <Text style={[styles.infoText, { color: ui.text }]}>
                      Kód vám sdělí ten, kdo kalendář vytvořil. Připojíte se jako člen rodiny.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: ui.accent }]}
                    activeOpacity={0.88}
                    disabled={loading}
                    onPress={handleJoin}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.actionBtnText}>Připojit se k rodině</Text>
                        <ArrowRight size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
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
  brandHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
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
    paddingHorizontal: 12,
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
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  successBadgeRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  adminTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  adminTagText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputField: {
    gap: 8,
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
    paddingHorizontal: 16,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  codeInputRow: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    width: '100%',
  },
  codeDisplayBox: {
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  codeDisplayText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  shareBtn: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
