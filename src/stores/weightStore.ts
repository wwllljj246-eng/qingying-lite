import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import { todayISO, toISODateTime } from '@/utils/date';
import { genId } from '@/utils/format';
import type { WeightRecord } from '@/types';

interface WeightState {
  records: WeightRecord[];
  hasHydrated: boolean;

  add: (record: Omit<WeightRecord, 'id' | 'recordedAt'> & { recordedAt?: string }) => WeightRecord;
  update: (id: string, patch: Partial<WeightRecord>) => void;
  remove: (id: string) => void;

  todayWeight: () => WeightRecord | null;
  latest: () => WeightRecord | null;

  setHydrated: () => void;
}

export const useWeightStore = create<WeightState>()(
  persist(
    (set, get) => ({
      records: [],
      hasHydrated: false,

      add: (r) => {
        const rec: WeightRecord = {
          ...r,
          id: genId('w'),
          recordedAt: r.recordedAt ?? toISODateTime(new Date()),
        };
        const next = [...get().records, rec];
        set({ records: next });
        setJSON(StorageKeys.weightRecords, next);
        return rec;
      },
      update: (id, patch) => {
        const next = get().records.map((r) => (r.id === id ? { ...r, ...patch } : r));
        set({ records: next });
        setJSON(StorageKeys.weightRecords, next);
      },
      remove: (id) => {
        const next = get().records.filter((r) => r.id !== id);
        set({ records: next });
        setJSON(StorageKeys.weightRecords, next);
      },

      todayWeight: () => {
        const today = todayISO();
        const todays = get().records.filter((r) => r.recordedAt.startsWith(today));
        return todays.length > 0 ? todays[todays.length - 1] : null;
      },
      latest: () => {
        const arr = get().records;
        if (arr.length === 0) return null;
        return [...arr].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
      },

      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.weight',
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