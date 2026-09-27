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
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { shareGroupInvite } from '@/utils/shareUtils';
import {
  Users,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Share2,
  Crown,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  EyeOff,
  UserCheck,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import {
  createFamilyGroup,
  joinFamilyGroup,
  refreshUserStatus,
  cancelPendingRequest,
} from '@/services/db/groupService';
import type { DbGroup } from '@/services/db/neonClient';

export default function GroupChoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const isDark = useColorScheme() === 'dark';

  const { currentUser, currentGroup, setCurrentUser, setCurrentGroup, setGroupMembers, logout } =
    useAuthStore();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('Naše rodina');
  const [joinCode, setJoinCode] = useState('');

  // Automatické předvyplnění kódu skupiny při otevření z odkazu (?code=XYZ)
  useEffect(() => {
    if (params?.code) {
      setTab('join');
      setJoinCode(String(params.code).trim().toUpperCase());
    }
  }, [params?.code]);
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<DbGroup | null>(null);

  // Security features state for creation
  const [enablePassword, setEnablePassword] = useState(false);
  const [groupPassword, setGroupPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);

  // Security features state for join
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [showJoinPasswordInput, setShowJoinPasswordInput] = useState(false);

  // Pending approval polling / action state
  const [checkingApproval, setCheckingApproval] = useState(false);

  // Tab switch animation
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
    warningBg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
    warningText: isDark ? '#FBBF24' : '#D97706',
    warningBorder: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
  };

  const isPendingApproval = currentUser?.status === 'pending' && Boolean(currentGroup);

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

    if (enablePassword && !groupPassword.trim()) {
      Alert.alert('Chybí heslo', 'Zvolili jste ochranu heslem, ale nezadali žádné heslo.');
      return;
    }

    setLoading(true);
    try {
      const { group, user } = await createFamilyGroup({
        groupName,
        userId: currentUser.id,
        password: enablePassword ? groupPassword : null,
        requireApproval,
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
    await shareGroupInvite({
      groupName: createdGroup.name,
      joinCode: createdGroup.join_code,
      password: enablePassword && groupPassword.trim() ? groupPassword.trim() : null,
      requireApproval: requireApproval,
    });
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
        password: joinPassword.trim() || null,
      });

      if (!result.success) {
        if (result.reason === 'NOT_FOUND') {
          Alert.alert('Kód nenalezen', 'Zadaný 6místný kód neexistuje. Zkontrolujte jej u člena rodiny.');
        } else if (result.reason === 'PASSWORD_REQUIRED') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowJoinPasswordInput(true);
          Alert.alert(
            'Vyžadováno heslo',
            `Kalendář „${result.groupName || 'Rodina'}“ je chráněn heslem. Zadejte prosím heslo nebo PIN.`
          );
        } else if (result.reason === 'INCORRECT_PASSWORD') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowJoinPasswordInput(true);
          Alert.alert('Nesprávné heslo', 'Zadané heslo rodinného kalendáře není správné.');
        } else {
          Alert.alert('Chyba', 'Nepodařilo se připojit k rodině.');
        }
        setLoading(false);
        return;
      }

      // Success
      setCurrentGroup(result.group);
      setCurrentUser(result.user);
      setGroupMembers(result.members);

      if (result.status === 'pending') {
        Alert.alert(
          'Žádost odeslána! ⏳',
          `Připojení ke skupině „${result.group.name}“ vyžaduje schválení správcem. Až vás správce schválí, kalendář se vám automaticky odemkne.`
        );
      } else {
        router.replace('/profile-setup' as any);
      }
    } catch (error) {
      console.error('Failed to join group:', error);
      Alert.alert('Chyba', 'Nepodařilo se připojit k rodině. Zkontrolujte připojení.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckApproval = async () => {
    if (!currentUser) return;
    setCheckingApproval(true);
    try {
      const { user, group, members } = await refreshUserStatus(currentUser.id);
      if (!user) return;

      setCurrentUser(user);
      if (group) setCurrentGroup(group);
      if (members.length > 0) setGroupMembers(members);

      if (user.status === 'active') {
        Alert.alert('Schváleno! 🎉', 'Správce schválil vaše členství v kalendáři. Vítejte!');
        router.replace('/profile-setup' as any);
      } else if (user.status === 'rejected') {
        Alert.alert('Žádost zamítnuta', 'Vaše žádost o připojení ke kalendáři byla zamítnuta.');
        await cancelPendingRequest(currentUser.id);
        setCurrentGroup(null);
      } else {
        Alert.alert(
          'Stále čeká ⏳',
          'Správce kalendáře zatím vaši žádost neschválil. Požádejte ho o schválení v jeho aplikaci a zkuste to znovu.'
        );
      }
    } catch (error) {
      console.error('Failed to check approval status:', error);
      Alert.alert('Chyba', 'Nepodařilo se ověřit stav schválení. Zkontrolujte připojení.');
    } finally {
      setCheckingApproval(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!currentUser) return;
    Alert.alert(
      'Zrušit žádost?',
      'Opravdu si přejete zrušit žádost o připojení k tomuto kalendáři?',
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Ano, zrušit',
          style: 'destructive',
          onPress: async () => {
            setCheckingApproval(true);
            try {
              const updated = await cancelPendingRequest(currentUser.id);
              if (updated) {
                setCurrentUser(updated);
              }
              setCurrentGroup(null);
            } catch (e) {
              console.error('Failed to cancel request:', e);
            } finally {
              setCheckingApproval(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    logout();
    router.replace('/welcome' as any);
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
          {/* Top navigation row with subtle Logout */}
          <View style={styles.topNavRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[styles.logoutBtn, { borderColor: ui.cardBorder }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={15} color={ui.textMuted} />
              <Text style={[styles.logoutBtnText, { color: ui.textMuted }]}>Odhlásit</Text>
            </TouchableOpacity>
          </View>

          {/* Brand Hero */}
          <View style={styles.brandHero}>
            <View style={[styles.iconBox, { backgroundColor: ui.accentGlow, borderColor: `${ui.accent}40` }]}>
              <Users size={38} color={ui.accent} strokeWidth={2.2} />
            </View>
            <Text style={[styles.title, { color: ui.text }]}>Rodinný kalendář</Text>
            <Text style={[styles.subtitle, { color: ui.textMuted }]}>
              Propojte se s rodinou. Založte nový kalendář nebo zadejte kód od člena rodiny.
            </Text>
          </View>

          {/* SCENARIO A: PENDING APPROVAL SCREEN */}
          {isPendingApproval ? (
            <View style={[styles.card, { backgroundColor: ui.card, borderColor: ui.cardBorder }]}>
              <View style={styles.pendingBadgeRow}>
                <View style={[styles.statusTag, { backgroundColor: ui.warningBg, borderColor: ui.warningBorder }]}>
                  <Clock size={16} color={ui.warningText} />
                  <Text style={[styles.statusTagText, { color: ui.warningText }]}>
                    Čeká na schválení správcem
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardHeading, { color: ui.text, textAlign: 'center', fontSize: 20 }]}>
                Žádost o připojení odeslána ⏳
              </Text>

              <Text style={[styles.infoText, { color: ui.textMuted, textAlign: 'center' }]}>
                Požádali jste o připojení ke kalendáři:
              </Text>

              <View style={[styles.pendingGroupCard, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                <Users size={22} color={ui.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pendingGroupName, { color: ui.text }]}>{currentGroup?.name}</Text>
                  <Text style={[styles.pendingGroupCode, { color: ui.textMuted }]}>
                    Kód rodiny: {currentGroup?.join_code}
                  </Text>
                </View>
              </View>

              <View style={[styles.infoBanner, { backgroundColor: `${ui.accent}12`, borderColor: `${ui.accent}30` }]}>
                <ShieldCheck size={20} color={ui.accent} />
                <Text style={[styles.infoText, { color: ui.text }]}>
                  Správce kalendáře musí vaše členství potvrdit ve své aplikaci. Jakmile vás schválí,
                  kalendář se vám ihned odemkne.
                </Text>
              </View>

              {/* Refresh / Check Status Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: ui.accent }]}
                activeOpacity={0.88}
                disabled={checkingApproval}
                onPress={handleCheckApproval}
              >
                {checkingApproval ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <RefreshCw size={19} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Zkontrolovat stav schválení</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Cancel Request Button */}
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: ui.cardBorder }]}
                activeOpacity={0.7}
                disabled={checkingApproval}
                onPress={handleCancelRequest}
              >
                <Text style={[styles.cancelBtnText, { color: ui.textMuted }]}>
                  Zrušit žádost a zvolit jiný kalendář
                </Text>
              </TouchableOpacity>
            </View>
          ) : createdGroup ? (
            /* SCENARIO B: SUCCESS SHARE MODAL AFTER CREATION */
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

              {/* Security info pills */}
              <View style={styles.securityPillsRow}>
                {enablePassword && groupPassword.trim().length > 0 && (
                  <View style={[styles.securityPill, { backgroundColor: `${ui.accent}14` }]}>
                    <Lock size={13} color={ui.accent} />
                    <Text style={[styles.securityPillText, { color: ui.accent }]}>
                      Heslo: <Text style={{ fontWeight: '800' }}>{groupPassword.trim()}</Text>
                    </Text>
                  </View>
                )}
                {requireApproval ? (
                  <View style={[styles.securityPill, { backgroundColor: ui.warningBg }]}>
                    <ShieldAlert size={13} color={ui.warningText} />
                    <Text style={[styles.securityPillText, { color: ui.warningText }]}>
                      Schvalování členů aktivní
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.securityPill, { backgroundColor: ui.successBg }]}>
                    <UserCheck size={13} color={ui.successText} />
                    <Text style={[styles.securityPillText, { color: ui.successText }]}>
                      Připojení bez čekání
                    </Text>
                  </View>
                )}
              </View>

              {/* Share Button (Native Android Share Dialog) */}
              <TouchableOpacity
                style={[styles.shareBtn, { backgroundColor: '#10B981' }]}
                activeOpacity={0.88}
                onPress={handleShareCode}
              >
                <Share2 size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Sdílet kód a heslo</Text>
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
            /* SCENARIO C: CREATE OR JOIN TABS */
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

                <Pressable style={styles.segmentItem} onPress={() => switchTab('create')}>
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

                <Pressable style={styles.segmentItem} onPress={() => switchTab('join')}>
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

                  {/* Security Section */}
                  <View style={styles.sectionDivider} />
                  <View style={styles.securityHeaderRow}>
                    <Shield size={18} color={ui.accent} />
                    <Text style={[styles.sectionTitle, { color: ui.text }]}>Zabezpečení a přístup</Text>
                  </View>

                  {/* 1) Group Password Toggle */}
                  <View style={[styles.toggleCard, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                    <View style={styles.toggleCardLeft}>
                      <View style={[styles.smallIconCircle, { backgroundColor: `${ui.accent}18` }]}>
                        <Lock size={16} color={ui.accent} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.toggleCardTitle, { color: ui.text }]}>
                          Heslo / PIN skupiny
                        </Text>
                        <Text style={[styles.toggleCardDesc, { color: ui.textMuted }]}>
                          Vyžadovat heslo kromě 6místného kódu
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={enablePassword}
                      onValueChange={(val) => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setEnablePassword(val);
                      }}
                      trackColor={{ false: ui.cardBorder, true: ui.accent }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Group Password Input (when enabled) */}
                  {enablePassword && (
                    <View style={styles.inputField}>
                      <Text style={[styles.inputLabel, { color: ui.textMuted }]}>
                        Heslo nebo PIN rodiny
                      </Text>
                      <View style={[styles.inputRow, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                        <TextInput
                          style={[styles.textInput, { color: ui.text }]}
                          placeholder="např. tajneheslo123 nebo 1234"
                          placeholderTextColor={ui.textMuted}
                          value={groupPassword}
                          onChangeText={setGroupPassword}
                          secureTextEntry={!showCreatePassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowCreatePassword(!showCreatePassword)}
                          style={styles.eyeBtn}
                          activeOpacity={0.7}
                        >
                          {showCreatePassword ? (
                            <EyeOff size={18} color={ui.textMuted} />
                          ) : (
                            <Eye size={18} color={ui.textMuted} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 2) Admission Policy Selector (Auto vs Approval) */}
                  <View style={styles.inputField}>
                    <Text style={[styles.inputLabel, { color: ui.textMuted }]}>
                      PŘIJÍMÁNÍ NOVÝCH ČLENŮ
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.policyOptionCard,
                        {
                          backgroundColor: !requireApproval ? `${ui.accent}10` : ui.inputBg,
                          borderColor: !requireApproval ? ui.accent : ui.inputBorder,
                        },
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setRequireApproval(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, { borderColor: !requireApproval ? ui.accent : ui.textMuted }]}>
                        {!requireApproval && <View style={[styles.radioDot, { backgroundColor: ui.accent }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.policyTitleRow}>
                          <UserCheck size={16} color={!requireApproval ? ui.accent : ui.text} />
                          <Text style={[styles.policyTitle, { color: ui.text }]}>Automaticky přidávat</Text>
                        </View>
                        <Text style={[styles.policyDesc, { color: ui.textMuted }]}>
                          Kdokoliv s platným kódem (a heslem) se ihned připojí k rodině.
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.policyOptionCard,
                        {
                          backgroundColor: requireApproval ? `${ui.accent}10` : ui.inputBg,
                          borderColor: requireApproval ? ui.accent : ui.inputBorder,
                        },
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setRequireApproval(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, { borderColor: requireApproval ? ui.accent : ui.textMuted }]}>
                        {requireApproval && <View style={[styles.radioDot, { backgroundColor: ui.accent }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.policyTitleRow}>
                          <ShieldCheck size={16} color={requireApproval ? ui.accent : ui.text} />
                          <Text style={[styles.policyTitle, { color: ui.text }]}>Vyžadovat schválení správcem</Text>
                        </View>
                        <Text style={[styles.policyDesc, { color: ui.textMuted }]}>
                          Nový člen musí počkat, až jeho žádost schválíte ve správě skupiny.
                        </Text>
                      </View>
                    </TouchableOpacity>
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

                  {/* Password Input (shown when required by the group or toggled) */}
                  {showJoinPasswordInput && (
                    <View style={styles.inputField}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Lock size={14} color={ui.accent} />
                        <Text style={[styles.inputLabel, { color: ui.text }]}>Heslo / PIN skupiny</Text>
                      </View>
                      <View style={[styles.inputRow, { backgroundColor: ui.inputBg, borderColor: ui.accent }]}>
                        <TextInput
                          style={[styles.textInput, { color: ui.text }]}
                          placeholder="Zadejte heslo kalendáře"
                          placeholderTextColor={ui.textMuted}
                          value={joinPassword}
                          onChangeText={setJoinPassword}
                          secureTextEntry={!showJoinPassword}
                          autoCapitalize="none"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => setShowJoinPassword(!showJoinPassword)}
                          style={styles.eyeBtn}
                          activeOpacity={0.7}
                        >
                          {showJoinPassword ? (
                            <EyeOff size={18} color={ui.textMuted} />
                          ) : (
                            <Eye size={18} color={ui.textMuted} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={[styles.infoBanner, { backgroundColor: `${ui.accent}12`, borderColor: `${ui.accent}30` }]}>
                    <CheckCircle2 size={18} color={ui.accent} />
                    <Text style={[styles.infoText, { color: ui.text }]}>
                      Kód (a případné heslo) vám sdělí ten, kdo kalendář vytvořil.
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
    paddingTop: 12,
    paddingBottom: 32,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
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
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 4,
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  smallIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  toggleCardDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  policyOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  policyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },
  policyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  policyDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  successBadgeRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingBadgeRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pendingGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 4,
  },
  pendingGroupName: {
    fontSize: 16,
    fontWeight: '700',
  },
  pendingGroupCode: {
    fontSize: 13,
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
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
  securityPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 4,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  securityPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputField: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
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
  eyeBtn: {
    padding: 8,
    marginLeft: 6,
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
