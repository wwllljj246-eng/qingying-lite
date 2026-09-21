/**
 * 食物识别 Service（真实视觉 AI + OCR + 本地规则回退）
 *
 * 数据流：
 *   Screen → 本 Service → 后端 /api/food/* → 视觉模型（OCR 辅助）
 *   失败 / 无 Key / mockAI 开启 → 回退到本地 Mock 数据库（保证 App 始终可用）
 *
 * 严禁在客户端代码中放 API Key；密钥只存在于后端环境变量。
 */

import type { FoodRecognitionRequest, FoodRecognitionResult } from './types';
import { getJSON, setJSON, StorageKeys } from '../storage';
import { genId } from '@/utils/format';
import type { FoodItem, MealType } from '@/types';
import {
  recognizeFood as foodApiRecognize,
  recognizeOcr,
  type FoodRecognizeResponse,
  type FoodOcrResponse,
} from '@/services/api/foodApi';

/* ----------------------------- Mock 数据库（本地规则 / 回退） ----------------------------- */

const MOCK_LATENCY_MS = 1200;

/** Mock 失败概率（演示「识别失败 → 重新拍摄」错误态；接入真实 AI 后保留为回退） */
const MOCK_FAIL_RATE = 0.1;

export class FoodRecognitionError extends Error {
  constructor(message = '这张照片暂时没能识别清楚') {
    super(message);
    this.name = 'FoodRecognitionError';
  }
}

const MOCK_DATABASE: Record<string, FoodRecognitionResult> = {
  default: {
    items: [
      { id: 'f_rice', name: '米饭', portion: 150, unit: 'g', calories: 210, protein: 4, carbs: 46, fat: 0.5, source: 'ai', confidence: 0.95 },
      { id: 'f_beef', name: '牛肉', portion: 120, unit: 'g', calories: 250, protein: 28, carbs: 0, fat: 15, source: 'ai', confidence: 0.9 },
      { id: 'f_broccoli', name: '西兰花', portion: 100, unit: 'g', calories: 35, protein: 3, carbs: 7, fat: 0.4, source: 'ai', confidence: 0.92 },
      { id: 'f_egg', name: '鸡蛋', portion: 1, unit: '个', calories: 75, protein: 6, carbs: 0.6, fat: 5, source: 'ai', confidence: 0.88 },
    ],
    totalCalories: 570,
    totalProtein: 41,
    totalCarbs: 53.6,
    totalFat: 20.9,
    confidence: 0.91,
    rawText: '识别到 4 种食物：米饭、牛肉、西兰花、鸡蛋。',
    detectedAt: new Date().toISOString(),
  },
  breakfast: {
    items: [
      { id: 'f_toast', name: '全麦吐司', portion: 60, unit: 'g', calories: 156, protein: 6, carbs: 28, fat: 2, source: 'ai', confidence: 0.93 },
      { id: 'f_egg2', name: '煎蛋', portion: 1, unit: '个', calories: 92, protein: 6.4, carbs: 0.4, fat: 7.3, source: 'ai', confidence: 0.95 },
      { id: 'f_milk', name: '牛奶', portion: 200, unit: 'ml', calories:108, protein: 6, carbs: 10, fat: 5, source: 'ai', confidence: 0.94 },
    ],
    totalCalories: 356,
    totalProtein: 18.4,
    totalCarbs: 38.4,
    totalFat: 14.3,
    confidence: 0.94,
    rawText: '识别到 3 种食物：全麦吐司、煎蛋、牛奶。',
    detectedAt: new Date().toISOString(),
  },
  snack: {
    items: [
      { id: 'f_apple', name: '苹果', portion: 1, unit: '个', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, source: 'ai', confidence: 0.96 },
      { id: 'f_yogurt', name: '无糖酸奶', portion: 120, unit: 'g', calories: 90, protein: 7, carbs: 9, fat: 3, source: 'ai', confidence: 0.9 },
    ],
    totalCalories: 185,
    totalProtein: 7.5,
    totalCarbs: 34,
    totalFat: 3.3,
    confidence: 0.93,
    rawText: '识别到 2 种食物：苹果、无糖酸奶。',
    detectedAt: new Date().toISOString(),
  },
  dinner: {
    items: [
      { id: 'f_noodle', name: '番茄鸡蛋面', portion: 280, unit: 'g', calories: 380, protein: 14, carbs: 60, fat: 8, source: 'ai', confidence: 0.89 },
      { id: 'f_green', name: '凉拌菠菜', portion: 80, unit: 'g', calories: 32, protein: 2.4, carbs: 4, fat: 0.4, source: 'ai', confidence: 0.86 },
    ],
    totalCalories: 412,
    totalProtein: 16.4,
    totalCarbs: 64,
    totalFat: 8.4,
    confidence: 0.88,
    rawText: '识别到 2 种食物：番茄鸡蛋面、凉拌菠菜。',
    detectedAt: new Date().toISOString(),
  },
};

/** 本地营养参考（用于把「视觉识别出的食物名称 + 份量」换算成营养，优先于 AI 估算） */
const FOOD_REF: FoodItem[] = [];
for (const key of Object.keys(MOCK_DATABASE)) {
  for (const it of MOCK_DATABASE[key].items) FOOD_REF.push(it);
}

