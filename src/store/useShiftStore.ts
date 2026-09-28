import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DbShift, DbShiftPreset } from '../services/db/neonClient';
import { batchUpsertShifts, batchDeleteShifts, fetchGroupShiftsRange, type ShiftDeleteTarget } from '../services/db/syncService';
import { formatLocalDate } from '@/utils/calendarUtils';
import { logger } from '../services/logger';

export type EditSubMode = 'stamp' | 'range';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export interface PendingChange {
  action: 'upsert' | 'delete';
  shift: DbShift;
  timestamp: number;
}

/**
 * Key format for fast O(1) lookup in calendar cells: `${userId}_${date}_${presetId}` (date is YYYY-MM-DD)
 */
export function getShiftMapKey(userId: string, date: string, presetId?: string | null): string {
  return presetId ? `${userId}_${date}_${presetId}` : `${userId}_${date}_note`;
}

/**
 * Returns all shifts for a user on a given date (supporting multiple shifts/events per day).
 */
export function getUserShiftsForDay(shifts: Record<string, DbShift> | undefined | null, userId: string, date: string): DbShift[] {
  if (!shifts) return [];
  const prefix = `${userId}_${date}`;
  const result: DbShift[] = [];
  for (const [key, shift] of Object.entries(shifts)) {
    if (key.startsWith(prefix) || (shift && shift.user_id === userId && shift.date === date)) {
      result.push(shift);
    }
  }
  return result;
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
  setShifts: (shiftsList: DbShift[], rangeStart?: string, rangeEnd?: string) => void;
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
  discardPendingChanges: () => void;

  // Optimistic shift manipulation
  applyShift: (params: {
    groupId: string;
    userId: string;
    date: string;
    presetId: string | null;
    customHours?: number | null;
    note?: string | null;
  }) => void;
  removeShift: (groupId: string, userId: string, date: string, presetId?: string | null) => void;

  // Sync with Neon database
  syncWithNeon: (groupId: string) => Promise<boolean>;
}

