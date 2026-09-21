/**
 * AI 服务公共类型
 *
 * 重要：所有 AI 相关调用都走 service 层，禁止在页面/Store 中直接调用 API。
 * 这样后期从 Mock 实现切换到真实 API（经后端中转）时，只需替换 service 实现。
 */

import type { FoodItem, MealType } from '@/types';

/** 食物识别请求 */
export interface FoodRecognitionRequest {
  imageUri: string; // 本地图片 URI（base64 或 file://）
  mealType: MealType;
  hint?: string; // 用户文字描述（可选）
}

/** 食物识别结果 */
export interface FoodRecognitionResult {
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  confidence: number; // 整体置信度 0~1
  rawText?: string; // AI 原始说明（用于展示）
  detectedAt: string;
}

/** 营养分析请求 */
export interface NutritionAnalysisRequest {
  date: string; // YYYY-MM-DD
  items: FoodItem[];
}

/** 营养分析结果 */
export interface NutritionAnalysisResult {
  radar: Array<{
    key: 'protein' | 'carbs' | 'fat' | 'fiber' | 'vitamin' | 'water';
    label: string;
    value: number; // 当前摄入百分比 0~100
    target: number; // 推荐量
    unit: string;
  }>;
  summary: string; // AI 文案总结
  suggestions: string[]; // 改善建议
  generatedAt: string;
}

/** AI 助手对话请求 */
export interface AssistantRequest {
  message: string;
  context?: Record<string, unknown>; // 携带用户近期数据
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/** AI 助手对话响应（流式 chunk） */
export interface AssistantChunk {
  delta: string; // 增量内容
  done: boolean;
}