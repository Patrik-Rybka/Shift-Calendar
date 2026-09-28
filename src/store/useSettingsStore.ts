import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarCellStyle = 'blocks' | 'full_fill' | 'badge' | 'bottom_strip' | 'dots';
export type FirstDayOfWeek = 'monday' | 'sunday';
export type TodayHighlightStyle = 'badge' | 'border' | 'dot' | 'subtle';
export type DefaultEditMemberMode = 'always_me' | 'remember_last';
export type ThemeMode = 'system' | 'dark' | 'light';
export type FontSizeScale = 'small' | 'medium' | 'large';
export type CalendarDensity = 'comfortable' | 'compact';
export type CalendarViewMode = 'month' | 'week' | 'day';

export interface SettingsState {
  /** Active view mode of calendar: 'month' | 'week' | 'day' */
  calendarView: CalendarViewMode;
  setCalendarView: (view: CalendarViewMode) => void;

  /** Default view mode when opening the app */
  defaultCalendarView: CalendarViewMode;
  setDefaultCalendarView: (view: CalendarViewMode) => void;

  /** Active selected date (YYYY-MM-DD) shared across Month, Week, and Day views */
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  /** Visual style of shift items in calendar day cells (Step 7.4A) */
  cellStyle: CalendarCellStyle;
  setCellStyle: (style: CalendarCellStyle) => void;

  /** First day of the week: 'monday' (Po) or 'sunday' (Ne) */
  firstDayOfWeek: FirstDayOfWeek;
  setFirstDayOfWeek: (day: FirstDayOfWeek) => void;

  /** Show ISO week numbers (e.g. 40, 41, 42) along the left edge of the grid */
  showWeekNumbers: boolean;
  setShowWeekNumbers: (show: boolean) => void;

  /** Highlight weekend days (Saturday & Sunday) with a distinct background/text tint */
  highlightWeekends: boolean;
  setHighlightWeekends: (highlight: boolean) => void;

  /** Visual style for highlighting the current day (today) */
  todayHighlightStyle: TodayHighlightStyle;
  setTodayHighlightStyle: (style: TodayHighlightStyle) => void;

  /** Highlight official Czech national and public holidays */
  showHolidays: boolean;
  setShowHolidays: (show: boolean) => void;

  // Step 7.4C: Member Display & Ordering Preferences
  /** Member IDs that should be hidden in calendar view */
  hiddenMemberIds: string[];
  setMemberHidden: (memberId: string, hidden: boolean) => void;
  toggleMemberVisibility: (memberId: string) => void;
  setAllMembersVisible: () => void;

  /** Default member when opening edit mode: 'always_me' or 'remember_last' */
  defaultEditMemberMode: DefaultEditMemberMode;
  setDefaultEditMemberMode: (mode: DefaultEditMemberMode) => void;

  /** Custom ordering of family members by ID */
  memberOrderIds: string[];
  setMemberOrderIds: (orderIds: string[]) => void;
  moveMemberOrder: (memberId: string, direction: 'up' | 'down', allMemberIds: string[]) => void;

  // Step 7.4D: Theme & App Appearance
  /** App color theme: 'system' | 'dark' | 'light' */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  /** Font scale in calendar and cards: 'small' | 'medium' | 'large' */
  fontSizeScale: FontSizeScale;
  setFontSizeScale: (scale: FontSizeScale) => void;

  /** Calendar day cell height / layout density: 'comfortable' | 'compact' */
  calendarDensity: CalendarDensity;
  setCalendarDensity: (density: CalendarDensity) => void;

