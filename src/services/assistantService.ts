/**
 * AI 助手编排层（真实 API + 本地规则 fallback）
 *
 * 页面只调用本文件的 getAssistantAdvice / getQuickAnswer；
 * 不直接 fetch，也不直接写 API 逻辑。这样未来更换模型只需改 aiApi / 后端。
 *
 * 数据流：Screen → assistantService → aiApi（真实后端）→ LLM
 *                                        ↘ 失败时回退 aiAssistantService（本地规则）
 *
 * 安全：发送给 AI 的上下文仅含分析所需数据；周期数据仅在 cycleEnabled 时下发。
 */

import type { AssistantSnapshot } from '@/services/aiAssistantService';
import type {
  AssistantSuggestion,
  AssistantSuggestionType,
  AssistantUserContext,
} from '@/types/ai';
import { AIServiceError, requestAssistant } from '@/services/api/aiApi';
import {
  generateDailyAdvice,
  generateDietAdvice,
  generateExerciseAdvice,
  generateBodyAdvice,
  generateCycleAdvice,
  answerQuickQuestion,
  getSnapshotPhase,
} from '@/services/aiAssistantService';

export type AdviceSource = 'ai' | 'local';

export interface AssistantResult {
  summary: string;
  suggestions: AssistantSuggestion[];
  source: AdviceSource;
}

export interface QuickAnswer {
  text: string;
  source: AdviceSource;
}

const VALID_TYPES = new Set<AssistantSuggestionType>([
  'diet',
  'exercise',
  'body',
  'general',
  'cycle',
  'weight',
]);

function normalizeType(t: unknown): AssistantSuggestionType {
  return typeof t === 'string' && VALID_TYPES.has(t as AssistantSuggestionType)
    ? (t as AssistantSuggestionType)
    : 'general';
}

/* ---------------- 构造发送给 AI 的上下文（最小必要数据） ---------------- */

export function buildAssistantContext(s: AssistantSnapshot): AssistantUserContext {
  const ctx: AssistantUserContext = {};

  if (s.weightToday != null || s.weightLatest != null || s.recentWeights.length) {
    ctx.weight = {
      today: s.weightToday,
      latest: s.weightLatest,
      trend: s.recentWeights,
    };
  }

  if (s.mealCountToday > 0 || s.kcalToday > 0) {
    ctx.diet = {
      mealCountToday: s.mealCountToday,
      kcalToday: s.kcalToday,
      proteinToday: s.proteinToday,
      recordedMealTypes: s.recordedMealTypes,
    };
  }

  if (s.exerciseTodayCount > 0 || s.exerciseWeekCount > 0) {
    ctx.exercise = {
      todayCount: s.exerciseTodayCount,
      todayMinutes: s.exerciseTodayMinutes,
      weekCount: s.exerciseWeekCount,
      todayLabels: s.exerciseTodayLabels,
    };
  }

  if (s.statusToday || s.statusWeekCount > 0) {
    const r = s.statusToday;
    ctx.bodyStatus = {
      today: r
        ? {
            energy: r.energy ?? null,
            sleepHours: r.sleepHours ?? null,
            mood: r.mood ?? null,
            fatigue: r.fatigue ?? null,
            appetite: r.appetite ?? null,
          }
        : null,
      weekCount: s.statusWeekCount,
      avgSleep7d: s.avgSleep7d,
    };
  }

  // ⚠️ 周期数据仅在用户开启周期管理后才允许作为 AI 上下文
  if (s.cycleEnabled) {
    ctx.cycle = {
      enabled: true,
      phase: getSnapshotPhase(s),
      records: s.cycleRecords,
    };
  }

  return ctx;
}

/* ---------------- 本地规则回退 ---------------- */

function localAssistantAdvice(
  s: AssistantSnapshot,
  question?: string,
): AssistantResult {
  if (question && question.trim()) {
    return {
      summary: '',
      suggestions: [
        {
          type: 'general',
          title: question.trim().slice(0, 24),
          content: answerQuickQuestion(question, s),
        },
      ],
      source: 'local',
    };
  }

  const daily = generateDailyAdvice(s);
  const suggestions: AssistantSuggestion[] = [
    { type: 'diet', title: '饮食建议', content: generateDietAdvice(s).content },
    { type: 'exercise', title: '运动建议', content: generateExerciseAdvice(s).content },
    { type: 'body', title: '身体状态建议', content: generateBodyAdvice(s).content },
  ];
  const cycle = generateCycleAdvice(s);
  if (cycle) suggestions.push({ type: 'cycle', title: cycle.title, content: cycle.content });

  return { summary: daily.content, suggestions, source: 'local' };
}

/* ---------------- 对外 API ---------------- */

/**
 * 获取 AI 今日综合建议（真实 API，失败回退本地规则）。
 * @param signal 外部取消信号（页面离开时取消无效请求）
 */
export async function getAssistantAdvice(
  snapshot: AssistantSnapshot,
  question?: string,
  signal?: AbortSignal,
): Promise<AssistantResult> {
  try {
    const res = await requestAssistant(
      { userContext: buildAssistantContext(snapshot), question: question ?? '' },
      { signal },
    );
    if (typeof res.summary !== 'string' || !Array.isArray(res.suggestions)) {
      throw new AIServiceError('PARSE', 'AI 返回格式异常');
    }
    const suggestions = res.suggestions
      .filter((item) => item && typeof item.content === 'string')
      .map((item) => ({
        type: normalizeType(item.type),
        title: typeof item.title === 'string' ? item.title : '建议',
        content: item.content,
      }));
    return { summary: res.summary, suggestions, source: 'ai' };
  } catch (e) {
    if (e instanceof AIServiceError && e.kind === 'CANCELLED') throw e;
    return localAssistantAdvice(snapshot, question);
  }
}

/**
 * 快速提问 / 自由输入（真实 API，失败回退本地规则）。
 */
export async function getQuickAnswer(
  snapshot: AssistantSnapshot,
  question: string,
  signal?: AbortSignal,
): Promise<QuickAnswer> {
  try {
    const res = await requestAssistant(
      { userContext: buildAssistantContext(snapshot), question },
      { signal },
    );
    if (typeof res.summary !== 'string' || !Array.isArray(res.suggestions)) {
      throw new AIServiceError('PARSE', 'AI 返回格式异常');
    }
    const lines = [
      res.summary,
      ...res.suggestions
        .filter((item) => item && typeof item.content === 'string')
        .map((item) => `${item.title}：${item.content}`),
    ];
    return { text: lines.join('\n'), source: 'ai' };
  } catch (e) {
    if (e instanceof AIServiceError && e.kind === 'CANCELLED') throw e;
    return { text: answerQuickQuestion(question, snapshot), source: 'local' };
  }
}
