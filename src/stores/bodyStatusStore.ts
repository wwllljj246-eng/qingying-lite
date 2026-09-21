import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import { todayISO } from '@/utils/date';
import { genId } from '@/utils/format';
import type { BodyStatusRecord } from '@/types';

interface BodyStatusState {
  records: BodyStatusRecord[];
  hasHydrated: boolean;

  setForDate: (input: Partial<BodyStatusRecord> & { date?: string }) => BodyStatusRecord;
  update: (id: string, patch: Partial<BodyStatusRecord>) => void;
  remove: (id: string) => void;

  todayStatus: () => BodyStatusRecord | null;

  setHydrated: () => void;
}

export const useBodyStatusStore = create<BodyStatusState>()(
  persist(
    (set, get) => ({
      records: [],
      hasHydrated: false,

      setForDate: (input) => {
        const date = input.date ?? todayISO();
        const existing = get().records.find((r) => r.date === date);
        if (existing) {
          const next: BodyStatusRecord = { ...existing, ...input, id: existing.id, date };
          const records = get().records.map((r) => (r.id === existing.id ? next : r));
          set({ records });
          setJSON(StorageKeys.bodyStatusRecords, records);
          return next;
        }
        const created: BodyStatusRecord = {
          id: genId('b'),
          date,
          sleepHours: input.sleepHours,
          sleepQuality: input.sleepQuality,
          mood: input.mood,
          energy: input.energy,
          waterIntake: input.waterIntake,
          symptoms: input.symptoms,
          note: input.note,
          fatigue: input.fatigue,
          muscleSoreness: input.muscleSoreness,
          appetite: input.appetite,
          discomfort: input.discomfort,
          periodFlow: input.periodFlow,
        };
        const next = [...get().records, created];
        set({ records: next });
        setJSON(StorageKeys.bodyStatusRecords, next);
        return created;
      },
      update: (id, patch) => {
        const next = get().records.map((r) => (r.id === id ? { ...r, ...patch } : r));
        set({ records: next });
        setJSON(StorageKeys.bodyStatusRecords, next);
      },
      remove: (id) => {
        const next = get().records.filter((r) => r.id !== id);
        set({ records: next });
        setJSON(StorageKeys.bodyStatusRecords, next);
      },

      todayStatus: () => {
        const today = todayISO();
        return get().records.find((r) => r.date === today) ?? null;
      },

      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.bodystatus',
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