/**
 * AI 饮食 / 营养分析编排层（真实 API + 本地规则 fallback）
 *
 * 页面只调用 getNutritionAnalysis；不直接 fetch。
 * 真实调用：POST /api/ai/nutrition（后端中转，密钥仅后端持有）。
 * 失败时回退到本地基于真实营养数据的规则文案（不虚构精确数字）。
 *
 * 注意：NutritionAnalysisScreen 的 Mock 拍照识别流程保持不变，
 * 本服务只负责「识别结果出来之后」的 AI 文字分析增强。
 */

import type { FoodItem, MealType } from '@/types';
import type { NutritionAIRequest } from '@/types/ai';
import { AIServiceError, requestNutritionAnalysis } from '@/services/api/aiApi';

export type NutritionSource = 'ai' | 'local';

export interface NutritionAnalysisResult {
  summary: string;
  suggestions: string[];
  source: NutritionSource;
}

/** 将识别出的食物映射为发送给后端的请求体（只含营养相关字段） */
export function buildNutritionRequest(
  items: FoodItem[],
  mealType: MealType,
): NutritionAIRequest {
  return {
    mealType,
    foods: items.map((it) => ({
      name: it.name,
      amount: it.portion,
      unit: it.unit ?? 'g',
      calories: it.calories,
      protein: it.protein,
      carbs: it.carbs,
      fat: it.fat,
    })),
  };
}

/**
 * 获取 AI 营养分析（真实 API，失败回退本地规则）。
 * @param signal 外部取消信号
 */
export async function getNutritionAnalysis(
  items: FoodItem[],
  mealType: MealType,
  remainingKcal: number,
  signal?: AbortSignal,
): Promise<NutritionAnalysisResult> {
  try {
    const res = await requestNutritionAnalysis(
      buildNutritionRequest(items, mealType),
      { signal },
    );
    if (typeof res.summary !== 'string' || !Array.isArray(res.suggestions)) {
      throw new AIServiceError('PARSE', 'AI 返回格式异常');
    }
    return {
      summary: res.summary,
      suggestions: res.suggestions.filter((s) => typeof s === 'string'),
      source: 'ai',
    };
  } catch (e) {
    if (e instanceof AIServiceError && e.kind === 'CANCELLED') throw e;
    return {
      summary: buildLocalSummary(items, remainingKcal),
      suggestions: [],
      source: 'local',
    };
  }
}

/* ---------------- 本地回退（基于真实营养数据，不虚构数字） ---------------- */

/** 由食物列表累加营养 totals */
function sumTotals(items: FoodItem[]) {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function buildLocalSummary(items: FoodItem[], remaining: number): string {
  if (items.length === 0) return '还没有食物，返回添加一些吧。';
  const totals = sumTotals(items);
  const lines: string[] = [];
  const calFromProtein = totals.protein * 4;
  const calFromCarbs = totals.carbs * 4;
  const calFromFat = totals.fat * 9;
  const sum = Math.max(1, calFromProtein + calFromCarbs + calFromFat);

  const proteinPct = Math.round((calFromProtein / sum) * 100);
  const carbsPct = Math.round((calFromCarbs / sum) * 100);
  const fatPct = Math.round((calFromFat / sum) * 100);
  const hasVeg = items.some((it) => /菜|菠菜|西兰花|青菜|生菜|番茄|黄瓜/.test(it.name));

  if (proteinPct >= 20) lines.push('这餐蛋白质来源充足');
  else lines.push('这餐可以再补充一些优质蛋白');

  lines.push(hasVeg ? '蔬菜比例不错' : '适当增加一些蔬菜会更均衡');
  if (carbsPct > 55) lines.push('主食比例偏高，可以适当减少主食份量');
  else lines.push('主食比例适中');
  if (fatPct > 35) lines.push('脂肪比例略高，下次可以选更清淡的烹饪方式');
  else lines.push('整体脂肪比例在温和区间');

  return [
    `${lines[0]}，${lines[1]}。`,
    `${lines[2]}，${lines[3]}，`,
    `可以根据你的今日剩余热量（约 ${Math.round(remaining)} kcal）调整主食份量。`,
  ].join('');
}
