import React, { useEffect, useState } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UpdateModal } from '@/components/common/UpdateModal';
import {
  checkForUpdate,
  getCurrentAppVersion,
  isUpdateDismissed,
  ReleaseInfo,
} from '@/services/updateService';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [availableRelease, setAvailableRelease] = useState<ReleaseInfo | null>(null);

  // Globální kontrola aktualizací při startu aplikace
  useEffect(() => {
    let isMounted = true;
    const checkSilentUpdate = async () => {
      try {
        // Pokud uživatel kliknul "Připomenout zítra", nezobrazujeme popup po dobu 24 hodin
        const dismissed = await isUpdateDismissed();
        if (dismissed) return;

        const result = await checkForUpdate();
        if (isMounted && result?.hasUpdate && result?.release) {
          setAvailableRelease(result.release);
          setUpdateModalVisible(true);
        }
      } catch {
        // Tichá kontrola bezpečně ignoruje případný výpadek sítě
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
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
