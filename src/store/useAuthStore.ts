import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DbUser, DbGroup } from '../services/db/neonClient';

export interface AuthState {
  currentUser: DbUser | null;
  currentGroup: DbGroup | null;
  groupMembers: DbUser[];
  isLoading: boolean;

  // Actions
  setCurrentUser: (user: DbUser | null) => void;
  setCurrentGroup: (group: DbGroup | null) => void;
  setGroupMembers: (members: DbUser[]) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      currentGroup: null,
      groupMembers: [],
      isLoading: false,

      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentGroup: (group) => set({ currentGroup: group }),
      setGroupMembers: (members) => set({ groupMembers: members }),
      setIsLoading: (loading) => set({ isLoading: loading }),
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
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentGroup: state.currentGroup,
        groupMembers: state.groupMembers,
      }),
    }
  )
);
