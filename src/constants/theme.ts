/**
 * Color system and themes for Family Shift Calendar.
 * Designed for high contrast, readability on mobile screens, and clear distinction of shifts.
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A', // Slate 900
    textSecondary: '#475569', // Slate 600
    textMuted: '#94A3B8', // Slate 400
    background: '#F8FAFC', // Slate 50
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    card: '#FFFFFF',
    border: '#E2E8F0', // Slate 200
    tint: '#2563EB', // Blue 600
    tabIconDefault: '#64748B',
    tabIconSelected: '#2563EB',
    weekendBg: '#F1F5F9', // Subtle tint for Sat/Sun
    todayBorder: '#2563EB',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  dark: {
    text: '#F8FAFC', // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B', // Slate 500
    background: '#0B0F19', // Deep dark
    backgroundElement: '#151D2F',
    backgroundSelected: '#1E293B',
    card: '#151D2F',
    border: '#1E293B', // Slate 800
    tint: '#38BDF8', // Sky 400
    tabIconDefault: '#64748B',
    tabIconSelected: '#38BDF8',
    weekendBg: '#111827',
    todayBorder: '#38BDF8',
    danger: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Palette for Shift presets and Family member colors
export const ShiftPalette = [
  { id: 'blue', name: 'Modrá', hex: '#2563EB', bg: '#DBEAFE', text: '#1E40AF' },
  { id: 'purple', name: 'Fialová', hex: '#7C3AED', bg: '#EDE9FE', text: '#5B21B6' },
  { id: 'amber', name: 'Jantarová', hex: '#D97706', bg: '#FEF3C7', text: '#92400E' },
  { id: 'emerald', name: 'Zelená', hex: '#059669', bg: '#D1FAE5', text: '#065F46' },
  { id: 'rose', name: 'Růžová', hex: '#E11D48', bg: '#FFE4E6', text: '#9F1239' },
  { id: 'indigo', name: 'Indigo', hex: '#4F46E5', bg: '#E0E7FF', text: '#3730A3' },
  { id: 'teal', name: 'Tyrkysová', hex: '#0D9488', bg: '#CCFBF1', text: '#115E59' },
  { id: 'orange', name: 'Oranžová', hex: '#EA580C', bg: '#FFEDD5', text: '#9A3412' },
  { id: 'cyan', name: 'Azurová', hex: '#0284C7', bg: '#E0F2FE', text: '#075985' },
  { id: 'slate', name: 'Šedá', hex: '#475569', bg: '#F1F5F9', text: '#1E293B' },
] as const;

// User avatar / member accent colors
export const MemberColors = [
  '#0EA5E9', // Sky
  '#F43F5E', // Rose
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Typography = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  title: 34,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
