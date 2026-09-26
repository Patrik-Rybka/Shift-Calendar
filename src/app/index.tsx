import React, { useEffect } from 'react';
import { View, ActivityIndicator, useColorScheme, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { Colors } from '@/constants/theme';

export default function IndexGate() {
  const router = useRouter();
  const { currentUser, currentGroup } = useAuthStore();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    // Immediate routing based on user state
    const timer = setTimeout(() => {
      if (!currentUser) {
        router.replace('/welcome');
      } else if (!currentGroup) {
        router.replace('/group-choice' as any);
      } else {
        // When calendar is ready in Phase 5, this will be the main calendar
        router.replace('/welcome');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentUser, currentGroup]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
