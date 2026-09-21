import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import { todayISO, toISODateTime } from '@/utils/date';
import { genId } from '@/utils/format';
import type { ExerciseRecord, ExerciseType, ExerciseIntensity } from '@/types';

interface ExerciseState {
  records: ExerciseRecord[];
  hasHydrated: boolean;

  addExercise: (input: {
    type: ExerciseType;
    duration: number;
    intensity: ExerciseIntensity;
    caloriesBurned: number;
    distance?: number;
    date?: string;
  }) => ExerciseRecord;
  updateExercise: (id: string, patch: Partial<ExerciseRecord>) => void;
  removeExercise: (id: string) => void;

  todayExercises: () => ExerciseRecord[];
  weekExercises: () => ExerciseRecord[];

  setHydrated: () => void;
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      records: [],
      hasHydrated: false,

      addExercise: ({ type, duration, intensity, caloriesBurned, distance, date }) => {
        const rec: ExerciseRecord = {
          id: genId('e'),
          type,
          duration,
          intensity,
          caloriesBurned,
          distance,
          date: date ?? todayISO(),
          createdAt: toISODateTime(new Date()),
        };
        const next = [...get().records, rec];
        set({ records: next });
        setJSON(StorageKeys.exerciseRecords, next);
        return rec;
      },
      updateExercise: (id, patch) => {
        const next = get().records.map((r) => (r.id === id ? { ...r, ...patch } : r));
        set({ records: next });
        setJSON(StorageKeys.exerciseRecords, next);
      },
      removeExercise: (id) => {
        const next = get().records.filter((r) => r.id !== id);
        set({ records: next });
        setJSON(StorageKeys.exerciseRecords, next);
      },

      todayExercises: () => {
        const today = todayISO();
        return get().records.filter((r) => r.date === today);
      },
      weekExercises: () => {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return get().records.filter((r) => new Date(r.date) >= weekAgo);
      },

      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.exercise',
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