/**
 * userStore — 当前用户信息与设置
 * 持久化到 MMKV（key: user）
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import type { User } from '@/types';

interface UserState {
  user: User | null;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  setHydrated: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => {
        set({ user });
        if (user) setJSON(StorageKeys.user, user);
      },
      updateUser: (patch) => {
        const cur = get().user;
        if (!cur) return;
        const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
        set({ user: next });
        setJSON(StorageKeys.user, next);
      },
      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.user',
      storage: createJSONStorage(() => ({
        getItem: (k) => storage.getString(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
        removeItem: (k) => storage.delete(k),
      })),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/** 便捷选择器 */
export const selectUser = () => useUserStore((s) => s.user);