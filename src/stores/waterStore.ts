import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import { todayISO, toISODateTime } from '@/utils/date';
import { genId } from '@/utils/format';
import type { WaterRecord } from '@/types';

interface WaterState {
  records: WaterRecord[];
  hasHydrated: boolean;

  addWater: (amount: number, date?: string) => WaterRecord;
  removeWater: (id: string) => void;

  todayTotal: () => number;

  setHydrated: () => void;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set, get) => ({
      records: [],
      hasHydrated: false,

      addWater: (amount, date) => {
        const rec: WaterRecord = {
          id: genId('h'),
          amount,
          date: date ?? todayISO(),
          createdAt: toISODateTime(new Date()),
        };
        const next = [...get().records, rec];
        set({ records: next });
        setJSON(StorageKeys.waterRecords, next);
        return rec;
      },
      removeWater: (id) => {
        const next = get().records.filter((r) => r.id !== id);
        set({ records: next });
        setJSON(StorageKeys.waterRecords, next);
      },

      todayTotal: () => {
        const today = todayISO();
        return get()
          .records.filter((r) => r.date === today)
          .reduce((acc, r) => acc + r.amount, 0);
      },

      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.water',
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