/** 累加一组食物的营养 totals */
export function sumFoodNutrition(items: FoodItem[]): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
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

/**
 * 本地营养查询（local nutrition constants 优先）。
 * 当视觉模型没有返回营养，或 OCR 没有提供营养标签时，用本地参考换算。
 */
export function lookupLocalNutrition(
  name: string,
  amount: number,
  unit: string,
): { calories: number; protein: number; carbs: number; fat: number } {
  const match = FOOD_REF.find((r) => name.includes(r.name) || r.name.includes(name));
  if (!match) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  // 仅在单位一致时按份量缩放；否则按「一份」估算（并标注为估算值）
  const scale = unit && unit === match.unit ? amount / match.portion : 1;
  return {
    calories: Math.max(1, Math.round(match.calories * scale)),
    protein: +(match.protein * scale).toFixed(1),
    carbs: +(match.carbs * scale).toFixed(1),
    fat: +(match.fat * scale).toFixed(1),
  };
}

/* ----------------------------- Mock 实现 ----------------------------- */

export async function recognizeFoodMock(
  req: FoodRecognitionRequest,
): Promise<FoodRecognitionResult> {
  await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));

  if (Math.random() < MOCK_FAIL_RATE) {
    throw new FoodRecognitionError();
  }

  const template = MOCK_DATABASE[req.mealType] ?? MOCK_DATABASE.default;
  const result: FoodRecognitionResult = {
    ...template,
    items: template.items.map((it) => ({ ...it, id: genId('food') })),
    detectedAt: new Date().toISOString(),
  };

  setLastRecognition(result);
  return result;
}

/* ----------------------------- 真实识别（经后端） ----------------------------- */

/** 把后端返回的结构化结果映射成本地 FoodItem，并用本地营养常量补齐营养 */
function buildResult(data: FoodRecognizeResponse): FoodRecognitionResult {
  const items: FoodItem[] = data.foods.map((f) => {
    const local = lookupLocalNutrition(f.name, f.estimatedAmount, f.unit);
    const calories = f.calories != null ? f.calories : local.calories;
    const protein = f.protein != null ? f.protein : local.protein;
    const carbs = f.carbs != null ? f.carbs : local.carbs;
    const fat = f.fat != null ? f.fat : local.fat;
    return {
      id: genId('food'),
      name: f.name,
      portion: f.estimatedAmount,
      unit: f.unit,
      calories: Math.max(0, Math.round(calories)),
      protein: +(protein ?? 0).toFixed(1),
      carbs: +(carbs ?? 0).toFixed(1),
      fat: +(fat ?? 0).toFixed(1),
      source: 'ai',
      confidence: f.confidence,
    };
  });

  // OCR 明确营养优先：覆盖到名称最匹配的食物
  if (data.productName && data.nutrition) {
    const name = data.productName;
    const target = items.find((it) => it.name.includes(name) || name.includes(it.name));
    if (target) {
      const nu = data.nutrition;
      if (nu.calories != null) target.calories = Math.max(0, Math.round(nu.calories));
      if (nu.protein != null) target.protein = +nu.protein.toFixed(1);
      if (nu.carbs != null) target.carbs = +nu.carbs.toFixed(1);
      if (nu.fat != null) target.fat = +nu.fat.toFixed(1);
    }
  }

  const totals = sumFoodNutrition(items);
  const avgConf =
    items.length > 0
      ? items.reduce((s, it) => s + (it.confidence ?? 0.5), 0) / items.length
      : 0.5;

  return {
    items,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    confidence: avgConf,
    rawText: data.text || '',
    detectedAt: new Date().toISOString(),
  };
}

/**
 * 真实拍照 / 图片识别入口（统一给 Screen 调用）。
 * - demo:// / mock:// 走本地 Mock
 * - 否则请求后端视觉识别，失败抛错（由 Screen 决定回退 / 提示）
 */
export async function recognizeFoodFromImage(
  imageUri: string,
  mealType: MealType,
): Promise<FoodRecognitionResult> {
  if (!imageUri || imageUri.startsWith('mock://') || imageUri.startsWith('demo://')) {
    return recognizeFoodMock({ imageUri, mealType });
  }
  const data = await foodApiRecognize({ uri: imageUri });
  const result = buildResult(data);
  setLastRecognition(result);
  return result;
}

/** Web / 上传场景：直接传文件（File / Blob） */
export async function recognizeFoodFromFile(
  file: unknown,
  mealType: MealType,
): Promise<FoodRecognitionResult> {
  const data = await foodApiRecognize({ file });
  const result = buildResult(data);
  setLastRecognition(result);
  return result;
}

/** 单独 OCR 入口（辅助：包装食品标签 / 营养成分表 / 菜单） */
export async function recognizeFoodText(imageUri: string): Promise<FoodOcrResponse> {
  return recognizeOcr({ uri: imageUri });
}

/** 取最近一次的识别结果（用于页面恢复） */
export function getLastRecognition(): FoodRecognitionResult | null {
  return getJSON<FoodRecognitionResult>(StorageKeys.aiMessages + ':lastRecognition');
}

/** 缓存最近一次识别结果 */
export function setLastRecognition(result: FoodRecognitionResult): void {
  setJSON(StorageKeys.aiMessages + ':lastRecognition', result);
}
