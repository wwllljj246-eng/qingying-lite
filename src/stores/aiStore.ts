import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import { genId } from '@/utils/format';
import { toISODateTime } from '@/utils/date';
import type { AIMessage } from '@/types';

interface AIState {
  messages: AIMessage[];
  hasHydrated: boolean;
  appendMessage: (role: AIMessage['role'], content: string, context?: Record<string, unknown>) => AIMessage;
  clear: () => void;
  setHydrated: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      messages: [],
      hasHydrated: false,
      appendMessage: (role, content, context) => {
        const msg: AIMessage = {
          id: genId('ai'),
          role,
          content,
          context,
          createdAt: toISODateTime(new Date()),
        };
        const next = [...get().messages, msg];
        set({ messages: next });
        setJSON(StorageKeys.aiMessages, next);
        return msg;
      },
      clear: () => {
        set({ messages: [] });
        setJSON(StorageKeys.aiMessages, []);
      },
      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.ai',
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