let activeSyncPromise: Promise<boolean> | null = null;
let latestSyncRequestId = 0;

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

      setShifts: (shiftsList, rangeStart, rangeEnd) => {
        set((state) => {
          let shiftMap: Record<string, DbShift>;
          if (rangeStart && rangeEnd) {
            shiftMap = { ...state.shifts };
            for (const [key, s] of Object.entries(shiftMap)) {
              if (s.date >= rangeStart && s.date <= rangeEnd) {
                delete shiftMap[key];
              }
            }
          } else if (shiftsList.length === 0) {
            shiftMap = {};
          } else {
            shiftMap = { ...state.shifts };
          }

          for (const shift of shiftsList) {
            const dateStr = typeof shift.date === 'string' 
              ? shift.date.split('T')[0] 
              : new Date(shift.date).toISOString().split('T')[0];
            
            const key = getShiftMapKey(shift.user_id, dateStr, shift.shift_preset_id);
            shiftMap[key] = {
              ...shift,
              date: dateStr,
            };
          }
          return { shifts: shiftMap };
        });
      },

      setCurrentMonth: (date) => {
        const safe = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(date);
        set({ currentMonth: isNaN(safe.getTime()) ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : safe });
      },

      nextMonth: () => {
        const raw = get().currentMonth;
        const current = raw instanceof Date && !isNaN(raw.getTime()) ? raw : new Date();
        const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        set({ currentMonth: next });
      },

      prevMonth: () => {
        const raw = get().currentMonth;
        const current = raw instanceof Date && !isNaN(raw.getTime()) ? raw : new Date();
        const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        set({ currentMonth: prev });
      },

      setSyncStatus: (status) => set({ syncStatus: status }),

      setEditMode: (enabled) => {
        const presets = get().presets;
        set({
          isEditMode: enabled,
          rangeStart: null,
          rangeEnd: null,
          selectedPresetId: enabled ? (get().selectedPresetId || presets[0]?.id || null) : null,
        });
      },

      setEditingUserId: (userId) => set({ editingUserId: userId }),
      setEditSubMode: (mode) => set({ editSubMode: mode, rangeStart: null, rangeEnd: null }),
      setSelectedPresetId: (presetId) => set({ selectedPresetId: presetId }),
      setRangeStart: (date) => set({ rangeStart: date }),
      setRangeEnd: (date) => set({ rangeEnd: date }),
      clearRangeSelection: () => set({ rangeStart: null, rangeEnd: null }),
      discardPendingChanges: () => set({ pendingChanges: {}, syncStatus: 'synced' }),

      applyShift: ({ groupId, userId, date, presetId, customHours, note }) => {
        const key = getShiftMapKey(userId, date, presetId);
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

      removeShift: (groupId, userId, date, presetId) => {
        set((state) => {
          const nextShifts = { ...state.shifts };
          const nextPending = { ...state.pendingChanges };

          if (presetId !== undefined) {
            const key = getShiftMapKey(userId, date, presetId);
            const existing = nextShifts[key];
            delete nextShifts[key];

            const dummyShift: DbShift = existing || {
              id: `del_${Date.now()}`,
              group_id: groupId,
              user_id: userId,
              date,
              shift_preset_id: presetId,
              custom_hours: null,
              note: null,
              updated_at: new Date().toISOString(),
            };
            nextPending[key] = {
              action: 'delete',
              shift: dummyShift,
              timestamp: Date.now(),
            };
          } else {
            const prefix = `${userId}_${date}`;
            for (const [k, shift] of Object.entries(state.shifts)) {
              if (k.startsWith(prefix) || (shift && shift.user_id === userId && shift.date === date)) {
                delete nextShifts[k];
                nextPending[k] = {
                  action: 'delete',
                  shift,
                  timestamp: Date.now(),
                };
              }
            }
          }

          return {
            shifts: nextShifts,
            pendingChanges: nextPending,
            syncStatus: 'pending',
          };
        });
      },

      syncWithNeon: async (groupId: string): Promise<boolean> => {
        const currentRequestId = ++latestSyncRequestId;

        // If another sync is actively running, wait for it to finish to prevent Neon connection thrashing
        if (activeSyncPromise) {
          try {
            await activeSyncPromise;
          } catch {
            // Ignore previous errors
          }
        }

        // If a newer sync request was initiated while waiting, yield to that request
        if (currentRequestId !== latestSyncRequestId) {
          return true;
        }

        const runSync = async (): Promise<boolean> => {
          const { pendingChanges } = get();
          set({ syncStatus: 'syncing' });

          try {
            // 1. Flush pending local changes to Neon
            const pendingList = Object.values(pendingChanges);
            const upserts = pendingList
              .filter((p) => p.action === 'upsert')
              .map((p) => p.shift);
            const deletes: ShiftDeleteTarget[] = pendingList
              .filter((p) => p.action === 'delete')
              .map((p) => ({
                groupId: p.shift.group_id,
                userId: p.shift.user_id,
                date: typeof p.shift.date === 'string' ? p.shift.date.split('T')[0] : p.shift.date,
                presetId: p.shift.shift_preset_id,
              }));

            if (upserts.length > 0 || deletes.length > 0) {
              logger.info('SYNC', `Odesílám lokální změny: ${upserts.length} uložení, ${deletes.length} smazání.`);
            }

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

            // If a newer request was queued while flushing, yield without overwriting month data
            if (currentRequestId !== latestSyncRequestId) {
              return true;
            }

            // 2. Fetch fresh shifts for CURRENT visible month (always read fresh from get())
            const rawM = get().currentMonth;
            const safeM = rawM instanceof Date && !isNaN(rawM.getTime()) ? rawM : new Date();
            const year = safeM.getFullYear();
            const month = safeM.getMonth(); // 0-indexed
            const startDate = formatLocalDate(year, month - 1, 20);
            const endDate = formatLocalDate(year, month + 2, 10);

            const remoteShifts = await fetchGroupShiftsRange(groupId, startDate, endDate);

            // Guard against stale responses: only update if this is still the latest request
            if (currentRequestId !== latestSyncRequestId) {
              return true;
            }

            get().setShifts(remoteShifts, startDate, endDate);

            const now = new Date().toISOString();
            set({
              syncStatus: 'synced',
              lastSyncedAt: now,
            });
            logger.success('SYNC', `Synchronizováno ${remoteShifts.length} směn s Neon DB.`);
            return true;
          } catch (error) {
            // If superseded by a newer month request, do NOT mark as offline!
            if (currentRequestId !== latestSyncRequestId) {
              return false;
            }
            logger.warn('SYNC', 'Synchronizace selhala (offline režim)', error);
            set({ syncStatus: 'offline' });
            return false;
          } finally {
            if (activeSyncPromise === currentExecution) {
              activeSyncPromise = null;
            }
          }
        };

        const currentExecution = runSync();
        activeSyncPromise = currentExecution;
        return currentExecution;
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
