/**
 * 营养分析 Service（Mock）
 *
 * 真实路径：App → Backend /api/ai/nutrition → LLM
 */

import type { NutritionAnalysisRequest, NutritionAnalysisResult } from './types';

const MOCK_LATENCY_MS = 1200;

/**
 * 按推荐摄入标准（中国成年女性轻活动量，约 1800 kcal/天）
 */
const TARGETS = {
  protein: { target: 55, unit: 'g' },
  carbs: { target: 240, unit: 'g' },
  fat: { target: 60, unit: 'g' },
  fiber: { target: 25, unit: 'g' },
  vitamin: { target: 100, unit: '%RDA' },
  water: { target: 1500, unit: 'ml' },
};

export async function analyzeNutritionMock(
  req: NutritionAnalysisRequest,
): Promise<NutritionAnalysisResult> {
  await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));

  const totals = req.items.reduce(
    (acc, it) => ({
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
      fiber: acc.fiber + (it as any).fiber ?? 0,
      water: 0,
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 },
  );

  const pct = (n: number, t: number) => Math.min(100, Math.round((n / t) * 100));

  const radar = [
    {
      key: 'protein' as const,
      label: '蛋白质',
      value: pct(totals.protein, TARGETS.protein.target),
      target: TARGETS.protein.target,
      unit: TARGETS.protein.unit,
    },
    {
      key: 'carbs' as const,
      label: '碳水',
      value: pct(totals.carbs, TARGETS.carbs.target),
      target: TARGETS.carbs.target,
      unit: TARGETS.carbs.unit,
    },
    {
      key: 'fat' as const,
      label: '脂肪',
      value: pct(totals.fat, TARGETS.fat.target),
      target: TARGETS.fat.target,
      unit: TARGETS.fat.unit,
    },
    {
      key: 'fiber' as const,
      label: '膳食纤维',
      value: pct(totals.fiber, TARGETS.fiber.target),
      target: TARGETS.fiber.target,
      unit: TARGETS.fiber.unit,
    },
    {
      key: 'vitamin' as const,
      label: '维生素',
      value: 65,
      target: TARGETS.vitamin.target,
      unit: TARGETS.vitamin.unit,
    },
    {
      key: 'water' as const,
      label: '水分',
      value: 50,
      target: TARGETS.water.target,
      unit: TARGETS.water.unit,
    },
  ];

  const suggestions: string[] = [];
  if (totals.protein < TARGETS.protein.target * 0.6) {
    suggestions.push('蛋白质摄入偏低，下一餐可加一份蛋、豆制品或鱼。');
  }
  if (totals.carbs > TARGETS.carbs.target) {
    suggestions.push('碳水略高，建议晚餐主食减半并增加蔬菜。');
  }
  if (totals.fat > TARGETS.fat.target * 0.9) {
    suggestions.push('脂肪接近上限，避免油炸食品。');
  }
  if (suggestions.length === 0) {
    suggestions.push('今天的饮食结构很均衡，继续保持 ✨');
    suggestions.push('记得喝够 1500ml 水哦～');
  }

  return {
    radar,
    summary: `今日累计摄入约 ${Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fat * 9)} kcal，整体结构${
      suggestions.length === 1 ? '良好' : '可优化'
    }。`,
    suggestions,
    generatedAt: new Date().toISOString(),
  };
}

export async function analyzeNutrition(
  req: NutritionAnalysisRequest,
): Promise<NutritionAnalysisResult> {
  return analyzeNutritionMock(req);
}