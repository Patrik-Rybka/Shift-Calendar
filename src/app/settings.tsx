import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Sparkles,
  Users,
  User,
  Crown,
  Copy,
  CheckCheck,
  UserPlus,
  Share2,
  ShieldCheck,
  Sliders,
  ChevronDown,
  ChevronUp,
  UserMinus,
  KeyRound,
  LockOpen,
  Lock,
  Eye,
  EyeOff,
  BadgeCheck,
  ClipboardList,
  Settings,
  Palette,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Smartphone,
  Type,
  Maximize2,
  Minimize2,
  Info,
  LogOut,
  RefreshCw,
} from 'lucide-react-native';

import { UpdateModal } from '@/components/common/UpdateModal';
import {
  checkForUpdate,
  getCurrentAppVersion,
  ReleaseInfo,
} from '@/services/updateService';
import { shareGroupInvite } from '@/utils/shareUtils';

import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ShiftPalette, MemberColors } from '@/constants/theme';
import {
  createCustomPreset,
  updatePreset,
  deletePreset,
} from '@/services/db/shiftService';
import {
  refreshUserStatus,
  addVirtualFamilyMember,
  getPendingMembers,
  approveMember,
  rejectMember,
  removeMemberFromGroup,
  updateMemberRole,
  updateMemberPermissions,
  updateGroupPassword,
  updateGroupApprovalPolicy,
} from '@/services/db/groupService';
import type { DbShiftPreset } from '@/services/db/neonClient';
import { DEFAULT_MEMBER_PERMISSIONS, type MemberPermissions } from '@/services/db/neonClient';
import type { DbUser } from '@/services/db/neonClient';

function calculateShiftHours(startTime: string, endTime: string): number {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  if (isNaN(sH) || isNaN(eH)) return 8;
  let diffMinutes = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  return Math.round((diffMinutes / 60) * 10) / 10;
}

const PERMISSION_ROWS: {
  key: keyof MemberPermissions;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
}[] = [
    {
      key: 'canViewCalendar',
      label: 'Zobrazit kalendář',
      sublabel: 'Může otevřít a prohlížet rodinný kalendář',
      icon: null,
      color: '#3B82F6',
    },
    {
      key: 'canEditOwnShifts',
      label: 'Zapisovat vlastní směny',
      sublabel: 'Může přidávat a mazat pouze své vlastní směny',
      icon: null,
      color: '#0D9488',
    },
    {
      key: 'canEditAllShifts',
      label: 'Zapisovat všem',
      sublabel: 'Může přidávat a mazat směny komukoliv v rodině',
      icon: null,
      color: '#8B5CF6',
    },
    {
      key: 'canAddNotes',
      label: 'Přidávat poznámky',
      sublabel: 'Může přidávat a mazat poznámky ke dnům',
      icon: null,
      color: '#F59E0B',
    },
    {
      key: 'canManagePresets',
      label: 'Spravovat předvolby směn',
      sublabel: 'Může vytvářet, upravovat a mazat typy směn',
      icon: null,
      color: '#EC4899',
    },
  ];

