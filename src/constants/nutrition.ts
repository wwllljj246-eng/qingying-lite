/**
 * 营养目标常量
 * 当前为演示用的固定目标值，后续可按用户资料（身高/体重/活动量）动态计算
 */
export const NUTRITION_TARGETS = {
  calories: 1600, // kcal / 天
  protein: 100, // g / 天
  carbs: 180, // g / 天
  fat: 55, // g / 天
} as const;

export type NutrientKey = 'protein' | 'carbs' | 'fat';

/** 三大营养素展示配置（标签 / 语义色） */
export const MACRO_META: Array<{
  key: NutrientKey;
  label: string;
  colorKey: 'diet' | 'reward' | 'primary';
}> = [
  { key: 'protein', label: '蛋白质', colorKey: 'diet' },
  { key: 'carbs', label: '碳水', colorKey: 'reward' },
  { key: 'fat', label: '脂肪', colorKey: 'primary' },
];

/** 按当前时间推荐默认餐次（用于快捷入口） */
export function suggestMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 17) return 'snack';
  return 'dinner';
}
