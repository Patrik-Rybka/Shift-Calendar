import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DbShift, DbShiftPreset } from '../services/db/neonClient';
import { batchUpsertShifts, batchDeleteShifts, fetchGroupShiftsRange } from '../services/db/syncService';

export type EditSubMode = 'stamp' | 'range';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export interface PendingChange {
  action: 'upsert' | 'delete';
  shift: DbShift;
  timestamp: number;
}

/**
 * Key format for fast O(1) lookup in calendar cells: `${userId}_${date}` (date is YYYY-MM-DD)
 */
export function getShiftMapKey(userId: string, date: string): string {
  return `${userId}_${date}`;
}

export interface ShiftState {
  // Presets available to the group
  presets: DbShiftPreset[];

  // Shifts indexed by `${userId}_${date}`
  shifts: Record<string, DbShift>;

  // Calendar View & Navigation
  currentMonth: Date; // represents 1st day of viewed month

  // Sync state
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  pendingChanges: Record<string, PendingChange>; // Keyed by `${userId}_${date}`

  // Editing state
  isEditMode: boolean;
  editingUserId: string | null; // which family member we are currently stamping for
  editSubMode: EditSubMode;
  selectedPresetId: string | null; // null represents "Erase / Delete"
  rangeStart: string | null; // YYYY-MM-DD
  rangeEnd: string | null; // YYYY-MM-DD

  // Actions
  setPresets: (presets: DbShiftPreset[]) => void;
  setShifts: (shiftsList: DbShift[]) => void;
  setCurrentMonth: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  setSyncStatus: (status: SyncStatus) => void;

  setEditMode: (enabled: boolean) => void;
  setEditingUserId: (userId: string | null) => void;
  setEditSubMode: (mode: EditSubMode) => void;
  setSelectedPresetId: (presetId: string | null) => void;
  setRangeStart: (date: string | null) => void;
  setRangeEnd: (date: string | null) => void;
  clearRangeSelection: () => void;

  // Optimistic shift manipulation
  applyShift: (params: {
    groupId: string;
    userId: string;
    date: string;
    presetId: string | null;
    customHours?: number | null;
    note?: string | null;
  }) => void;
  removeShift: (groupId: string, userId: string, date: string) => void;

  // Sync with Neon database
  syncWithNeon: (groupId: string) => Promise<boolean>;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      presets: [],
      shifts: {},
      currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),

      syncStatus: 'synced',
      lastSyncedAt: null,
      pendingChanges: {},

      isEditMode: false,
      editingUserId: null,
      editSubMode: 'stamp',
      selectedPresetId: null,
      rangeStart: null,
      rangeEnd: null,

      setPresets: (presets) => set({ presets }),

      setShifts: (shiftsList) => {
        const shiftMap: Record<string, DbShift> = {};
        for (const shift of shiftsList) {
          const dateStr = typeof shift.date === 'string' 
            ? shift.date.split('T')[0] 
            : new Date(shift.date).toISOString().split('T')[0];
          
          const key = getShiftMapKey(shift.user_id, dateStr);
          shiftMap[key] = {
            ...shift,
            date: dateStr,
          };
        }
        set({ shifts: shiftMap });
      },

      setCurrentMonth: (date) => set({ currentMonth: date }),

      nextMonth: () => {
        const current = get().currentMonth;
        const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        set({ currentMonth: next });
      },

      prevMonth: () => {
        const current = get().currentMonth;
        const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        set({ currentMonth: prev });
      },

      setSyncStatus: (status) => set({ syncStatus: status }),

      setEditMode: (enabled) => {
        set({
          isEditMode: enabled,
          rangeStart: null,
          rangeEnd: null,
        });
      },

      setEditingUserId: (userId) => set({ editingUserId: userId }),
      setEditSubMode: (mode) => set({ editSubMode: mode, rangeStart: null, rangeEnd: null }),
      setSelectedPresetId: (presetId) => set({ selectedPresetId: presetId }),
      setRangeStart: (date) => set({ rangeStart: date }),
      setRangeEnd: (date) => set({ rangeEnd: date }),
      clearRangeSelection: () => set({ rangeStart: null, rangeEnd: null }),

      applyShift: ({ groupId, userId, date, presetId, customHours, note }) => {
        const key = getShiftMapKey(userId, date);
        const existing = get().shifts[key];

        const updatedShift: DbShift = {
          id: existing?.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          group_id: groupId,
          user_id: userId,
          date,
          shift_preset_id: presetId,
          custom_hours: customHours ?? null,
          note: note ?? null,
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          shifts: {
            ...state.shifts,
            [key]: updatedShift,
          },
          pendingChanges: {
            ...state.pendingChanges,
            [key]: {
              action: 'upsert',
              shift: updatedShift,
              timestamp: Date.now(),
            },
          },
          syncStatus: 'pending',
        }));
      },

      removeShift: (groupId, userId, date) => {
        const key = getShiftMapKey(userId, date);
        const existing = get().shifts[key];

        const dummyShift: DbShift = existing || {
          id: `del_${Date.now()}`,
          group_id: groupId,
          user_id: userId,
          date,
          shift_preset_id: null,
          custom_hours: null,
          note: null,
          updated_at: new Date().toISOString(),
        };

        set((state) => {
          const nextShifts = { ...state.shifts };
          delete nextShifts[key];

          return {
            shifts: nextShifts,
            pendingChanges: {
              ...state.pendingChanges,
              [key]: {
                action: 'delete',
                shift: dummyShift,
                timestamp: Date.now(),
              },
            },
            syncStatus: 'pending',
          };
        });
      },

      syncWithNeon: async (groupId: string): Promise<boolean> => {
        const { pendingChanges, currentMonth } = get();
        set({ syncStatus: 'syncing' });

        try {
          // 1. Flush pending local changes to Neon
          const pendingList = Object.values(pendingChanges);
          const upserts = pendingList
            .filter((p) => p.action === 'upsert')
            .map((p) => p.shift);
          const deletes = pendingList
            .filter((p) => p.action === 'delete')
            .map((p) => ({
              groupId: p.shift.group_id,
              userId: p.shift.user_id,
              date: typeof p.shift.date === 'string' ? p.shift.date.split('T')[0] : p.shift.date,
            }));

          if (upserts.length > 0) {
            const ok = await batchUpsertShifts(upserts);
            if (!ok) throw new Error('Batch upsert failed');
          }

          if (deletes.length > 0) {
            const ok = await batchDeleteShifts(deletes);
            if (!ok) throw new Error('Batch delete failed');
          }

          // Clear flushed changes
          set({ pendingChanges: {} });

          // 2. Fetch fresh shifts for visible month (with 7 days padding before and after)
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth(); // 0-indexed
          const startDate = new Date(year, month - 1, 20).toISOString().split('T')[0];
          const endDate = new Date(year, month + 2, 10).toISOString().split('T')[0];

          const remoteShifts = await fetchGroupShiftsRange(groupId, startDate, endDate);
          get().setShifts(remoteShifts);

          const now = new Date().toISOString();
          set({
            syncStatus: 'synced',
            lastSyncedAt: now,
          });
          return true;
        } catch (error) {
          console.warn('Sync failed (likely offline):', error);
          set({ syncStatus: 'offline' });
          return false;
        }
      },
    }),
    {
      name: 'family-shift-data-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        presets: state.presets,
        shifts: state.shifts,
        pendingChanges: state.pendingChanges,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
