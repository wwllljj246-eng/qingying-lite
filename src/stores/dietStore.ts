import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, setJSON, StorageKeys } from '@/services/storage';
import { todayISO, toISODateTime } from '@/utils/date';
import { genId } from '@/utils/format';
import type { MealRecord, MealType, FoodItem } from '@/types';

interface DietState {
  records: MealRecord[];
  hasHydrated: boolean;

  addMeal: (input: {
    date?: string;
    mealType: MealType;
    items: FoodItem[];
    imageUri?: string;
    aiRecognized?: boolean;
    source?: 'search' | 'camera';
  }) => MealRecord;
  updateMeal: (id: string, patch: Partial<MealRecord>) => void;
  removeMeal: (id: string) => void;

  mealsByDate: (date: string) => MealRecord[];
  mealsByDateAndType: (date: string, mealType: MealType) => MealRecord[];

  setHydrated: () => void;
}

export const useDietStore = create<DietState>()(
  persist(
    (set, get) => ({
      records: [],
      hasHydrated: false,

      addMeal: ({ date, mealType, items, imageUri, aiRecognized, source }) => {
        const rec: MealRecord = {
          id: genId('m'),
          date: date ?? todayISO(),
          mealType,
          items,
          imageUri,
          aiRecognized: aiRecognized ?? false,
          source,
          createdAt: toISODateTime(new Date()),
          updatedAt: toISODateTime(new Date()),
        };
        const next = [...get().records, rec];
        set({ records: next });
        setJSON(StorageKeys.dietRecords, next);
        return rec;
      },
      updateMeal: (id, patch) => {
        const next = get().records.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: toISODateTime(new Date()) } : r,
        );
        set({ records: next });
        setJSON(StorageKeys.dietRecords, next);
      },
      removeMeal: (id) => {
        const next = get().records.filter((r) => r.id !== id);
        set({ records: next });
        setJSON(StorageKeys.dietRecords, next);
      },

      mealsByDate: (date) => get().records.filter((r) => r.date === date),
      mealsByDateAndType: (date, mealType) =>
        get().records.filter((r) => r.date === date && r.mealType === mealType),

      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'litelite.diet',
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