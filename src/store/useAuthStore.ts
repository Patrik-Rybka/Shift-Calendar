import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DbUser, DbGroup } from '../services/db/neonClient';

export interface AuthState {
  currentUser: DbUser | null;
  currentGroup: DbGroup | null;
  groupMembers: DbUser[];
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  setCurrentUser: (user: DbUser | null) => void;
  setCurrentGroup: (group: DbGroup | null) => void;
  setGroupMembers: (members: DbUser[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsHydrated: (hydrated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      currentGroup: null,
      groupMembers: [],
      isLoading: false,
      isHydrated: false,

      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentGroup: (group) => set({ currentGroup: group }),
      setGroupMembers: (members) => set({ groupMembers: members }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsHydrated: (hydrated) => set({ isHydrated: hydrated }),
      logout: () =>
        set({
          currentUser: null,
          currentGroup: null,
          groupMembers: [],
          isLoading: false,
        }),
    }),
    {
      name: 'family-shift-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('AuthStore hydration error:', error);
        }
        state?.setIsHydrated(true);
      },
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentGroup: state.currentGroup,
        groupMembers: state.groupMembers,
      }),
    }
  )
);

// Immediate sync check in case AsyncStorage rehydrated synchronously or earlier
if (typeof useAuthStore?.persist?.hasHydrated === 'function' && useAuthStore.persist.hasHydrated()) {
  useAuthStore.setState({ isHydrated: true });
}
