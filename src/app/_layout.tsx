import React, { useEffect, useState } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UpdateModal } from '@/components/common/UpdateModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  checkForUpdate,
  getCurrentAppVersion,
  isUpdateDismissed,
  ReleaseInfo,
} from '@/services/updateService';

import { logger } from '@/services/logger';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [availableRelease, setAvailableRelease] = useState<ReleaseInfo | null>(null);

  // Globální kontrola aktualizací při startu aplikace
  useEffect(() => {
    logger.info('BOOT', `Aplikace spuštěna (v${getCurrentAppVersion()})`);

    let isMounted = true;
    const checkSilentUpdate = async () => {
      try {
        // Pokud uživatel kliknul "Připomenout zítra", nezobrazujeme popup po dobu 24 hodin
        const dismissed = await isUpdateDismissed();
        if (dismissed) {
          logger.info('UPDATE', 'Automatická kontrola aktualizací je odložena o 24 hodin.');
          return;
        }

        const result = await checkForUpdate();
        if (result?.hasUpdate && result?.release) {
          logger.info('UPDATE', `Nalezena nová verze: ${result.release.version}`);
          if (isMounted) {
            setAvailableRelease(result.release);
            setUpdateModalVisible(true);
          }
        } else {
          logger.info('UPDATE', 'Aplikace je aktuální.');
        }
      } catch (e: any) {
        logger.warn('UPDATE', 'Tichá kontrola aktualizací se nezdařila', e?.message);
      }
    };

    const timer = setTimeout(checkSilentUpdate, 2500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Kontrola i při návratu do aplikace z pozadí (pokud není odloženo na zítřek)
  useEffect(() => {
    let isMounted = true;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        isUpdateDismissed().then((dismissed) => {
          if (dismissed) return;
          checkForUpdate()
            .then((result) => {
              if (isMounted && result?.hasUpdate && result?.release) {
                setAvailableRelease(result.release);
                setUpdateModalVisible(true);
              }
            })
            .catch(() => {});
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <View style={styles.root}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="group-choice" />
          <Stack.Screen name="profile-setup" />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        </Stack>

        {updateModalVisible && availableRelease && (
          <UpdateModal
            visible={updateModalVisible}
            release={availableRelease}
            currentVersion={getCurrentAppVersion()}
            onClose={() => setUpdateModalVisible(false)}
          />
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
