import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import { genId } from '@/utils/format';
import type { CycleRecord } from '@/types';

interface CycleState {
  records: CycleRecord[];
  enabled: boolean;
  hasHydrated: boolean;

  setEnabled: (enabled: boolean) => void;
  startPeriod: (date: string, note?: CycleRecord['symptoms']) => CycleRecord;
  endPeriod: (id: string, endDate: string) => void;
  addSymptom: (id: string, symptom: string) => void;
  remove: (id: string) => void;

  latestPeriod: () => CycleRecord | null;
  predictNext: () => { startDate: string; cycleLength: number } | null;

  setHydrated: () => void;
}

export const useCycleStore = create<CycleState>()(
  persist(
    (set, get) => ({
      records: [],
      enabled: false,
      hasHydrated: false,

      setEnabled: (enabled) => {
        set({ enabled });
        setJSON(StorageKeys.cycleRecords, { enabled, records: get().records });
      },
      startPeriod: (date, symptoms) => {
        const rec: CycleRecord = {
          id: genId('c'),
          startDate: date,
          symptoms,
        };
        const next = [...get().records, rec];
        const enabled = true;
        set({ records: next, enabled });
        setJSON(StorageKeys.cycleRecords, { enabled, records: next });
        return rec;
      },
      endPeriod: (id, endDate) => {
        const next = get().records.map((r) => {
          if (r.id !== id) return r;
          const start = new Date(r.startDate);
          const end = new Date(endDate);
          const periodLength = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
          return { ...r, endDate, periodLength };
        });
        set({ records: next });
        setJSON(StorageKeys.cycleRecords, { enabled: get().enabled, records: next });
      },
      addSymptom: (id, symptom) => {
        const next = get().records.map((r) =>
          r.id === id
            ? { ...r, symptoms: Array.from(new Set([...(r.symptoms ?? []), symptom])) }
            : r,
        );
        set({ records: next });
        setJSON(StorageKeys.cycleRecords, { enabled: get().enabled, records: next });
      },
      remove: (id) => {
        const next = get().records.filter((r) => r.id !== id);
        set({ records: next });
        setJSON(StorageKeys.cycleRecords, { enabled: get().enabled, records: next });
      },

      latestPeriod: () => {
        const arr = [...get().records].sort((a, b) => b.startDate.localeCompare(a.startDate));
        return arr[0] ?? null;
      },
      predictNext: () => {
        const completed = get().records.filter((r) => r.endDate);
        if (completed.length < 2) return null;
        const sorted = [...completed].sort((a, b) => b.startDate.localeCompare(a.startDate));
        const cycles: number[] = [];
        for (let i = 0; i < sorted.length - 1; i++) {
          const diff = (new Date(sorted[i].startDate).getTime() -
            new Date(sorted[i + 1].startDate).getTime()) / 86400000;
          cycles.push(diff);
        }
        const avg = cycles.reduce((a, b) => a + b, 0) / cycles.length;
        const next = new Date(sorted[0].startDate);
        next.setDate(next.getDate() + Math.round(avg));
        return { startDate: next.toISOString().slice(0, 10), cycleLength: Math.round(avg) };
      },

      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.cycle',
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