/**
 * AI 接口契约类型（前端 ↔ 后端 / 服务层共用）
 *
 * 所有 AI 调用都走 service 层（src/services/api/aiApi.ts），
 * 严禁在页面或 Store 中直接发起请求 / 持有密钥。
 *
 * 设计约束：
 * - 不使用 any；字段尽量精确。
 * - 只传输完成分析所需的最小数据；周期数据仅在 enabled 时下发。
 */

import type { CycleRecord } from './models';

/* ===================== AI 个性化助手 ===================== */

/** 建议类别（与后端枚举保持一致） */
export type AssistantSuggestionType =
  | 'diet'
  | 'exercise'
  | 'body'
  | 'general'
  | 'cycle'
  | 'weight';

export interface AssistantSuggestion {
  type: AssistantSuggestionType;
  title: string;
  content: string;
}

export interface AssistantWeightContext {
  /** 今日体重（kg），无则 null */
  today: number | null;
  /** 最新一次体重（kg），无则 null */
  latest: number | null;
  /** 最近若干次体重（旧 → 新），用于趋势判断 */
  trend: number[];
}

export interface AssistantDietContext {
  mealCountToday: number;
  kcalToday: number;
  proteinToday: number;
  recordedMealTypes: string[];
}

export interface AssistantExerciseContext {
  todayCount: number;
  todayMinutes: number;
  weekCount: number;
  todayLabels: string[];
}

export interface AssistantBodyContext {
  today: {
    energy?: number | null;
    sleepHours?: number | null;
    mood?: number | null;
    fatigue?: string | null;
    appetite?: string | null;
  } | null;
  weekCount: number;
  avgSleep7d: number | null;
}

export interface AssistantCycleContext {
  enabled: boolean;
  /** 当前周期阶段（字符串），无则 null */
  phase: string | null;
  records: CycleRecord[];
}

/** 发送给 AI 的上下文（仅包含分析所需信息，昵称不发送） */
export interface AssistantUserContext {
  weight?: AssistantWeightContext;
  diet?: AssistantDietContext;
  exercise?: AssistantExerciseContext;
  bodyStatus?: AssistantBodyContext;
  cycle?: AssistantCycleContext;
}

export interface AssistantRequest {
  userContext: AssistantUserContext;
  question: string;
}

export interface AssistantResponse {
  summary: string;
  suggestions: AssistantSuggestion[];
}

/* ===================== AI 饮食 / 营养分析 ===================== */

export interface NutritionAIItem {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface NutritionAIRequest {
  foods: NutritionAIItem[];
  mealType: string;
}

export interface NutritionAIResponse {
  summary: string;
  suggestions: string[];
}
