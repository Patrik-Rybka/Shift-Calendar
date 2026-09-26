import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UpdateModal } from '@/components/common/UpdateModal';
import { checkForUpdate, getCurrentAppVersion, ReleaseInfo } from '@/services/updateService';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [availableRelease, setAvailableRelease] = useState<ReleaseInfo | null>(null);

  // Globální kontrola aktualizací při startu aplikace
  useEffect(() => {
    const checkSilentUpdate = async () => {
      try {
        const result = await checkForUpdate();
        if (result.hasUpdate && result.release) {
          setAvailableRelease(result.release);
          setUpdateModalVisible(true);
        }
      } catch {
        // Tichá kontrola ignoruje případný výpadek sítě
      }
    };
    const timer = setTimeout(checkSilentUpdate, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Kontrola i při návratu do aplikace z pozadí
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkForUpdate()
          .then((result) => {
            if (result.hasUpdate && result.release) {
              setAvailableRelease(result.release);
              setUpdateModalVisible(true);
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
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

      <UpdateModal
        visible={updateModalVisible}
        release={availableRelease}
        currentVersion={getCurrentAppVersion()}
        onClose={() => setUpdateModalVisible(false)}
      />
    </>
  );
}
