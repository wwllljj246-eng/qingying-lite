import type { MealType } from '@/types';

export const MEAL_TYPE_LIST: Array<{
  key: MealType;
  label: string;
  emoji: string;
  defaultHour: number;
}> = [
  { key: 'breakfast', label: '早餐', emoji: '🌅', defaultHour: 8 },
  { key: 'lunch', label: '午餐', emoji: '☀️', defaultHour: 12 },
  { key: 'dinner', label: '晚餐', emoji: '🌙', defaultHour: 18 },
  { key: 'snack', label: '加餐', emoji: '🍪', defaultHour: 15 },
];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};