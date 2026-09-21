/**
 * foodDraftStore — AI 饮食识别「草稿」
 *
 * 承载 AIFoodRecognition → FoodRecognitionResult → NutritionAnalysis 三页之间
 * 的待确认食物数据（未保存前不属于正式饮食记录）。
 * 刻意不做持久化：确认保存时才写入 dietStore。
 */

import { create } from 'zustand';
import type { FoodItem, MealType } from '@/types';
import { genId } from '@/utils/format';
import { sumFoodNutrition } from '@/services/ai/foodRecognition';

export interface FoodDraft {
  mealType: MealType;
  items: FoodItem[];
  imageUri?: string;
  confidence: number; // AI 整体置信度 0~1
  /** 入口来源：搜索 / 拍照；手动添加不设置 */
  source?: 'search' | 'camera';
  createdAt: string;
}

interface FoodDraftState {
  draft: FoodDraft | null;

  /** 识别完成后初始化草稿 */
  initDraft: (input: {
    mealType: MealType;
    items: FoodItem[];
    imageUri?: string;
    confidence: number;
    source?: 'search' | 'camera';
  }) => void;

  /** 修改某个食物（名称 / 份量等，营养按份量比例重算） */
  updateItem: (itemId: string, patch: Partial<FoodItem>) => void;

  /** 修改份量并按比例重算热量与三大营养素 */
  updatePortion: (itemId: string, newPortion: number) => void;

  /** 删除某个食物 */
  removeItem: (itemId: string) => void;

  /** 手动添加一个食物 */
  addItem: (item: Omit<FoodItem, 'id'>) => void;

  /** 修改餐次 */
  setMealType: (mealType: MealType) => void;

  /** 保存成功后清空草稿 */
  clearDraft: () => void;
}

export const useFoodDraftStore = create<FoodDraftState>((set) => ({
  draft: null,

  initDraft: ({ mealType, items, imageUri, confidence, source }) =>
    set({
      draft: {
        mealType,
        items,
        imageUri,
        confidence,
        source,
        createdAt: new Date().toISOString(),
      },
    }),

  updateItem: (itemId, patch) =>
    set((s) => {
      if (!s.draft) return s;
      return {
        draft: {
          ...s.draft,
          items: s.draft.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        },
      };
    }),

  updatePortion: (itemId, newPortion) =>
    set((s) => {
      if (!s.draft) return s;
      return {
        draft: {
          ...s.draft,
          items: s.draft.items.map((it) => {
            if (it.id !== itemId) return it;
            if (it.portion <= 0 || newPortion <= 0) return it;
            const r = newPortion / it.portion;
            return {
              ...it,
              portion: newPortion,
              calories: Math.max(1, Math.round(it.calories * r)),
              protein: +(it.protein * r).toFixed(1),
              carbs: +(it.carbs * r).toFixed(1),
              fat: +(it.fat * r).toFixed(1),
            };
          }),
        },
      };
    }),

  removeItem: (itemId) =>
    set((s) => {
      if (!s.draft) return s;
      return {
        draft: { ...s.draft, items: s.draft.items.filter((it) => it.id !== itemId) },
      };
    }),

  addItem: (item) =>
    set((s) => {
      if (!s.draft) return s;
      return {
        draft: {
          ...s.draft,
          items: [...s.draft.items, { ...item, id: genId('food') }],
        },
      };
    }),

  setMealType: (mealType) =>
    set((s) => (s.draft ? { draft: { ...s.draft, mealType } } : s)),

  clearDraft: () => set({ draft: null }),
}));

/** 便捷选择器：草稿 totals（热量 / 三大营养素） */
export function draftTotals(draft: FoodDraft | null) {
  return sumFoodNutrition(draft?.items ?? []);
}

export default useFoodDraftStore;
