import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  if (!hasHydrated) return 'light';
  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';
  return colorScheme === 'dark' ? 'dark' : 'light';
}