  /** Map of memberId -> array of shift preset IDs hidden for that member */
  memberHiddenPresetIds: Record<string, string[]>;
  setMemberPresetHidden: (memberId: string, presetId: string, hidden: boolean) => void;
  resetMemberHiddenPresets: (memberId: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Views & Selected Date
      calendarView: 'month',
      defaultCalendarView: 'month',
      selectedDate: new Date().toISOString().split('T')[0],

      setCalendarView: (calendarView) => set({ calendarView }),
      setDefaultCalendarView: (defaultCalendarView) => set({ defaultCalendarView }),
      setSelectedDate: (selectedDate) => set({ selectedDate }),

      // Step 7.4A
      cellStyle: 'blocks',

      // Step 7.4B: Calendar General Settings
      firstDayOfWeek: 'monday',
      showWeekNumbers: true,
      highlightWeekends: true,
      todayHighlightStyle: 'badge',
      showHolidays: true,

      // Step 7.4C: Member Display & Ordering
      hiddenMemberIds: [],
      defaultEditMemberMode: 'always_me',
      memberOrderIds: [],

      // Step 7.4D: Theme & Appearance
      themeMode: 'system',
      fontSizeScale: 'medium',
      calendarDensity: 'comfortable',
      memberHiddenPresetIds: {},

      setMemberPresetHidden: (memberId, presetId, hidden) => {
        const currentMap = get().memberHiddenPresetIds || {};
        const memberList = currentMap[memberId] || [];
        if (hidden) {
          if (!memberList.includes(presetId)) {
            set({
              memberHiddenPresetIds: {
                ...currentMap,
                [memberId]: [...memberList, presetId],
              },
            });
          }
        } else {
          set({
            memberHiddenPresetIds: {
              ...currentMap,
              [memberId]: memberList.filter((id) => id !== presetId),
            },
          });
        }
      },

      resetMemberHiddenPresets: (memberId) => {
        const currentMap = get().memberHiddenPresetIds || {};
        const updated = { ...currentMap };
        delete updated[memberId];
        set({ memberHiddenPresetIds: updated });
      },

      setCellStyle: (cellStyle) => set({ cellStyle }),
      setFirstDayOfWeek: (firstDayOfWeek) => set({ firstDayOfWeek }),
      setShowWeekNumbers: (showWeekNumbers) => set({ showWeekNumbers }),
      setHighlightWeekends: (highlightWeekends) => set({ highlightWeekends }),
      setTodayHighlightStyle: (todayHighlightStyle) => set({ todayHighlightStyle }),
      setShowHolidays: (showHolidays) => set({ showHolidays }),

      setThemeMode: (themeMode) => set({ themeMode }),
      setFontSizeScale: (fontSizeScale) => set({ fontSizeScale }),
      setCalendarDensity: (calendarDensity) => set({ calendarDensity }),

      setMemberHidden: (memberId, hidden) => {
        const current = get().hiddenMemberIds;
        if (hidden) {
          if (!current.includes(memberId)) {
            set({ hiddenMemberIds: [...current, memberId] });
          }
        } else {
          set({ hiddenMemberIds: current.filter((id) => id !== memberId) });
        }
      },

      toggleMemberVisibility: (memberId) => {
        const current = get().hiddenMemberIds;
        if (current.includes(memberId)) {
          set({ hiddenMemberIds: current.filter((id) => id !== memberId) });
        } else {
          set({ hiddenMemberIds: [...current, memberId] });
        }
      },

      setAllMembersVisible: () => set({ hiddenMemberIds: [] }),

      setDefaultEditMemberMode: (defaultEditMemberMode) => set({ defaultEditMemberMode }),

      setMemberOrderIds: (memberOrderIds) => set({ memberOrderIds }),

      moveMemberOrder: (memberId, direction, allMemberIds) => {
        const currentOrder = get().memberOrderIds.length > 0 ? [...get().memberOrderIds] : [...allMemberIds];
        // Ensure all current member IDs exist in the ordering array
        for (const id of allMemberIds) {
          if (!currentOrder.includes(id)) {
            currentOrder.push(id);
          }
        }

        const index = currentOrder.indexOf(memberId);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
          const temp = currentOrder[index - 1];
          currentOrder[index - 1] = currentOrder[index];
          currentOrder[index] = temp;
          set({ memberOrderIds: currentOrder });
        } else if (direction === 'down' && index < currentOrder.length - 1) {
          const temp = currentOrder[index + 1];
          currentOrder[index + 1] = currentOrder[index];
          currentOrder[index] = temp;
          set({ memberOrderIds: currentOrder });
        }
      },
    }),
    {
      name: 'family-shift-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
