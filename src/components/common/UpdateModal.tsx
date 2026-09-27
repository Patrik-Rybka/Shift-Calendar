import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
} from 'react-native';
import {
  Sparkles,
  Download,
  ExternalLink,
  X,
  Clock,
} from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ReleaseInfo,
  openUpdateDownload,
  dismissUpdateFor24Hours,
} from '@/services/updateService';

interface UpdateModalProps {
  visible: boolean;
  release: ReleaseInfo | null;
  currentVersion: string;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  release,
  currentVersion,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Obsluha tlačítka Zpět na Androidu
  useEffect(() => {
    if (!visible) return;

    const onBackPress = () => {
      dismissUpdateFor24Hours().catch(() => {});
      onClose();
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [visible, onClose]);

  if (!visible || !release) return null;

  const formatBytes = (bytes?: number | null): string => {
    if (!bytes || typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    return `~${mb.toFixed(1)} MB`;
  };

  const handleDownload = () => {
    openUpdateDownload(release.apkDownloadUrl, release.htmlUrl);
    onClose();
  };

  const handleDismissTomorrow = async () => {
    await dismissUpdateFor24Hours();
    onClose();
  };

  const bgCard = isDark ? '#1E293B' : '#FFFFFF';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const codeBoxBg = isDark ? '#0F172A' : '#F1F5F9';
  const apkSizeFormatted = formatBytes(release.apkSize);

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Ztmavené pozadí */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleDismissTomorrow}
      />

      {/* Karta aktualizace */}
      <View style={[styles.modalCard, { backgroundColor: bgCard, borderColor }]}>
        {/* Křížek v rohu */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismissTomorrow}
          activeOpacity={0.7}
        >
          <X size={20} color={textSecondary} />
        </TouchableOpacity>

        {/* Záhlaví s ikonou */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Sparkles size={28} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: textPrimary }]}>
            Nová verze je k dispozici!
          </Text>

          {/* Verze badge */}
          <View style={styles.versionBadgeRow}>
            <View style={[styles.badge, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={[styles.badgeText, { color: textSecondary }]}>
                Nyní: v{currentVersion}
              </Text>
            </View>
            <Text style={{ color: '#3B82F6', fontWeight: 'bold' }}>➔</Text>
            <View style={[styles.badge, { backgroundColor: '#3B82F6' }]}>
              <Text style={[styles.badgeText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                Nová: v{release.version}
              </Text>
            </View>
          </View>
        </View>

        {/* Poznámky k vydání */}
        <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={true}>
          <Text style={[styles.releaseName, { color: textPrimary }]}>
            {release.name || `Verze ${release.version}`}
          </Text>

          {apkSizeFormatted ? (
            <Text style={[styles.apkSizeText, { color: textSecondary }]}>
              Velikost balíčku: {apkSizeFormatted}
            </Text>
          ) : null}

          <Text style={[styles.notesHeading, { color: textSecondary }]}>Co je nového:</Text>
          <View style={[styles.notesBox, { backgroundColor: codeBoxBg, borderColor }]}>
            <Text style={[styles.notesText, { color: textPrimary }]}>
              {(release.notes ? String(release.notes).trim() : '') ||
                'Pravidelné vylepšení stability, rychlosti a nové funkce.'}
            </Text>
          </View>
        </ScrollView>

        {/* Akční tlačítka */}
        <View style={styles.footer}>
          <View style={styles.btnColumn}>
            {/* 1. Hlavní tlačítko: Stáhnout aktualizaci do prohlížeče */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleDownload}
              activeOpacity={0.8}
            >
              <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Stáhnout aktualizaci</Text>
            </TouchableOpacity>

            {/* 2. Zobrazit na GitHubu */}
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor }]}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <ExternalLink size={16} color={textPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.secondaryBtnText, { color: textPrimary }]}>
                Otevřít stránku vydání na GitHubu
              </Text>
            </TouchableOpacity>

            {/* 3. Připomenout zítra */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismissTomorrow}
              activeOpacity={0.7}
            >
              <Clock size={14} color={textSecondary} style={{ marginRight: 5 }} />
              <Text style={[styles.dismissBtnText, { color: textSecondary }]}>
                Připomenout zítra
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
    position: 'relative',
    zIndex: 1000000,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  versionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesScroll: {
    maxHeight: 220,
    marginBottom: 16,
  },
  releaseName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  apkSizeText: {
    fontSize: 12,
    marginBottom: 10,
  },
  notesHeading: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 6,
  },
  btnColumn: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissBtn: {
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 13,
  },
});