export default function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const {
    currentGroup,
    setCurrentGroup,
    currentUser,
    groupMembers,
    setGroupMembers,
    logout,
  } = useAuthStore();
  const { presets, setPresets } = useShiftStore();
  const {
    cellStyle,
    setCellStyle,
    firstDayOfWeek,
    setFirstDayOfWeek,
    showWeekNumbers,
    setShowWeekNumbers,
    highlightWeekends,
    setHighlightWeekends,
    todayHighlightStyle,
    setTodayHighlightStyle,
    showHolidays,
    setShowHolidays,
    hiddenMemberIds,
    toggleMemberVisibility,
    setAllMembersVisible,
    defaultEditMemberMode,
    setDefaultEditMemberMode,
    memberOrderIds,
    moveMemberOrder,
    themeMode,
    setThemeMode,
    fontSizeScale,
    setFontSizeScale,
    calendarDensity,
    setCalendarDensity,
  } = useSettingsStore();

  const allMemberIds = React.useMemo(() => groupMembers.map((m) => m.id), [groupMembers]);
  const orderedMembers = React.useMemo(() => {
    if (!groupMembers || groupMembers.length === 0) return [];
    if (!memberOrderIds || memberOrderIds.length === 0) return groupMembers;

    return [...groupMembers].sort((a, b) => {
      const idxA = memberOrderIds.indexOf(a.id);
      const idxB = memberOrderIds.indexOf(b.id);
      const sortA = idxA === -1 ? 9999 : idxA;
      const sortB = idxB === -1 ? 9999 : idxB;
      return sortA - sortB;
    });
  }, [groupMembers, memberOrderIds]);

  const isAdmin = currentUser?.role === 'admin';

  // ─── Section 7.1: Preset Modal State ────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPreset, setEditingPreset] = useState<DbShiftPreset | null>(null);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('18:00');
  const [hours, setHours] = useState('12');
  const [color, setColor] = useState<string>(ShiftPalette[0].hex);
  const [hasSpecificTime, setHasSpecificTime] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Section 7.2: Add Virtual Member ────────────────────────────────────────
  const [copiedCode, setCopiedCode] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState<string>(MemberColors[0]);
  const [addingMember, setAddingMember] = useState(false);

  // ─── Section 7.3: Admin Pending Queue ───────────────────────────────────────
  const [pendingMembers, setPendingMembers] = useState<DbUser[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // ─── Section 7.3: Permissions Management ────────────────────────────────────
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [updatingPermId, setUpdatingPermId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ─── Section 7.3: Group Security ────────────────────────────────────────────
  const [changePwdVisible, setChangePwdVisible] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [updatingSecurity, setUpdatingSecurity] = useState(false);
  const [updatingApproval, setUpdatingApproval] = useState(false);

  // ─── Section 7.4F / 8.1: Account & App ─────────────────────────────────────────────
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [availableRelease, setAvailableRelease] = useState<ReleaseInfo | null>(null);

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentUser?.id) {
      refreshUserStatus(currentUser.id)
        .then(({ group, members }) => {
          if (group) setCurrentGroup(group);
          if (members && members.length > 0) setGroupMembers(members);
        })
        .catch((err) => console.log('Settings refresh error:', err));
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isAdmin && currentGroup?.id) {
      getPendingMembers(currentGroup.id)
        .then(setPendingMembers)
        .catch((err) => console.log('Pending members error:', err));
    }
  }, [isAdmin, currentGroup?.id]);

  // ─── Theme ────────────────────────────────────────────────────────────────────
  const ui = {
    bg: isDark ? '#090D16' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    inputBg: isDark ? '#161F33' : '#F1F5F9',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    deleteBg: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
    deleteColor: isDark ? '#F87171' : '#DC2626',
    successBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
    successBorder: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
    successText: '#10B981',
    warningBg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
    warningText: '#F59E0B',
    adminColor: '#F59E0B',
  };

  // ─── 7.1 Handlers: Presets ────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingPreset(null);
    setTitle('');
    setStartTime('06:00');
    setEndTime('18:00');
    setHours('12');
    setColor(ShiftPalette[0].hex);
    setHasSpecificTime(false);
    setTargetUserId(null);
    setModalVisible(true);
  };

  const openEditModal = (preset: DbShiftPreset) => {
    setEditingPreset(preset);
    setTitle(preset.title);
    setStartTime(preset.start_time || '06:00');
    setEndTime(preset.end_time || '18:00');
    setHours(preset.hours !== undefined && preset.hours !== null ? preset.hours.toString() : '8');
    setColor(preset.color || ShiftPalette[0].hex);
    setHasSpecificTime(Boolean(preset.start_time && preset.end_time));
    setTargetUserId(preset.user_id || null);
    setModalVisible(true);
  };

  const handleTimeChange = (type: 'start' | 'end', val: string) => {
    if (type === 'start') {
      setStartTime(val);
      if (hasSpecificTime && val.length === 5 && endTime.length === 5) {
        setHours(calculateShiftHours(val, endTime).toString());
      }
    } else {
      setEndTime(val);
      if (hasSpecificTime && startTime.length === 5 && val.length === 5) {
        setHours(calculateShiftHours(startTime, val).toString());
      }
    }
  };

  const handleSavePreset = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) { Alert.alert('Chybí název', 'Zadejte prosím název směny.'); return; }
    if (!currentGroup?.id) { Alert.alert('Chyba', 'Chybí přiřazená rodinná skupina.'); return; }
    setSubmitting(true);
    const parsedHours = hasSpecificTime ? (parseFloat(hours) || 0) : 0;
    const finalStart = hasSpecificTime ? startTime.trim() : null;
    const finalEnd = hasSpecificTime ? endTime.trim() : null;
    const shortCode = cleanTitle.slice(0, 3).toUpperCase();
    try {
      if (editingPreset) {
        const updated = await updatePreset({ presetId: editingPreset.id, userId: targetUserId, title: cleanTitle, startTime: finalStart, endTime: finalEnd, color, shortCode, hours: parsedHours });
        setPresets(presets.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createCustomPreset({ groupId: currentGroup.id, userId: targetUserId, title: cleanTitle, startTime: finalStart, endTime: finalEnd, color, shortCode, hours: parsedHours });
        setPresets([...presets, created]);
      }
      setModalVisible(false);
    } catch (e) {
      console.error('Failed to save preset:', e);
      Alert.alert('Chyba', 'Nepodařilo se uložit typ směny.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePreset = (preset: DbShiftPreset) => {
    Alert.alert('Smazat typ směny?', `Opravdu si přejete smazat směnu „${preset.title}"?`, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat', style: 'destructive',
        onPress: async () => {
          setDeletingId(preset.id);
          try {
            const ok = await deletePreset(preset.id);
            if (ok) setPresets(presets.filter((p) => p.id !== preset.id));
            else Alert.alert('Chyba', 'Nepodařilo se smazat směnu.');
          } catch { Alert.alert('Chyba', 'Nepodařilo se smazat směnu.'); }
          finally { setDeletingId(null); }
        },
      },
    ]);
  };

  // ─── 7.2 Handlers: Join Code + Virtual Member ─────────────────────────────────
  const handleCopyJoinCode = async () => {
    if (!currentGroup?.join_code) return;
    try {
      await Clipboard.setStringAsync(currentGroup.join_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (e) { console.error(e); }
  };

  const handleShareInvite = async () => {
    if (!currentGroup?.join_code) return;
    await shareGroupInvite({
      groupName: currentGroup.name || 'Rodinný kalendář',
      joinCode: currentGroup.join_code,
      requireApproval: currentGroup.require_approval,
    });
  };

  const handleAddMember = async () => {
    const cleanName = newMemberName.trim();
    if (!cleanName) { Alert.alert('Chybí jméno', 'Zadejte prosím jméno nového člena.'); return; }
    if (!currentGroup?.id) return;
    setAddingMember(true);
    try {
      const created = await addVirtualFamilyMember({ groupId: currentGroup.id, displayName: cleanName, color: newMemberColor });
      setGroupMembers([...groupMembers, created]);
      setAddMemberVisible(false);
      setNewMemberName('');
      Alert.alert('Člen přidán', `„${cleanName}" byl úspěšně přidán.`);
    } catch { Alert.alert('Chyba', 'Nepodařilo se přidat člena.'); }
    finally { setAddingMember(false); }
  };

  // ─── 7.3 Handlers: Pending Queue ─────────────────────────────────────────────
  const handleApproveMember = async (member: DbUser) => {
    setApprovingId(member.id);
    try {
      const updated = await approveMember(member.id);
      if (updated) {
        setPendingMembers((prev) => prev.filter((m) => m.id !== member.id));
        setGroupMembers([...groupMembers, updated]);
        Alert.alert('Schváleno', `„${member.display_name}" byl přidán do rodiny.`);
      }
    } catch { Alert.alert('Chyba', 'Nepodařilo se schválit člena.'); }
    finally { setApprovingId(null); }
  };

  const handleRejectMember = (member: DbUser) => {
    Alert.alert('Odmítnout žádost?', `Chcete odmítnout žádost uživatele „${member.display_name}"?`, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Odmítnout', style: 'destructive',
        onPress: async () => {
          setRejectingId(member.id);
          try {
            const ok = await rejectMember(member.id);
            if (ok) setPendingMembers((prev) => prev.filter((m) => m.id !== member.id));
          } catch { Alert.alert('Chyba', 'Nepodařilo se odmítnout žádost.'); }
          finally { setRejectingId(null); }
        },
      },
    ]);
  };

  // ─── 7.3 Handlers: Permissions ───────────────────────────────────────────────
  const handleTogglePermission = async (member: DbUser, key: keyof MemberPermissions, val: boolean) => {
    if (member.role === 'admin') return;
    const current: MemberPermissions = member.permissions ?? DEFAULT_MEMBER_PERMISSIONS;
    const updated: MemberPermissions = { ...current, [key]: val };
    setUpdatingPermId(member.id);
    try {
      const result = await updateMemberPermissions(member.id, updated);
      if (result) setGroupMembers(groupMembers.map((m) => m.id === result.id ? result : m));
    } catch { Alert.alert('Chyba', 'Nepodařilo se aktualizovat oprávnění.'); }
    finally { setUpdatingPermId(null); }
  };

  const handleToggleRole = (member: DbUser) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const msg = newRole === 'admin'
      ? `Povýšit „${member.display_name}" na Správce? Získá všechna oprávnění.`
      : `Odebrat správcovství uživateli „${member.display_name}"? Vrátí se k výchozím oprávněním člena.`;
    Alert.alert(newRole === 'admin' ? 'Povýšit na Správce?' : 'Odebrat správcovství?', msg, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: newRole === 'admin' ? 'Povýšit' : 'Odebrat',
        style: newRole === 'admin' ? 'default' : 'destructive',
        onPress: async () => {
          setUpdatingRoleId(member.id);
          try {
            const result = await updateMemberRole(member.id, newRole);
            if (result) setGroupMembers(groupMembers.map((m) => m.id === result.id ? result : m));
          } catch { Alert.alert('Chyba', 'Nepodařilo se změnit roli.'); }
          finally { setUpdatingRoleId(null); }
        },
      },
    ]);
  };

  const handleRemoveMember = (member: DbUser) => {
    Alert.alert('Odebrat ze skupiny?', `Opravdu si přejete odebrat „${member.display_name}" z rodinného kalendáře? Budou ztraceny všechny jejich zapsané směny.`, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Odebrat', style: 'destructive',
        onPress: async () => {
          setRemovingId(member.id);
          try {
            const ok = await removeMemberFromGroup(member.id);
            if (ok) {
              setGroupMembers(groupMembers.filter((m) => m.id !== member.id));
              if (expandedMemberId === member.id) setExpandedMemberId(null);
            }
          } catch { Alert.alert('Chyba', 'Nepodařilo se odebrat člena.'); }
          finally { setRemovingId(null); }
        },
      },
    ]);
  };

  // ─── 7.3 Handlers: Group Security ────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!currentGroup?.id) return;
    setUpdatingSecurity(true);
    try {
      const updated = await updateGroupPassword(currentGroup.id, newPwd.trim() || null);
      if (updated) {
        setCurrentGroup(updated);
        setChangePwdVisible(false);
        setNewPwd('');
        Alert.alert('Uloženo', newPwd.trim() ? 'Heslo skupiny bylo změněno.' : 'Heslo skupiny bylo odebráno.');
      }
    } catch { Alert.alert('Chyba', 'Nepodařilo se změnit heslo skupiny.'); }
    finally { setUpdatingSecurity(false); }
  };

  const handleToggleApproval = async (val: boolean) => {
    if (!currentGroup?.id) return;
    setUpdatingApproval(true);
    try {
      const updated = await updateGroupApprovalPolicy(currentGroup.id, val);
      if (updated) setCurrentGroup(updated);
    } catch { Alert.alert('Chyba', 'Nepodařilo se aktualizovat nastavení.'); }
    finally { setUpdatingApproval(false); }
  };

  // ─── 7.4F / 8.1 Handlers: Account & App ───────────────────────────────────────
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const result = await checkForUpdate();
      if (result.hasUpdate && result.release) {
        setAvailableRelease(result.release);
        setUpdateModalVisible(true);
      } else if (result.error) {
        Alert.alert('Kontrola aktualizací', result.error);
      } else {
        Alert.alert(
          'Aplikace je aktuální',
          result.message || `Máte nainstalovanou nejnovější verzi Kalendáře směn (v${getCurrentAppVersion()}).`,
          [{ text: 'Rozumím', style: 'default' }]
        );
      }
    } catch {
      Alert.alert('Chyba', 'Nepodařilo se ověřit aktualizace. Zkontrolujte připojení k internetu.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLeaveGroup = () => {
    if (!currentUser?.id || !currentGroup?.id) return;

    Alert.alert(
      'Opustit rodinnou skupinu?',
      `Opravdu chcete odejít ze skupiny „${currentGroup.name}“? Ztratíte přístup k tomuto rodinnému kalendáři a budete si muset vybrat nebo založit novou skupinu.`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Opustit skupinu',
          style: 'destructive',
          onPress: async () => {
            setLeavingGroup(true);
            try {
              await removeMemberFromGroup(currentUser.id);
              setCurrentGroup(null);
              setGroupMembers([]);
              router.replace('/group-choice' as any);
            } catch {
              Alert.alert('Chyba', 'Nepodařilo se opustit skupinu. Zkuste to prosím znovu.');
            } finally {
              setLeavingGroup(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Odhlásit se?',
      'Opravdu se chcete odhlásit ze svého účtu? Vaše směny zůstanou bezpečně uloženy v cloudu.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odhlásit se',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const isVirtual = (m: DbUser) =>
    m.email_or_phone?.startsWith('virtual_') || m.password_hash === 'virtual_profile';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: ui.bg }]}>
      {/* Top Header */}
      <View style={[styles.headerRow, { borderBottomColor: ui.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: ui.card, borderColor: ui.border }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={ui.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: ui.text }]}>Nastavení</Text>
          <Text style={[styles.headerSubtitle, { color: ui.textMuted }]}>
            {currentGroup?.name || 'Rodinný kalendář'} • {currentGroup?.join_code || '------'}
          </Text>
        </View>
        {isAdmin && (
          <View style={[styles.adminHeaderBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Crown size={13} color={ui.adminColor} />
            <Text style={[styles.adminHeaderBadgeText, { color: ui.adminColor }]}>Správce</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.1 — Typy směn / Předvolby
        ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconCircle, { backgroundColor: `${ui.accent}15` }]}>
                  <Clock size={18} color={ui.accent} />
                </View>
                <Text style={[styles.sectionTitle, { color: ui.text }]}>Typy směn (Předvolby)</Text>
              </View>
              <TouchableOpacity
                style={[styles.sectionActionBtn, { backgroundColor: ui.accent }]}
                onPress={openCreateModal}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.sectionActionBtnText}>Nová směna</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
              Předvolby pro celou rodinu i osobní směny jednotlivých členů
            </Text>
          </View>

          <View style={styles.listContainer}>
            {presets.map((preset) => {
              const bg = preset.color || '#3B82F6';
              const isDeleting = deletingId === preset.id;
              const hasTimes = Boolean(preset.start_time && preset.end_time);
              const ownerMember = preset.user_id ? groupMembers.find((m) => m.id === preset.user_id) : null;
              const isOwnerCurrent = preset.user_id === currentUser?.id;

              return (
                <View key={preset.id} style={[styles.presetCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
                  <View style={[styles.presetColorBar, { backgroundColor: bg }]} />
                  <TouchableOpacity style={styles.presetContent} activeOpacity={0.7} onPress={() => openEditModal(preset)}>
                    <View style={styles.presetTitleRow}>
                      <Text style={[styles.presetTitle, { color: ui.text }]}>{preset.title}</Text>
                      {preset.user_id ? (
                        <View style={[styles.scopeBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF', borderColor: isDark ? 'rgba(59,130,246,0.4)' : '#BFDBFE' }]}>
                          <User size={9} color={ui.accent} />
                          <Text style={[styles.scopeBadgeText, { color: ui.accent }]}>
                            {isOwnerCurrent ? 'Pouze Vy' : `Pouze ${ownerMember?.display_name || 'osobní'}`}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.scopeBadge, { backgroundColor: ui.successBg, borderColor: ui.successBorder }]}>
                          <Users size={9} color={ui.successText} />
                          <Text style={[styles.scopeBadgeText, { color: ui.successText }]}>Celá rodina</Text>
                        </View>
                      )}
                      {hasTimes && preset.hours > 0 && (
                        <View style={[styles.hoursBadge, { backgroundColor: `${bg}18`, borderColor: `${bg}40` }]}>
                          <Text style={[styles.hoursBadgeText, { color: bg }]}>{preset.hours}h</Text>
                        </View>
                      )}
                    </View>
                    {hasTimes && (
                      <View style={styles.timeRow}>
                        <Clock size={11} color={ui.textMuted} />
                        <Text style={[styles.timeText, { color: ui.textMuted }]}>{preset.start_time} – {preset.end_time}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.rowActions}>
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: ui.inputBg }]} onPress={() => openEditModal(preset)} activeOpacity={0.7}>
                      <Pencil size={14} color={ui.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: ui.deleteBg }]} onPress={() => handleDeletePreset(preset)} activeOpacity={0.7} disabled={isDeleting}>
                      {isDeleting ? <ActivityIndicator size="small" color={ui.deleteColor} /> : <Trash2 size={14} color={ui.deleteColor} />}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.2 — Rodina a členové
        ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#10B98115' }]}>
                  <Users size={18} color="#10B981" />
                </View>
                <Text style={[styles.sectionTitle, { color: ui.text }]}>Rodina a členové</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.sectionActionBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => setAddMemberVisible(true)}
                  activeOpacity={0.8}
                >
                  <UserPlus size={14} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.sectionActionBtnText}>Přidat člena</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
              Kód skupiny, přehled členů a jejich role
            </Text>
          </View>

          {/* Join Code Card */}
          <View style={[styles.joinCodeCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
            <View style={styles.joinCodeRow}>
              <View>
                <Text style={[styles.joinCodeLabel, { color: ui.textMuted }]}>KÓD VAŠEHO KALENDÁŘE</Text>
                <Text style={[styles.joinCodeValue, { color: ui.accent }]}>
                  {currentGroup?.join_code || '------'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: copiedCode ? '#10B98120' : `${ui.accent}15`, borderColor: copiedCode ? '#10B981' : ui.accent }]}
                onPress={handleCopyJoinCode}
                activeOpacity={0.7}
              >
                {copiedCode ? (
                  <><CheckCheck size={15} color="#10B981" strokeWidth={2.5} /><Text style={[styles.copyBtnText, { color: '#10B981' }]}>Zkopírováno</Text></>
                ) : (
                  <><Copy size={15} color={ui.accent} /><Text style={[styles.copyBtnText, { color: ui.accent }]}>Kopírovat</Text></>
                )}
              </TouchableOpacity>
            </View>

            {/* Tlačítko pro sdílení pozvánky pod kódem */}
            <TouchableOpacity
              style={styles.shareInviteBtn}
              onPress={handleShareInvite}
              activeOpacity={0.8}
            >
              <Share2 size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.shareInviteBtnText}>Sdílet pozvánku pro rodinu</Text>
            </TouchableOpacity>

            <View style={[styles.joinCodeHintRow, { borderTopColor: ui.border }]}>
              <Text style={[styles.joinCodeHint, { color: ui.textMuted }]}>
                Odešle zprávu s kódem rodiny i odkazem ke stažení aplikace přes WhatsApp, SMS atd.
              </Text>
            </View>
          </View>

          {/* Members List */}
          <View style={styles.listContainer}>
            {groupMembers.map((member) => {
              const isMe = member.id === currentUser?.id;
              const mIsAdmin = member.role === 'admin';
              const mColor = member.color || '#3B82F6';

              return (
                <View key={member.id} style={[styles.memberCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: mColor }]}>
                    <Text style={styles.memberAvatarText}>{member.display_name?.charAt(0).toUpperCase() || 'U'}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: ui.text }]}>{member.display_name}</Text>
                      {isMe && (
                        <View style={[styles.meBadge, { backgroundColor: `${ui.accent}18` }]}>
                          <Text style={[styles.meBadgeText, { color: ui.accent }]}>Vy</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.memberSubtext, { color: ui.textMuted }]}>
                      {isVirtual(member) ? 'Profil bez telefonu' : isMe ? 'Váš přihlášený profil' : 'Propojený člen'}
                    </Text>
                  </View>
                  {mIsAdmin ? (
                    <View style={[styles.roleBadgeAdmin, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <Crown size={11} color={ui.adminColor} />
                      <Text style={[styles.roleBadgeAdminText, { color: ui.adminColor }]}>Správce</Text>
                    </View>
                  ) : (
                    <View style={[styles.roleBadgeMember, { backgroundColor: ui.inputBg }]}>
                      <Text style={[styles.roleBadgeMemberText, { color: ui.textMuted }]}>Člen</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.3 — Správa skupiny (pouze Správce!)
        ═══════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <View style={styles.section}>
            {/* Section Header */}
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionTopBar}>
                <View style={styles.sectionTitleGroup}>
                  <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                    <ShieldCheck size={18} color={ui.adminColor} />
                  </View>
                  <View>
                    <Text style={[styles.sectionTitle, { color: ui.text }]}>Správa skupiny</Text>
                    <View style={styles.adminOnlyRow}>
                      <Crown size={10} color={ui.adminColor} />
                      <Text style={[styles.adminOnlyText, { color: ui.adminColor }]}>Pouze správce</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
                Schvalování žádostí, oprávnění členů a zabezpečení skupiny
              </Text>
            </View>

            {/* ── 7.3A: Pending Approval Queue ── */}
            {pendingMembers.length > 0 && (
              <View style={styles.subsection}>
                <View style={styles.subsectionHeader}>
                  <ClipboardList size={15} color={ui.warningText} />
                  <Text style={[styles.subsectionTitle, { color: ui.warningText }]}>
                    Čekající žádosti ({pendingMembers.length})
                  </Text>
                </View>

                {pendingMembers.map((member) => {
                  const isApproving = approvingId === member.id;
                  const isRejecting = rejectingId === member.id;

                  return (
                    <View
                      key={member.id}
                      style={[styles.pendingCard, { backgroundColor: ui.warningBg, borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FCD34D' }]}
                    >
                      <View style={[styles.memberAvatar, { backgroundColor: '#94A3B8', width: 36, height: 36, borderRadius: 18 }]}>
                        <Text style={styles.memberAvatarText}>{member.display_name?.charAt(0).toUpperCase() || '?'}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: ui.text }]}>{member.display_name}</Text>
                        <Text style={[styles.memberSubtext, { color: ui.textMuted }]}>Čeká na schválení</Text>
                      </View>
                      <View style={styles.pendingActions}>
                        <TouchableOpacity
                          style={[styles.approveBtn, { backgroundColor: ui.successBg, borderColor: ui.successBorder }]}
                          onPress={() => handleApproveMember(member)}
                          disabled={isApproving || isRejecting}
                          activeOpacity={0.7}
                        >
                          {isApproving ? <ActivityIndicator size="small" color={ui.successText} /> : <Check size={15} color={ui.successText} strokeWidth={2.5} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rejectBtn, { backgroundColor: ui.deleteBg, borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5' }]}
                          onPress={() => handleRejectMember(member)}
                          disabled={isApproving || isRejecting}
                          activeOpacity={0.7}
                        >
                          {isRejecting ? <ActivityIndicator size="small" color={ui.deleteColor} /> : <X size={15} color={ui.deleteColor} strokeWidth={2.5} />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── 7.3B: Member Permissions Management ── */}
            <View style={styles.subsection}>
              <View style={styles.subsectionHeader}>
                <Settings size={15} color={ui.textMuted} />
                <Text style={[styles.subsectionTitle, { color: ui.text }]}>
                  Oprávnění členů
                </Text>
              </View>

              {groupMembers
                .filter((m) => m.id !== currentUser?.id) // can't manage yourself
                .map((member) => {
                  const isExpanded = expandedMemberId === member.id;
                  const mIsAdmin = member.role === 'admin';
                  const mColor = member.color || '#3B82F6';
                  const perms: MemberPermissions = mIsAdmin
                    ? { canViewCalendar: true, canEditOwnShifts: true, canEditAllShifts: true, canAddNotes: true, canManagePresets: true }
                    : (member.permissions ?? DEFAULT_MEMBER_PERMISSIONS);
                  const isUpdatingPerm = updatingPermId === member.id;
                  const isUpdatingRole = updatingRoleId === member.id;
                  const isRemoving = removingId === member.id;

                  return (
                    <View key={member.id} style={[styles.permCard, { backgroundColor: ui.card, borderColor: isExpanded ? (mIsAdmin ? ui.adminColor : ui.accent) : ui.border }]}>
                      {/* Card Header */}
                      <TouchableOpacity
                        style={styles.permCardHeader}
                        onPress={() => setExpandedMemberId(isExpanded ? null : member.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.memberAvatar, { backgroundColor: mColor, width: 34, height: 34, borderRadius: 17 }]}>
                          <Text style={[styles.memberAvatarText, { fontSize: 13 }]}>{member.display_name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberName, { color: ui.text, fontSize: 14 }]}>{member.display_name}</Text>
                          <Text style={[styles.memberSubtext, { color: ui.textMuted }]}>
                            {mIsAdmin ? 'Správce — všechna oprávnění' : `${Object.values(perms).filter(Boolean).length}/5 oprávnění`}
                          </Text>
                        </View>
                        {mIsAdmin ? (
                          <View style={[styles.roleBadgeAdmin, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                            <Crown size={10} color={ui.adminColor} />
                            <Text style={[styles.roleBadgeAdminText, { color: ui.adminColor, fontSize: 10 }]}>Správce</Text>
                          </View>
                        ) : (
                          <View style={[styles.roleBadgeMember, { backgroundColor: ui.inputBg }]}>
                            <Text style={[styles.roleBadgeMemberText, { color: ui.textMuted, fontSize: 10 }]}>Člen</Text>
                          </View>
                        )}
                        {isExpanded
                          ? <ChevronUp size={16} color={ui.textMuted} style={{ marginLeft: 6 }} />
                          : <ChevronDown size={16} color={ui.textMuted} style={{ marginLeft: 6 }} />
                        }
                      </TouchableOpacity>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <View style={[styles.permExpandedContent, { borderTopColor: ui.border }]}>
                          {/* Permission Toggles */}
                          <Text style={[styles.permSectionLabel, { color: ui.textMuted }]}>OPRÁVNĚNÍ</Text>
                          {PERMISSION_ROWS.map((row) => {
                            const isOn = perms[row.key];
                            const colorDot = row.color;
                            return (
                              <View key={row.key} style={[styles.permRow, { borderBottomColor: ui.border }]}>
                                <View style={[styles.permColorDot, { backgroundColor: colorDot }]} />
                                <View style={{ flex: 1, gap: 1 }}>
                                  <Text style={[styles.permRowTitle, { color: ui.text }]}>{row.label}</Text>
                                  <Text style={[styles.permRowSubtitle, { color: ui.textMuted }]}>{row.sublabel}</Text>
                                </View>
                                {isUpdatingPerm ? (
                                  <ActivityIndicator size="small" color={ui.accent} />
                                ) : (
                                  <Switch
                                    value={isOn}
                                    onValueChange={(val) => handleTogglePermission(member, row.key, val)}
                                    disabled={mIsAdmin}
                                    trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colorDot }}
                                    thumbColor="#FFFFFF"
                                  />
                                )}
                              </View>
                            );
                          })}

                          {/* Role & Remove Buttons */}
                          <View style={styles.permActionsRow}>
                            <TouchableOpacity
                              style={[
                                styles.permActionBtn,
                                {
                                  backgroundColor: mIsAdmin ? ui.inputBg : 'rgba(245,158,11,0.12)',
                                  borderColor: mIsAdmin ? ui.border : 'rgba(245,158,11,0.4)',
                                  flex: 1,
                                },
                              ]}
                              onPress={() => handleToggleRole(member)}
                              activeOpacity={0.7}
                              disabled={isUpdatingRole}
                            >
                              {isUpdatingRole ? (
                                <ActivityIndicator size="small" color={ui.adminColor} />
                              ) : (
                                <>
                                  <Crown size={13} color={mIsAdmin ? ui.textMuted : ui.adminColor} />
                                  <Text style={[styles.permActionBtnText, { color: mIsAdmin ? ui.textMuted : ui.adminColor }]}>
                                    {mIsAdmin ? 'Odebrat správcovství' : 'Povýšit na správce'}
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.permActionBtn, { backgroundColor: ui.deleteBg, borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5', flex: 1 }]}
                              onPress={() => handleRemoveMember(member)}
                              activeOpacity={0.7}
                              disabled={isRemoving}
                            >
                              {isRemoving ? (
                                <ActivityIndicator size="small" color={ui.deleteColor} />
                              ) : (
                                <>
                                  <UserMinus size={13} color={ui.deleteColor} />
                                  <Text style={[styles.permActionBtnText, { color: ui.deleteColor }]}>Odebrat ze skupiny</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

              {groupMembers.filter((m) => m.id !== currentUser?.id).length === 0 && (
                <View style={[styles.emptyHint, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
                  <Users size={20} color={ui.textMuted} />
                  <Text style={[styles.emptyHintText, { color: ui.textMuted }]}>
                    Zatím žádní další členové. Pozvěte rodinu pomocí kódu výše.
                  </Text>
                </View>
              )}
            </View>

            {/* ── 7.3C: Group Security ── */}
            <View style={styles.subsection}>
              <View style={styles.subsectionHeader}>
                <KeyRound size={15} color={ui.textMuted} />
                <Text style={[styles.subsectionTitle, { color: ui.text }]}>Zabezpečení skupiny</Text>
              </View>

              {/* Password Card */}
              <View style={[styles.securityCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
                <View style={styles.securityCardRow}>
                  <View style={[styles.sectionIconCircle, { backgroundColor: currentGroup?.password_hash ? 'rgba(16,185,129,0.15)' : ui.inputBg, width: 32, height: 32, borderRadius: 16 }]}>
                    {currentGroup?.password_hash
                      ? <Lock size={15} color={ui.successText} />
                      : <LockOpen size={15} color={ui.textMuted} />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.securityRowTitle, { color: ui.text }]}>Heslo pro vstup do skupiny</Text>
                    <Text style={[styles.securityRowSubtitle, { color: ui.textMuted }]}>
                      {currentGroup?.password_hash ? 'Heslo nastaveno — noví členové jej musí znát' : 'Bez hesla — kdokoli se 6místným kódem se může připojit'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.securityChangeBtn, { backgroundColor: ui.inputBg, borderColor: ui.border }]}
                    onPress={() => { setNewPwd(''); setChangePwdVisible(true); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.securityChangeBtnText, { color: ui.accent }]}>
                      {currentGroup?.password_hash ? 'Změnit' : 'Nastavit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Approval Policy Card */}
              <View style={[styles.securityCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
                <View style={styles.securityCardRow}>
                  <View style={[styles.sectionIconCircle, { backgroundColor: currentGroup?.require_approval ? 'rgba(245,158,11,0.15)' : ui.successBg, width: 32, height: 32, borderRadius: 16 }]}>
                    <BadgeCheck size={15} color={currentGroup?.require_approval ? ui.adminColor : ui.successText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.securityRowTitle, { color: ui.text }]}>Schvalování nových členů</Text>
                    <Text style={[styles.securityRowSubtitle, { color: ui.textMuted }]}>
                      {currentGroup?.require_approval
                        ? 'Manuální schválení — noví členové čekají na váš souhlas'
                        : 'Automatické přijetí — kdokoli se správným kódem je ihned aktivní'
                      }
                    </Text>
                  </View>
                  {updatingApproval ? (
                    <ActivityIndicator size="small" color={ui.accent} />
                  ) : (
                    <Switch
                      value={Boolean(currentGroup?.require_approval)}
                      onValueChange={handleToggleApproval}
                      trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: ui.adminColor }}
                      thumbColor="#FFFFFF"
                    />
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.4A — Vzhled buněk kalendáře (Předvolby)
        ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#8B5CF615' }]}>
                  <Palette size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.sectionTitle, { color: ui.text }]}>Vzhled buněk kalendáře</Text>
              </View>
            </View>
            <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
              Vyberte si styl, jakým se mají směny vykreslovat v měsíčním kalendáři
            </Text>
          </View>

          {/* 5 Cell Style Cards */}
          <View style={styles.styleGrid}>
            {/* Option 0: Barevné bloky (Plný text - styl jako od maminky) */}
            <TouchableOpacity
              style={[
                styles.styleCard,
                { backgroundColor: ui.card, borderColor: cellStyle === 'blocks' ? ui.accent : ui.border },
                cellStyle === 'blocks' && styles.styleCardActive,
              ]}
              onPress={() => setCellStyle('blocks')}
              activeOpacity={0.8}
            >
              <View style={styles.styleCardHeader}>
                <View style={styles.styleCardTitleRow}>
                  <Text style={[styles.styleCardTitle, { color: ui.text }]}>Barevné bloky (Plný text)</Text>
                  {cellStyle === 'blocks' ? (
                    <View style={[styles.styleActiveBadge, { backgroundColor: ui.accent }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.styleActiveBadgeText}>Aktivní</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.styleCardDesc, { color: ui.textMuted }]}>
                  Styl jako v kalendáři od maminky – plné řádky s celým názvem směny i jménem člena bez ořezávání (Den...).
                </Text>
              </View>

              {/* Realistic Mini Mockup */}
              <View style={[styles.miniMockupCell, { borderColor: ui.border, backgroundColor: ui.card }]}>
                <Text style={[styles.miniMockupDate, { color: ui.text }]}>14</Text>
                <View style={styles.miniMockupContent}>
                  <View style={[styles.miniBlockRow, { backgroundColor: isDark ? '#2563EB35' : '#2563EB20', borderLeftColor: '#2563EB' }]}>
                    <Text style={[styles.miniBlockTitle, { color: ui.text }]}>Denní</Text>
                    <Text style={[styles.miniBlockSub, { color: isDark ? '#93C5FD' : '#2563EB' }]}>Jirka</Text>
                  </View>
                  <View style={[styles.miniBlockRow, { backgroundColor: isDark ? '#EC489935' : '#EC489920', borderLeftColor: '#EC4899' }]}>
                    <Text style={[styles.miniBlockTitle, { color: ui.text }]}>Noční</Text>
                    <Text style={[styles.miniBlockSub, { color: isDark ? '#F472B6' : '#DB2777' }]}>Hanka</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Option 1: Celé zabarvení (půl na půl) */}
            <TouchableOpacity
              style={[
                styles.styleCard,
                { backgroundColor: ui.card, borderColor: cellStyle === 'full_fill' ? ui.accent : ui.border },
                cellStyle === 'full_fill' && styles.styleCardActive,
              ]}
              onPress={() => setCellStyle('full_fill')}
              activeOpacity={0.8}
            >
              <View style={styles.styleCardHeader}>
                <View style={styles.styleCardTitleRow}>
                  <Text style={[styles.styleCardTitle, { color: ui.text }]}>Celé zabarvení</Text>
                  {cellStyle === 'full_fill' ? (
                    <View style={[styles.styleActiveBadge, { backgroundColor: ui.accent }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.styleActiveBadgeText}>Aktivní</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.styleCardDesc, { color: ui.textMuted }]}>
                  Celé políčko dne se probarví barvou směny. Při 2 směnách se rozdělí půl na půl.
                </Text>
              </View>

              {/* Realistic Mini Mockup */}
              <View style={[styles.miniMockupCell, { borderColor: ui.border, backgroundColor: ui.card }]}>
                {/* 50/50 Split Background */}
                <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
                  <View style={{ flex: 1, backgroundColor: isDark ? '#2563EB40' : '#2563EB25', borderLeftWidth: 2, borderLeftColor: '#2563EB' }} />
                  <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                  <View style={{ flex: 1, backgroundColor: isDark ? '#7C3AED40' : '#7C3AED25', borderRightWidth: 2, borderRightColor: '#7C3AED' }} />
                </View>
                <Text style={[styles.miniMockupDate, { color: ui.text }]}>14</Text>
                <View style={styles.miniMockupContent}>
                  <View style={[styles.miniChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)' }]}>
                    <View style={[styles.miniDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={[styles.miniChipText, { color: ui.text }]}>Denní</Text>
                  </View>
                  <View style={[styles.miniChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)' }]}>
                    <View style={[styles.miniDot, { backgroundColor: '#7C3AED' }]} />
                    <Text style={[styles.miniChipText, { color: ui.text }]}>Noční</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Option 2: Pilulky / Odznáčky */}
            <TouchableOpacity
              style={[
                styles.styleCard,
                { backgroundColor: ui.card, borderColor: cellStyle === 'badge' ? ui.accent : ui.border },
                cellStyle === 'badge' && styles.styleCardActive,
              ]}
              onPress={() => setCellStyle('badge')}
              activeOpacity={0.8}
            >
              <View style={styles.styleCardHeader}>
                <View style={styles.styleCardTitleRow}>
                  <Text style={[styles.styleCardTitle, { color: ui.text }]}>Pilulky / Odznáčky</Text>
                  {cellStyle === 'badge' ? (
                    <View style={[styles.styleActiveBadge, { backgroundColor: ui.accent }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.styleActiveBadgeText}>Aktivní</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.styleCardDesc, { color: ui.textMuted }]}>
                  Zaoblené barevné štítky s názvem směny a puntíkem člena rodiny.
                </Text>
              </View>

              {/* Realistic Mini Mockup */}
              <View style={[styles.miniMockupCell, { borderColor: ui.border, backgroundColor: ui.card }]}>
                <Text style={[styles.miniMockupDate, { color: ui.text }]}>14</Text>
                <View style={styles.miniMockupContent}>
                  <View style={[styles.miniPill, { backgroundColor: isDark ? '#2563EB25' : '#2563EB18', borderColor: isDark ? '#2563EB50' : '#2563EB40' }]}>
                    <View style={[styles.miniDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={[styles.miniPillText, { color: ui.text }]}>Denní</Text>
                  </View>
                  <View style={[styles.miniPill, { backgroundColor: isDark ? '#7C3AED25' : '#7C3AED18', borderColor: isDark ? '#7C3AED50' : '#7C3AED40' }]}>
                    <View style={[styles.miniDot, { backgroundColor: '#7C3AED' }]} />
                    <Text style={[styles.miniPillText, { color: ui.text }]}>Noční</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Option 3: Barevný proužek */}
            <TouchableOpacity
              style={[
                styles.styleCard,
                { backgroundColor: ui.card, borderColor: cellStyle === 'bottom_strip' ? ui.accent : ui.border },
                cellStyle === 'bottom_strip' && styles.styleCardActive,
              ]}
              onPress={() => setCellStyle('bottom_strip')}
              activeOpacity={0.8}
            >
              <View style={styles.styleCardHeader}>
                <View style={styles.styleCardTitleRow}>
                  <Text style={[styles.styleCardTitle, { color: ui.text }]}>Barevný proužek</Text>
                  {cellStyle === 'bottom_strip' ? (
                    <View style={[styles.styleActiveBadge, { backgroundColor: ui.accent }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.styleActiveBadgeText}>Aktivní</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.styleCardDesc, { color: ui.textMuted }]}>
                  Kompaktní proužky s názvy směn a souvislou barevnou lištou na spodku.
                </Text>
              </View>

              {/* Realistic Mini Mockup */}
              <View style={[styles.miniMockupCell, { borderColor: ui.border, backgroundColor: ui.card }]}>
                <Text style={[styles.miniMockupDate, { color: ui.text }]}>14</Text>
                <View style={[styles.miniMockupContent, { justifyContent: 'space-between' }]}>
                  <View style={{ gap: 2 }}>
                    <View style={[styles.miniStrip, { backgroundColor: isDark ? '#2563EB25' : '#2563EB18', borderLeftColor: '#2563EB' }]}>
                      <Text style={[styles.miniStripText, { color: ui.text }]}>Denní</Text>
                    </View>
                    <View style={[styles.miniStrip, { backgroundColor: isDark ? '#7C3AED25' : '#7C3AED18', borderLeftColor: '#7C3AED' }]}>
                      <Text style={[styles.miniStripText, { color: ui.text }]}>Noční</Text>
                    </View>
                  </View>
                  {/* Bottom Dual Stripe */}
                  <View style={styles.miniBottomTrack}>
                    <View style={{ flex: 1, backgroundColor: '#2563EB', height: '100%', borderRadius: 1 }} />
                    <View style={{ flex: 1, backgroundColor: '#7C3AED', height: '100%', borderRadius: 1 }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Option 4: Minimalistické tečky */}
            <TouchableOpacity
              style={[
                styles.styleCard,
                { backgroundColor: ui.card, borderColor: cellStyle === 'dots' ? ui.accent : ui.border },
                cellStyle === 'dots' && styles.styleCardActive,
              ]}
              onPress={() => setCellStyle('dots')}
              activeOpacity={0.8}
            >
              <View style={styles.styleCardHeader}>
                <View style={styles.styleCardTitleRow}>
                  <Text style={[styles.styleCardTitle, { color: ui.text }]}>Minimalistické tečky</Text>
                  {cellStyle === 'dots' ? (
                    <View style={[styles.styleActiveBadge, { backgroundColor: ui.accent }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.styleActiveBadgeText}>Aktivní</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.styleCardDesc, { color: ui.textMuted }]}>
                  Čisté zobrazení s barevnými puntíky pod číslem dne pro maximální přehled.
                </Text>
              </View>

              {/* Realistic Mini Mockup */}
              <View style={[styles.miniMockupCell, { borderColor: ui.border, backgroundColor: ui.card }]}>
                <Text style={[styles.miniMockupDate, { color: ui.text }]}>14</Text>
                <View style={[styles.miniMockupContent, { alignItems: 'center', justifyContent: 'center' }]}>
                  <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }} />
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED' }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.4B — Obecné nastavení kalendáře
        ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#3B82F615' }]}>
                  <CalendarIcon size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.sectionTitle, { color: ui.text }]}>Obecné nastavení kalendáře</Text>
              </View>
            </View>
            <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
              První den v týdnu, čísla týdnů na okraji, zvýraznění víkendů a české svátky
            </Text>
          </View>

          <View style={styles.generalSettingsCardList}>
            {/* 1. První den v týdnu */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: ui.text }]}>První den v týdnu</Text>
                <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                  Výchozí den pro první sloupec kalendáře
                </Text>
              </View>
              <View style={[styles.segmentedRow, { backgroundColor: ui.inputBg }]}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    firstDayOfWeek === 'monday' && [styles.segmentBtnActive, { backgroundColor: ui.accent }],
                  ]}
                  onPress={() => setFirstDayOfWeek('monday')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: firstDayOfWeek === 'monday' ? '#FFFFFF' : ui.textMuted },
                    ]}
                  >
                    Pondělí (Po)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    firstDayOfWeek === 'sunday' && [styles.segmentBtnActive, { backgroundColor: ui.accent }],
                  ]}
                  onPress={() => setFirstDayOfWeek('sunday')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: firstDayOfWeek === 'sunday' ? '#FFFFFF' : ui.textMuted },
                    ]}
                  >
                    Neděle (Ne)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Zobrazit čísla týdnů */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefSwitchRow}>
                <View style={styles.prefTextCol}>
                  <Text style={[styles.prefTitle, { color: ui.text }]}>Čísla týdnů na okraji (#)</Text>
                  <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                    Zobrazí sloupec s čísly týdnů (40, 41, 42…) po levém okraji kalendáře
                  </Text>
                </View>
                <Switch
                  value={showWeekNumbers}
                  onValueChange={setShowWeekNumbers}
                  trackColor={{ false: isDark ? '#374151' : '#CBD5E1', true: ui.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* 3. Zvýraznění víkendů */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefSwitchRow}>
                <View style={styles.prefTextCol}>
                  <Text style={[styles.prefTitle, { color: ui.text }]}>Barevné zvýraznění víkendů</Text>
                  <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                    Sobota a neděle mají jemně podbarvené buňky a teplou barvu čísla dne
                  </Text>
                </View>
                <Switch
                  value={highlightWeekends}
                  onValueChange={setHighlightWeekends}
                  trackColor={{ false: isDark ? '#374151' : '#CBD5E1', true: ui.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* 4. Styl zvýraznění dneška */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: ui.text }]}>Zvýraznění dnešního dne</Text>
                <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                  Jak má být v kalendářní mřížce označen dnešek
                </Text>
              </View>
              <View style={styles.todayStyleRow}>
                {(
                  [
                    { id: 'badge', label: 'Kroužek' },
                    { id: 'border', label: 'Rámeček' },
                    { id: 'dot', label: 'Tečka' },
                    { id: 'subtle', label: 'Jemný' },
                  ] as const
                ).map((item) => {
                  const isActive = todayHighlightStyle === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.todayStyleBtn,
                        { borderColor: isActive ? ui.accent : ui.border, backgroundColor: isActive ? `${ui.accent}15` : ui.inputBg },
                      ]}
                      onPress={() => setTodayHighlightStyle(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.todayStyleBtnText,
                          { color: isActive ? ui.accent : ui.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. České státní svátky */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefSwitchRow}>
                <View style={styles.prefTextCol}>
                  <Text style={[styles.prefTitle, { color: ui.text }]}>🇨🇿 Státní svátky ČR</Text>
                  <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                    Zobrazí české státní svátky a pohyblivé Velikonoce s červeným odznáčkem
                  </Text>
                </View>
                <Switch
                  value={showHolidays}
                  onValueChange={setShowHolidays}
                  trackColor={{ false: isDark ? '#374151' : '#CBD5E1', true: '#EF4444' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.4C — Zobrazení a pořadí členů v kalendáři
        ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#3B82F615' }]}>
                  <Users size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.sectionTitle, { color: ui.text }]}>Zobrazení a pořadí členů</Text>
              </View>
              {hiddenMemberIds.length > 0 && (
                <TouchableOpacity
                  style={[styles.sectionActionBtn, { backgroundColor: ui.accent }]}
                  onPress={setAllMembersVisible}
                  activeOpacity={0.8}
                >
                  <Eye size={13} color="#FFF" />
                  <Text style={styles.sectionActionBtnText}>Zobrazit vše ({hiddenMemberIds.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
              Výchozí člen při zápisu směn, skrytí členů v kalendáři a jejich pořadí v buňkách i liště.
            </Text>
          </View>

          <View style={styles.generalSettingsCardList}>
            {/* 1. Výchozí člen při otevření úprav */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: ui.text }]}>Výchozí člen při otevření úprav</Text>
                <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                  Který člen se automaticky označí při zapnutí režimu zápisu směn
                </Text>
              </View>
              <View style={[styles.segmentedRow, { backgroundColor: ui.inputBg }]}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    defaultEditMemberMode === 'always_me' && [styles.segmentBtnActive, { backgroundColor: ui.accent }],
                  ]}
                  onPress={() => setDefaultEditMemberMode('always_me')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: defaultEditMemberMode === 'always_me' ? '#FFFFFF' : ui.textMuted },
                    ]}
                  >
                    Vždy Já
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    defaultEditMemberMode === 'remember_last' && [styles.segmentBtnActive, { backgroundColor: ui.accent }],
                  ]}
                  onPress={() => setDefaultEditMemberMode('remember_last')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: defaultEditMemberMode === 'remember_last' ? '#FFFFFF' : ui.textMuted },
                    ]}
                  >
                    Pamatovat posledního
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Pořadí a viditelnost členů */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: ui.text }]}>Pořadí a viditelnost v kalendáři</Text>
                <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                  Šipkami ▲ ▼ posuňte pořadí členů. Přepínačem skryjete nebo zobrazíte jejich směny v kalendářní mřížce.
                </Text>
              </View>

              <View style={styles.memberOrderList}>
                {orderedMembers.map((member, index) => {
                  const isHidden = hiddenMemberIds.includes(member.id);
                  const isFirst = index === 0;
                  const isLast = index === orderedMembers.length - 1;
                  const isCurrent = member.id === currentUser?.id;

                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.memberOrderItem,
                        {
                          backgroundColor: ui.inputBg,
                          borderColor: isHidden ? (isDark ? 'rgba(255,255,255,0.06)' : '#CBD5E1') : ui.border,
                          opacity: isHidden ? 0.6 : 1,
                        },
                      ]}
                    >
                      {/* Reorder Arrows */}
                      <View style={styles.orderArrowsCol}>
                        <TouchableOpacity
                          style={[
                            styles.arrowBtn,
                            isFirst && styles.arrowBtnDisabled,
                          ]}
                          onPress={() => moveMemberOrder(member.id, 'up', allMemberIds)}
                          disabled={isFirst}
                          activeOpacity={0.6}
                        >
                          <ChevronUp size={16} color={isFirst ? (isDark ? '#4B5563' : '#CBD5E1') : ui.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.arrowBtn,
                            isLast && styles.arrowBtnDisabled,
                          ]}
                          onPress={() => moveMemberOrder(member.id, 'down', allMemberIds)}
                          disabled={isLast}
                          activeOpacity={0.6}
                        >
                          <ChevronDown size={16} color={isLast ? (isDark ? '#4B5563' : '#CBD5E1') : ui.accent} />
                        </TouchableOpacity>
                      </View>

                      {/* Member Info */}
                      <View style={styles.memberOrderInfoCol}>
                        <View style={styles.memberOrderAvatarRow}>
                          <View style={[styles.memberOrderAvatarCircle, { backgroundColor: isHidden ? '#64748B' : (member.color || '#3B82F6') }]}>
                            <Text style={styles.memberOrderAvatarText}>
                              {member.display_name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text
                                style={[
                                  styles.memberOrderName,
                                  {
                                    color: isHidden ? ui.textMuted : ui.text,
                                    textDecorationLine: isHidden ? 'line-through' : 'none',
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {member.display_name} {isCurrent && '(Já)'}
                              </Text>
                              {member.role === 'admin' && (
                                <Crown size={12} color={isHidden ? ui.textMuted : '#F59E0B'} />
                              )}
                            </View>
                            <Text style={[styles.memberOrderRole, { color: ui.textMuted }]}>
                              {isHidden ? 'Skrytý v kalendáři' : `Pozice #${index + 1}`}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Visibility Switch */}
                      <View style={styles.memberOrderSwitchCol}>
                        <Switch
                          value={!isHidden}
                          onValueChange={() => toggleMemberVisibility(member.id)}
                          trackColor={{ false: isDark ? '#374151' : '#CBD5E1', true: member.color || ui.accent }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.4D — Motiv a vzhled aplikace
        ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#F59E0B15' }]}>
                  <Sun size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.sectionTitle, { color: ui.text }]}>Motiv a vzhled aplikace</Text>
              </View>
            </View>
            <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
              Přizpůsobte si barevný režim, velikost písma a výšku buněk kalendáře.
            </Text>
          </View>

          <View style={styles.generalSettingsCardList}>
            {/* 1. Barevný režim motivu */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: ui.text }]}>Barevný režim aplikace</Text>
                <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                  Zvolte si tmavý, světlý nebo automatický motiv dle systému telefonu
                </Text>
              </View>

              <View style={styles.themeSelectorRow}>
                {/* System */}
                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    {
                      borderColor: themeMode === 'system' ? ui.accent : ui.border,
                      backgroundColor: themeMode === 'system' ? `${ui.accent}15` : ui.inputBg,
                    },
                  ]}
                  onPress={() => setThemeMode('system')}
                  activeOpacity={0.7}
                >
                  <Smartphone size={18} color={themeMode === 'system' ? ui.accent : ui.textMuted} />
                  <Text
                    style={[
                      styles.themeOptionBtnText,
                      { color: themeMode === 'system' ? ui.accent : ui.text },
                    ]}
                  >
                    Automaticky
                  </Text>
                  <Text style={[styles.themeOptionSubText, { color: ui.textMuted }]}>
                    Dle systému
                  </Text>
                </TouchableOpacity>

                {/* Light */}
                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    {
                      borderColor: themeMode === 'light' ? ui.accent : ui.border,
                      backgroundColor: themeMode === 'light' ? `${ui.accent}15` : ui.inputBg,
                    },
                  ]}
                  onPress={() => setThemeMode('light')}
                  activeOpacity={0.7}
                >
                  <Sun size={18} color={themeMode === 'light' ? '#F59E0B' : ui.textMuted} />
                  <Text
                    style={[
                      styles.themeOptionBtnText,
                      { color: themeMode === 'light' ? ui.accent : ui.text },
                    ]}
                  >
                    Světlý
                  </Text>
                  <Text style={[styles.themeOptionSubText, { color: ui.textMuted }]}>
                    Čistě bílý
                  </Text>
                </TouchableOpacity>

                {/* Dark */}
                <TouchableOpacity
                  style={[
                    styles.themeOptionBtn,
                    {
                      borderColor: themeMode === 'dark' ? ui.accent : ui.border,
                      backgroundColor: themeMode === 'dark' ? `${ui.accent}15` : ui.inputBg,
                    },
                  ]}
                  onPress={() => setThemeMode('dark')}
                  activeOpacity={0.7}
                >
                  <Moon size={18} color={themeMode === 'dark' ? '#8B5CF6' : ui.textMuted} />
                  <Text
                    style={[
                      styles.themeOptionBtnText,
                      { color: themeMode === 'dark' ? ui.accent : ui.text },
                    ]}
                  >
                    Tmavý
                  </Text>
                  <Text style={[styles.themeOptionSubText, { color: ui.textMuted }]}>
                    Šetří oči i baterii
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Velikost písma v kalendáři */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: ui.text }]}>Velikost písma v kalendáři</Text>
                <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                  Upravte měřítko textů směn a čísel dnů (ideální pro snadnou čitelnost bez brýlí)
                </Text>
              </View>

              <View style={[styles.segmentedRow, { backgroundColor: ui.inputBg }]}>
                {(
                  [
                    { id: 'small', label: 'Malé (88 %)' },
                    { id: 'medium', label: 'Normální (100 %)' },
                    { id: 'large', label: 'Velké (118 %)' },
                  ] as const
                ).map((item) => {
                  const isActive = fontSizeScale === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.segmentBtn,
                        isActive && [styles.segmentBtnActive, { backgroundColor: ui.accent }],
                      ]}
                      onPress={() => setFontSizeScale(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          { color: isActive ? '#FFFFFF' : ui.textMuted },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live Preview Box for Selected Font Scale */}
              <View
                style={[
                  styles.fontSizePreviewBox,
                  {
                    backgroundColor: ui.inputBg,
                    borderColor: ui.border,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Type size={14} color={ui.accent} />
                  <Text style={[styles.fontSizePreviewLabel, { color: ui.textMuted }]}>
                    Živý náhled textu směny:
                  </Text>
                </View>
                <View
                  style={[
                    styles.fontSizePreviewChip,
                    {
                      backgroundColor: isDark ? '#2563EB35' : '#2563EB20',
                      borderLeftColor: '#2563EB',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: Math.round(
                        11 * (fontSizeScale === 'small' ? 0.88 : fontSizeScale === 'large' ? 1.18 : 1.0)
                      ),
                      fontWeight: '800',
                      color: ui.text,
                    }}
                  >
                    Denní 06:00 – 18:00
                  </Text>
                  <Text
                    style={{
                      fontSize: Math.round(
                        9.5 * (fontSizeScale === 'small' ? 0.88 : fontSizeScale === 'large' ? 1.18 : 1.0)
                      ),
                      fontWeight: '600',
                      color: isDark ? '#93C5FD' : '#2563EB',
                    }}
                  >
                    Jirka (12h)
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Výška a hustota buněk kalendáře */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.prefTextCol}>
                <Text style={[styles.prefTitle, { color: ui.text }]}>Výška a rozložení buněk kalendáře</Text>
                <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                  Zvolte si, zda dáváte přednost prostorným buňkám nebo kompaktnímu zobrazení
                </Text>
              </View>

              <View style={styles.densityOptionRow}>
                {/* Comfortable */}
                <TouchableOpacity
                  style={[
                    styles.densityCard,
                    {
                      borderColor: calendarDensity === 'comfortable' ? ui.accent : ui.border,
                      backgroundColor: calendarDensity === 'comfortable' ? `${ui.accent}12` : ui.inputBg,
                    },
                  ]}
                  onPress={() => setCalendarDensity('comfortable')}
                  activeOpacity={0.8}
                >
                  <View style={styles.densityCardTop}>
                    <Maximize2 size={16} color={calendarDensity === 'comfortable' ? ui.accent : ui.textMuted} />
                    <Text
                      style={[
                        styles.densityCardTitle,
                        { color: calendarDensity === 'comfortable' ? ui.accent : ui.text },
                      ]}
                    >
                      Pohodlný (96 px)
                    </Text>
                    {calendarDensity === 'comfortable' && (
                      <View style={[styles.densityActiveDot, { backgroundColor: ui.accent }]} />
                    )}
                  </View>
                  <Text style={[styles.densityCardDesc, { color: ui.textMuted }]}>
                    Dostatek místa pro více směn a plné názvy bez zkracování.
                  </Text>
                </TouchableOpacity>

                {/* Compact */}
                <TouchableOpacity
                  style={[
                    styles.densityCard,
                    {
                      borderColor: calendarDensity === 'compact' ? ui.accent : ui.border,
                      backgroundColor: calendarDensity === 'compact' ? `${ui.accent}12` : ui.inputBg,
                    },
                  ]}
                  onPress={() => setCalendarDensity('compact')}
                  activeOpacity={0.8}
                >
                  <View style={styles.densityCardTop}>
                    <Minimize2 size={16} color={calendarDensity === 'compact' ? ui.accent : ui.textMuted} />
                    <Text
                      style={[
                        styles.densityCardTitle,
                        { color: calendarDensity === 'compact' ? ui.accent : ui.text },
                      ]}
                    >
                      Kompaktní (72 px)
                    </Text>
                    {calendarDensity === 'compact' && (
                      <View style={[styles.densityActiveDot, { backgroundColor: ui.accent }]} />
                    )}
                  </View>
                  <Text style={[styles.densityCardDesc, { color: ui.textMuted }]}>
                    Úsporné buňky — celý měsíc se vejde na displej bez scrollování.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
             SEKCE 7.4F — O aplikaci a účet
        ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionTopBar}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#3B82F615' }]}>
                  <Info size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.sectionTitle, { color: ui.text }]}>O aplikaci a účet</Text>
              </View>
            </View>
            <Text style={[styles.sectionDesc, { color: ui.textMuted }]}>
              Informace o Vašem profilu, verze aplikace a správa relace
            </Text>
          </View>

          <View style={styles.generalSettingsCardList}>
            {/* 1. Uživatelský profil */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.profileCardHeader}>
                <View
                  style={[
                    styles.memberOrderAvatarCircle,
                    {
                      backgroundColor: currentUser?.color || '#3B82F6',
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                    },
                  ]}
                >
                  <Text style={[styles.memberOrderAvatarText, { fontSize: 18 }]}>
                    {currentUser?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.profileCardName, { color: ui.text }]}>
                      {currentUser?.display_name || 'Uživatel'}
                    </Text>
                    {isAdmin && (
                      <View style={[styles.adminHeaderBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <Crown size={11} color={ui.adminColor} />
                        <Text style={[styles.adminHeaderBadgeText, { color: ui.adminColor, fontSize: 10 }]}>Správce</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.profileCardContact, { color: ui.textMuted }]}>
                    {currentUser?.email_or_phone?.startsWith('virtual_')
                      ? 'Virtuální rodinný profil'
                      : currentUser?.email_or_phone || 'Přihlášen'}
                  </Text>
                </View>
              </View>

              <View style={[styles.profileDivider, { backgroundColor: ui.border }]} />

              {/* Status information */}
              <View style={styles.profileMetaRow}>
                <View style={styles.profileMetaCol}>
                  <Text style={[styles.profileMetaLabel, { color: ui.textMuted }]}>Rodinná skupina</Text>
                  <Text style={[styles.profileMetaValue, { color: ui.text }]} numberOfLines={1}>
                    {currentGroup?.name || 'Rodina'}
                  </Text>
                </View>
                <View style={styles.profileMetaCol}>
                  <Text style={[styles.profileMetaLabel, { color: ui.textMuted }]}>Cloudová databáze</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={[styles.statusOnlineDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.profileMetaValue, { color: '#10B981' }]}>Neon Připojeno</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Informace o aplikaci & Kontrola aktualizací */}
            <View style={[styles.prefCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
              <View style={styles.appInfoRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.prefTitle, { color: ui.text }]}>Kalendář směn</Text>
                  <Text style={[styles.prefSubtitle, { color: ui.textMuted }]}>
                    Verze {getCurrentAppVersion()} (Build 7) • Expo React Native
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.checkUpdateBtn,
                    {
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
                    },
                  ]}
                  onPress={handleCheckUpdate}
                  disabled={checkingUpdate}
                  activeOpacity={0.7}
                >
                  {checkingUpdate ? (
                    <ActivityIndicator size="small" color={ui.accent} />
                  ) : (
                    <>
                      <RefreshCw size={13} color={ui.accent} />
                      <Text style={[styles.checkUpdateBtnText, { color: ui.accent }]}>
                        Zkontrolovat aktualizace
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Správa relace: Opustit skupinu & Odhlásit se */}
            <View style={[styles.dangerCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.06)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FCA5A5' }]}>
              <View style={{ gap: 3, marginBottom: 8 }}>
                <Text style={[styles.dangerCardTitle, { color: isDark ? '#F87171' : '#DC2626' }]}>
                  Správa relace a skupiny
                </Text>
                <Text style={[styles.dangerCardSubtitle, { color: ui.textMuted }]}>
                  Odpojení od aktuálního rodinného kalendáře nebo odhlášení z aplikace
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {/* Opustit skupinu */}
                <TouchableOpacity
                  style={[
                    styles.dangerActionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                    },
                  ]}
                  onPress={handleLeaveGroup}
                  disabled={leavingGroup}
                  activeOpacity={0.7}
                >
                  {leavingGroup ? (
                    <ActivityIndicator size="small" color={ui.deleteColor} />
                  ) : (
                    <>
                      <UserMinus size={15} color={ui.deleteColor} />
                      <Text style={[styles.dangerActionBtnText, { color: ui.deleteColor }]}>
                        Opustit rodinnou skupinu
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Odhlásit se */}
                <TouchableOpacity
                  style={[
                    styles.logoutActionBtn,
                    {
                      backgroundColor: ui.deleteColor,
                    },
                  ]}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <LogOut size={16} color="#FFFFFF" />
                  <Text style={styles.logoutActionBtnText}>
                    Odhlásit se z účtu
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ═════════════════════════════════════════════════════════════════
           MODAL 7.1 — Vytvořit / Upravit předvolbu směny
      ═════════════════════════════════════════════════════════════════ */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.sectionIconCircle, { backgroundColor: `${ui.accent}15` }]}>
                  <Sparkles size={17} color={ui.accent} />
                </View>
                <Text style={[styles.modalTitle, { color: ui.text }]}>{editingPreset ? 'Upravit směnu' : 'Nová směna'}</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: ui.inputBg }]} onPress={() => setModalVisible(false)}>
                <X size={16} color={ui.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Název */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Název směny</Text>
              <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                <TextInput style={[styles.textInput, { color: ui.text }]} placeholder="např. Denní, Noční Jirka, Zástup..." placeholderTextColor={ui.textMuted} value={title} onChangeText={setTitle} autoCapitalize="sentences" />
              </View>
            </View>

            {/* Member Scope Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Komu směnu zobrazit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeScrollRow}>
                <TouchableOpacity
                  style={[styles.scopePill, { backgroundColor: targetUserId === null ? ui.successBg : ui.inputBg, borderColor: targetUserId === null ? ui.successText : ui.border }]}
                  onPress={() => setTargetUserId(null)} activeOpacity={0.7}
                >
                  <Users size={12} color={targetUserId === null ? ui.successText : ui.textMuted} />
                  <Text style={[styles.scopePillText, { color: targetUserId === null ? ui.successText : ui.text }]}>Celá rodina</Text>
                </TouchableOpacity>
                {groupMembers.map((m) => {
                  const sel = targetUserId === m.id;
                  return (
                    <TouchableOpacity key={m.id}
                      style={[styles.scopePill, { backgroundColor: sel ? `${m.color}20` : ui.inputBg, borderColor: sel ? (m.color || ui.accent) : ui.border }]}
                      onPress={() => setTargetUserId(m.id)} activeOpacity={0.7}
                    >
                      <View style={[styles.colorDot, { backgroundColor: m.color || ui.accent }]} />
                      <Text style={[styles.scopePillText, { color: ui.text }]}>{m.display_name}{m.id === currentUser?.id ? ' (Vy)' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time Toggle */}
            <View style={[styles.switchRow, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: ui.text }]}>Nastavit čas směny</Text>
                <Text style={[styles.switchSubtitle, { color: ui.textMuted }]}>
                  {hasSpecificTime ? 'Přesný čas a hodiny' : 'Bez časů a bez hodin (pouze název a barva)'}
                </Text>
              </View>
              <Switch value={hasSpecificTime} onValueChange={setHasSpecificTime} trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: ui.accent }} thumbColor="#FFF" />
            </View>

            {/* Times Row */}
            {hasSpecificTime && (
              <View style={styles.timesRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Od</Text>
                  <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                    <TextInput style={[styles.textInput, { color: ui.text, textAlign: 'center' }]} placeholder="06:00" placeholderTextColor={ui.textMuted} value={startTime} onChangeText={(v) => handleTimeChange('start', v)} maxLength={5} />
                  </View>
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Do</Text>
                  <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                    <TextInput style={[styles.textInput, { color: ui.text, textAlign: 'center' }]} placeholder="18:00" placeholderTextColor={ui.textMuted} value={endTime} onChangeText={(v) => handleTimeChange('end', v)} maxLength={5} />
                  </View>
                </View>
                <View style={[styles.fieldGroup, { width: 72 }]}>
                  <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Hodin</Text>
                  <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                    <TextInput style={[styles.textInput, { color: ui.text, textAlign: 'center' }]} placeholder="12" placeholderTextColor={ui.textMuted} value={hours} onChangeText={setHours} keyboardType="numeric" />
                  </View>
                </View>
              </View>
            )}

            {/* Color Palette */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Barva směny</Text>
              <View style={styles.colorGrid}>
                {ShiftPalette.map((c) => (
                  <TouchableOpacity key={c.id} style={[styles.colorCircle, { backgroundColor: c.hex }, color === c.hex && styles.colorCircleSelected]} onPress={() => setColor(c.hex)} activeOpacity={0.8}>
                    {color === c.hex && <Check size={13} color="#FFF" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={[styles.previewBox, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
              <View style={[styles.previewBar, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewTitle, { color: ui.text }]}>{title.trim() || 'Název směny'}</Text>
                {hasSpecificTime && <Text style={[styles.previewSubtitle, { color: ui.textMuted }]}>{startTime} – {endTime}</Text>}
              </View>
              {hasSpecificTime && parseFloat(hours) > 0 && (
                <View style={[styles.previewBadge, { backgroundColor: `${color}25` }]}>
                  <Text style={[styles.previewBadgeText, { color }]}>{hours}h</Text>
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: ui.border }]} onPress={() => setModalVisible(false)} disabled={submitting}>
                <Text style={[styles.cancelBtnText, { color: ui.textMuted }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: ui.accent }]} onPress={handleSavePreset} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <><Check size={15} color="#FFF" strokeWidth={2.5} /><Text style={styles.submitBtnText}>Uložit</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════
           MODAL 7.2 — Přidat virtuálního člena / dítě
      ═════════════════════════════════════════════════════════════════ */}
      <Modal visible={addMemberVisible} transparent animationType="fade" onRequestClose={() => setAddMemberVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#10B98115' }]}>
                  <UserPlus size={17} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, { color: ui.text }]}>Přidat člena rodiny</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: ui.inputBg }]} onPress={() => setAddMemberVisible(false)}>
                <X size={16} color={ui.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.addMemberDesc, { color: ui.textMuted }]}>
              Vytvořte profil pro člena bez telefonu. Pak mu v kalendáři budete moci zapisovat směny a události.
            </Text>

            {/* Rychlá možnost pozvat člena s telefonem */}
            <View style={[styles.inviteNoticeBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE' }]}>
              <Share2 size={16} color="#3B82F6" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.inviteNoticeTitle, { color: ui.text }]}>Chcete pozvat člena s telefonem?</Text>
                <Text style={[styles.inviteNoticeDesc, { color: ui.textMuted }]}>
                  Pošlete mu odkaz ke sdílení kalendáře.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.inviteNoticeBtn}
                onPress={() => {
                  setAddMemberVisible(false);
                  handleShareInvite();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.inviteNoticeBtnText}>Sdílet</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Jméno člena</Text>
              <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder }]}>
                <TextInput style={[styles.textInput, { color: ui.text }]} placeholder="např. Anička, Babička, Tomáš..." placeholderTextColor={ui.textMuted} value={newMemberName} onChangeText={setNewMemberName} autoCapitalize="words" />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>Barva profilu</Text>
              <View style={styles.colorGrid}>
                {MemberColors.map((hex) => (
                  <TouchableOpacity key={hex} style={[styles.colorCircle, { backgroundColor: hex }, newMemberColor === hex && styles.colorCircleSelected]} onPress={() => setNewMemberColor(hex)} activeOpacity={0.8}>
                    {newMemberColor === hex && <Check size={13} color="#FFF" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={[styles.memberPreview, { backgroundColor: ui.inputBg, borderColor: ui.border }]}>
              <View style={[styles.memberAvatar, { backgroundColor: newMemberColor }]}>
                <Text style={styles.memberAvatarText}>{newMemberName.trim().charAt(0).toUpperCase() || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: ui.text }]}>{newMemberName.trim() || 'Jméno nového člena'}</Text>
                <Text style={[styles.memberSubtext, { color: ui.textMuted }]}>Dítě / Bez telefonu</Text>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: ui.border }]} onPress={() => setAddMemberVisible(false)} disabled={addingMember}>
                <Text style={[styles.cancelBtnText, { color: ui.textMuted }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleAddMember} disabled={addingMember}>
                {addingMember ? <ActivityIndicator size="small" color="#FFF" /> : <><Check size={15} color="#FFF" strokeWidth={2.5} /><Text style={styles.submitBtnText}>Přidat člena</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════
           MODAL 7.3 — Změnit heslo skupiny
      ═════════════════════════════════════════════════════════════════ */}
      <Modal visible={changePwdVisible} transparent animationType="fade" onRequestClose={() => setChangePwdVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <KeyRound size={17} color={ui.adminColor} />
                </View>
                <Text style={[styles.modalTitle, { color: ui.text }]}>
                  {currentGroup?.password_hash ? 'Změnit heslo skupiny' : 'Nastavit heslo skupiny'}
                </Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: ui.inputBg }]} onPress={() => setChangePwdVisible(false)}>
                <X size={16} color={ui.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.addMemberDesc, { color: ui.textMuted }]}>
              Heslo musí znát každý, kdo se chce připojit pomocí 6místného kódu. Nechte prázdné pro odebrání hesla.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>
                {currentGroup?.password_hash ? 'Nové heslo (prázdné = odebrat heslo)' : 'Heslo skupiny'}
              </Text>
              <View style={[styles.inputBox, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, flexDirection: 'row', alignItems: 'center', paddingRight: 4 }]}>
                <TextInput
                  style={[styles.textInput, { color: ui.text, flex: 1 }]}
                  placeholder="Zadejte heslo nebo nechte prázdné..."
                  placeholderTextColor={ui.textMuted}
                  value={newPwd}
                  onChangeText={setNewPwd}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={{ padding: 6 }}>
                  {showPwd ? <EyeOff size={16} color={ui.textMuted} /> : <Eye size={16} color={ui.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: ui.border }]} onPress={() => setChangePwdVisible(false)} disabled={updatingSecurity}>
                <Text style={[styles.cancelBtnText, { color: ui.textMuted }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: ui.adminColor }]} onPress={handleSavePassword} disabled={updatingSecurity}>
                {updatingSecurity ? <ActivityIndicator size="small" color="#FFF" /> : <><Check size={15} color="#FFF" strokeWidth={2.5} /><Text style={styles.submitBtnText}>Uložit</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════
           MODAL 8.1 — GitHub Autoupdater
      ═════════════════════════════════════════════════════════════════ */}
      <UpdateModal
        visible={updateModalVisible}
        release={availableRelease}
        currentVersion={getCurrentAppVersion()}
        onClose={() => setUpdateModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 11.5, fontWeight: '500', marginTop: 1 },
  adminHeaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  adminHeaderBadgeText: { fontSize: 11, fontWeight: '700' },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 24 },

  // Section
  section: { gap: 12 },
  sectionHeaderContainer: { gap: 5 },
  sectionTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sectionIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionDesc: { fontSize: 11.5, fontWeight: '500' },
  sectionActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
  sectionActionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  adminOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  adminOnlyText: { fontSize: 10.5, fontWeight: '700' },

  // Subsection (7.3)
  subsection: { gap: 8 },
  subsectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2 },
  subsectionTitle: { fontSize: 13, fontWeight: '800' },

  // Generic List
  listContainer: { gap: 8 },

  // Preset Card
  presetCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  presetColorBar: { width: 5, height: 34, borderRadius: 2.5, marginRight: 10 },
  presetContent: { flex: 1, gap: 3 },
  presetTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  presetTitle: { fontSize: 15, fontWeight: '700' },
  scopeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  scopeBadgeText: { fontSize: 10, fontWeight: '700' },
  hoursBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, borderWidth: 1 },
  hoursBadgeText: { fontSize: 10, fontWeight: '800' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  timeText: { fontSize: 11.5, fontWeight: '500' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Join Code Card
  joinCodeCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  joinCodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinCodeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  joinCodeValue: { fontSize: 27, fontWeight: '900', letterSpacing: 5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  copyBtnText: { fontSize: 12, fontWeight: '700' },
  shareInviteBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  shareInviteBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  joinCodeHintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 8, borderTopWidth: 1 },
  joinCodeHint: { flex: 1, fontSize: 11.5, lineHeight: 16, fontWeight: '500' },

  // Member Card (7.2 list)
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: 11, borderRadius: 14, borderWidth: 1, gap: 10 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  memberInfo: { flex: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14.5, fontWeight: '700' },
  meBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  meBadgeText: { fontSize: 10, fontWeight: '800' },
  memberSubtext: { fontSize: 11.5, fontWeight: '500' },
  roleBadgeAdmin: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  roleBadgeAdminText: { fontSize: 11, fontWeight: '700' },
  roleBadgeMember: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  roleBadgeMemberText: { fontSize: 11, fontWeight: '600' },

  // Pending Card (7.3A)
  pendingCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 13, borderWidth: 1, gap: 10 },
  pendingActions: { flexDirection: 'row', gap: 6 },
  approveBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Permission Cards (7.3B)
  permCard: { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  permCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  permExpandedContent: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, gap: 0, borderTopWidth: 1 },
  permSectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, marginTop: 2 },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  permColorDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  permRowTitle: { fontSize: 13.5, fontWeight: '700' },
  permRowSubtitle: { fontSize: 11, fontWeight: '500' },
  permActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  permActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5 },
  permActionBtnText: { fontSize: 11.5, fontWeight: '700' },
  emptyHint: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 13, borderWidth: 1 },
  emptyHintText: { flex: 1, fontSize: 12.5, fontWeight: '500', lineHeight: 18 },

  // Security Cards (7.3C)
  securityCard: { borderRadius: 14, borderWidth: 1, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  securityCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityRowTitle: { fontSize: 13.5, fontWeight: '700' },
  securityRowSubtitle: { fontSize: 11.5, fontWeight: '500', marginTop: 1 },
  securityChangeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  securityChangeBtnText: { fontSize: 12, fontWeight: '700' },

  // Placeholder
  placeholderCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12, opacity: 0.7 },
  placeholderTitle: { fontSize: 13.5, fontWeight: '700' },
  placeholderSubtitle: { fontSize: 11.5, fontWeight: '500', marginTop: 2 },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', paddingHorizontal: 18 },
  modalCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 13, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addMemberDesc: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  inviteNoticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 12, borderWidth: 1 },
  inviteNoticeTitle: { fontSize: 12.5, fontWeight: '700' },
  inviteNoticeDesc: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
  inviteNoticeBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  inviteNoticeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Form
  fieldGroup: { gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  inputBox: { borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, height: 44, justifyContent: 'center' },
  textInput: { fontSize: 14, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, borderRadius: 12, borderWidth: 1, gap: 12 },
  switchTitle: { fontSize: 13.5, fontWeight: '700' },
  switchSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  timesRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },

  // Scope Selector
  scopeScrollRow: { gap: 7, paddingVertical: 1 },
  scopePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, borderWidth: 1.5 },
  scopePillText: { fontSize: 12, fontWeight: '700' },
  colorDot: { width: 8, height: 8, borderRadius: 4 },

  // Color Grid
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 3 },
  colorCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  colorCircleSelected: { borderWidth: 2.5, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },

  // Preview
  previewBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 11, borderWidth: 1, padding: 10, gap: 9 },
  previewBar: { width: 4, height: 28, borderRadius: 2 },
  previewTitle: { fontSize: 13.5, fontWeight: '700' },
  previewSubtitle: { fontSize: 11, fontWeight: '500' },
  previewBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  previewBadgeText: { fontSize: 10.5, fontWeight: '800' },

  // Member Preview
  memberPreview: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 12, borderWidth: 1 },

  // Modal Buttons
  modalBtnRow: { flexDirection: 'row', gap: 9, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700' },
  submitBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  submitBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // 7.4A Cell Style Cards Styles
  styleGrid: {
    gap: 10,
  },
  styleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  styleCardActive: {
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  styleCardHeader: {
    flex: 1,
    gap: 4,
  },
  styleCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  styleCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  styleActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  styleActiveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  styleCardDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  miniMockupCell: {
    width: 68,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-start',
  },
  miniMockupDate: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  miniMockupContent: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2.5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  miniChipText: {
    fontSize: 7.5,
    fontWeight: '800',
  },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniPillText: {
    fontSize: 7.5,
    fontWeight: '700',
  },
  miniStrip: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    borderLeftWidth: 2,
  },
  miniStripText: {
    fontSize: 7,
    fontWeight: '700',
  },
  miniBottomTrack: {
    flexDirection: 'row',
    height: 2.5,
    gap: 1,
    marginTop: 2,
  },
  miniBlockRow: {
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 2,
    borderLeftWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBlockTitle: {
    fontSize: 7.5,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 9,
  },
  miniBlockSub: {
    fontSize: 6.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 8,
  },

  // 7.4B General Calendar Settings
  generalSettingsCardList: {
    gap: 10,
  },
  prefCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  prefTextCol: {
    flex: 1,
    gap: 2,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  prefSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  prefSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  todayStyleRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  todayStyleBtn: {
    flex: 1,
    minWidth: 65,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayStyleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // 7.4C Member Ordering & Visibility
  memberOrderList: {
    gap: 8,
    marginTop: 4,
  },
  memberOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  orderArrowsCol: {
    flexDirection: 'column',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtn: {
    padding: 4,
    borderRadius: 6,
  },
  arrowBtnDisabled: {
    opacity: 0.25,
  },
  memberOrderInfoCol: {
    flex: 1,
  },
  memberOrderAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberOrderName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  memberOrderRole: {
    fontSize: 11,
    fontWeight: '500',
  },
  memberOrderSwitchCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberOrderAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberOrderAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // 7.4D Theme & Appearance Styles
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOptionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  themeOptionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  themeOptionSubText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  fontSizePreviewBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
    marginTop: 4,
  },
  fontSizePreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  fontSizePreviewChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    gap: 2,
  },
  densityOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  densityCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 11,
    gap: 6,
  },
  densityCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  densityCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  densityActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  densityCardDesc: {
    fontSize: 10.5,
    fontWeight: '500',
    lineHeight: 14,
  },

  // 7.4F Account & About styles
  profileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileCardName: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileCardContact: {
    fontSize: 12,
    fontWeight: '500',
  },
  profileDivider: {
    height: 1,
    marginVertical: 4,
  },
  profileMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileMetaCol: {
    flex: 1,
    gap: 3,
  },
  profileMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  profileMetaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkUpdateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dangerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  dangerCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dangerCardSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dangerActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
