import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useColorScheme(): 'light' | 'dark' {
  const rnScheme = useRNColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';
  return rnScheme === 'dark' ? 'dark' : 'light';
}
