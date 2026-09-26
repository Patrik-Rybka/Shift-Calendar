import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  Sparkles,
  Download,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  RefreshCw,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ReleaseInfo,
  downloadApk,
  cancelApkDownload,
  triggerApkInstall,
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

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [writtenBytes, setWrittenBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  // Reset stavu při otevření/zavření modálu
  useEffect(() => {
    if (!visible) {
      setIsDownloading(false);
      setDownloadProgress(0);
      setWrittenBytes(0);
      setTotalBytes(0);
      setDownloadedUri(null);
      setErrorMessage(null);
      setIsInstalling(false);
    }
  }, [visible]);

  if (!visible || !release) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleStartDownload = async () => {
    if (!release.apkDownloadUrl) {
      // Pokud release nemá přímé APK v přílohách, otevřeme stránku vydání na GitHubu
      Linking.openURL(release.htmlUrl);
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setWrittenBytes(0);
    setTotalBytes(release.apkSize || 0);
    setErrorMessage(null);

    try {
      const uri = await downloadApk(
        release.apkDownloadUrl,
        (progress, written, expected) => {
          setDownloadProgress(progress);
          setWrittenBytes(written);
          if (expected > 0) setTotalBytes(expected);
        }
      );

      setDownloadedUri(uri);
      setIsDownloading(false);
      setIsInstalling(true);

      // Spustíme instalátor balíčků
      await triggerApkInstall(uri, release.apkDownloadUrl);
    } catch (err: any) {
      setIsDownloading(false);
      setErrorMessage(
        err.message || 'Během stahování aktualizace došlo k chybě. Zkuste to prosím znovu.'
      );
    }
  };

  const handleCancel = async () => {
    if (isDownloading) {
      await cancelApkDownload();
      setIsDownloading(false);
      setDownloadProgress(0);
    } else {
      onClose();
    }
  };

  const handleReinstall = async () => {
    if (!downloadedUri) return;
    try {
      setIsInstalling(true);
      await triggerApkInstall(downloadedUri, release.apkDownloadUrl);
    } catch (err: any) {
      Alert.alert('Chyba při instalaci', err.message || 'Nepodařilo se spustit instalátor.');
    }
  };

  const handleOpenBrowser = () => {
    const url = release.apkDownloadUrl || release.htmlUrl;
    Linking.openURL(url);
  };

  // Barvy vzhledu
  const bgCard = isDark ? '#1E293B' : '#FFFFFF';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const codeBoxBg = isDark ? '#0F172A' : '#F1F5F9';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: bgCard, borderColor }]}>
          {/* Zavírací křížek v rohu */}
          {!isDownloading && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
          )}

          {/* Záhlaví s ikonou */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Sparkles size={28} color="#3B82F6" />
            </View>
            <Text style={[styles.title, { color: textPrimary }]}>
              {downloadedUri ? 'Aktualizace je připravena!' : 'Nová verze je k dispozici!'}
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

          {/* Chybová hláška */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Obsah - buď průběh stahování, nebo informace o vydání */}
          {isDownloading ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressTitle, { color: textPrimary }]}>
                Stahuji nový balíček aplikace...
              </Text>

              {/* Progress bar */}
              <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(downloadProgress * 100)}%` },
                  ]}
                />
              </View>

              {/* Procenta a MB */}
              <View style={styles.progressStatsRow}>
                <Text style={[styles.progressPercent, { color: '#3B82F6' }]}>
                  {Math.round(downloadProgress * 100)} %
                </Text>
                <Text style={[styles.progressBytes, { color: textSecondary }]}>
                  {formatBytes(writtenBytes)}{' '}
                  {totalBytes > 0 ? `/ ${formatBytes(totalBytes)}` : ''}
                </Text>
              </View>

              <Text style={[styles.progressNote, { color: textSecondary }]}>
                Po dokončení stahování se automaticky otevře instalátor Androidu pro potvrzení.
              </Text>
            </View>
          ) : downloadedUri ? (
            <View style={styles.installedContainer}>
              <View style={styles.installedIconBox}>
                <PackageCheck size={36} color="#10B981" />
              </View>
              <Text style={[styles.installedTitle, { color: textPrimary }]}>
                Soubor byl úspěšně stažen
              </Text>
              <Text style={[styles.installedDesc, { color: textSecondary }]}>
                Pokud se instalátor neotevřel automaticky nebo jste jej omylem zavřeli, klikněte na
                tlačítko níže.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={true}>
              <Text style={[styles.releaseName, { color: textPrimary }]}>{release.name}</Text>

              {release.apkSize ? (
                <Text style={[styles.apkSizeText, { color: textSecondary }]}>
                  Velikost instalačního balíčku: ~{formatBytes(release.apkSize)}
                </Text>
              ) : null}

              <Text style={[styles.notesHeading, { color: textSecondary }]}>Co je nového:</Text>
              <View style={[styles.notesBox, { backgroundColor: codeBoxBg, borderColor }]}>
                <Text style={[styles.notesText, { color: textPrimary }]}>
                  {release.notes.trim() || 'Pravidelné vylepšení stability, rychlosti a nové funkce.'}
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Spodní akční tlačítka */}
          <View style={styles.footer}>
            {isDownloading ? (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor }]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: textSecondary }]}>
                  Zrušit stahování
                </Text>
              </TouchableOpacity>
            ) : downloadedUri ? (
              <View style={styles.btnColumn}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleReinstall}
                  activeOpacity={0.8}
                >
                  <PackageCheck size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Spustit instalátor znovu</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryBtnText, { color: textSecondary }]}>Zavřít</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.btnColumn}>
                {release.apkDownloadUrl ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleStartDownload}
                    activeOpacity={0.8}
                  >
                    <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Stáhnout a instalovat</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    { borderColor },
                    !release.apkDownloadUrl && styles.primaryBtnFallback,
                  ]}
                  onPress={handleOpenBrowser}
                  activeOpacity={0.7}
                >
                  <ExternalLink
                    size={16}
                    color={!release.apkDownloadUrl ? '#FFFFFF' : textPrimary}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.secondaryBtnText,
                      { color: !release.apkDownloadUrl ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    Otevřít v prohlížeči (GitHub)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dismissBtnText, { color: textSecondary }]}>Připomenout později</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 13,
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
  progressContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
  progressStatsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBytes: {
    fontSize: 13,
  },
  progressNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  installedContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  installedIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  installedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  installedDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
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
  primaryBtnFallback: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
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
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 13,
  },
});
