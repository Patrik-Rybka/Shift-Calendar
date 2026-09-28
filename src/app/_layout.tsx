import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getCurrentAppVersion } from '@/services/updateService';
import { logger } from '@/services/logger';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';

  // Globální záznam do diagnostického logu při startu aplikace
  useEffect(() => {
    logger.info('BOOT', `Aplikace spuštěna (v${getCurrentAppVersion()})`);
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
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
