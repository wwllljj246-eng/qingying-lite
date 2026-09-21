/**
 * AI 助手数据快照（Task 9）
 *
 * 从 5 个真实 Store（weight / diet / exercise / bodyStatus / cycle）
 * 聚合出 AssistantSnapshot，供 AIAssistantScreen 与 HomeScreen 的
 * AI 建议卡片共用，保证两处建议基于同一份真实数据。
 *
 * 所有字段均做边界守卫：无数据时为 null / 0 / []，不会崩溃。
 */

import { useMemo } from 'react';
import { useWeightStore } from '@/stores/weightStore';
import { useDietStore } from '@/stores/dietStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { useCycleStore } from '@/stores/cycleStore';
import { todayISO, parseISODate, addDays, toISODate } from '@/utils/date';
import {
  type AssistantSnapshot,
  exerciseTypeLabel,
} from '@/services/aiAssistantService';

export function useAssistantSnapshot(): AssistantSnapshot {
  const weightRecords = useWeightStore((s) => s.records);
  const mealRecords = useDietStore((s) => s.records);
  const exerciseRecords = useExerciseStore((s) => s.records);
  const statusRecords = useBodyStatusStore((s) => s.records);
  const cycleEnabled = useCycleStore((s) => s.enabled);
  const cycleRecords = useCycleStore((s) => s.records);

  return useMemo(() => {
    const today = todayISO();

    // —— 体重 ——
    const weights = [...weightRecords].sort((a, b) =>
      a.recordedAt.localeCompare(b.recordedAt),
    );
    const todayWeights = weights.filter(
      (w) => w.recordedAt.slice(0, 10) === today,
    );
    const weightToday =
      todayWeights.length > 0
        ? todayWeights[todayWeights.length - 1].weight
        : null;
    const recentWeights = weights.slice(-5).map((w) => w.weight);
    const weightLatest = weights.length
      ? weights[weights.length - 1].weight
      : null;

    // —— 饮食（今天）——
    const mealsToday = mealRecords.filter(
      (m) => m.date === today && m.items && m.items.length > 0,
    );
    let kcalToday = 0;
    let proteinToday = 0;
    const typeSet = new Set<string>();
    for (const m of mealsToday) {
      for (const it of m.items) {
        kcalToday += it.calories || 0;
        proteinToday += it.protein || 0;
      }
      typeSet.add(m.mealType);
    }

    // —— 运动（今天 + 最近 7 天）——
    const exToday = exerciseRecords.filter((e) => e.date === today);
    const start7 = toISODate(addDays(parseISODate(today), -6));
    const exWeek = exerciseRecords.filter(
      (e) => e.date >= start7 && e.date <= today,
    );
    const exLabels = [...new Set(exToday.map((e) => exerciseTypeLabel(e.type)))];

    // —— 身体状态（今天 + 最近 7 天）——
    const statusToday = statusRecords.find((r) => r.date === today) ?? null;
    const statusWeek = statusRecords.filter(
      (r) => r.date >= start7 && r.date <= today,
    );
    const sleeps = statusWeek
      .map((r) => r.sleepHours)
      .filter((x): x is number => x != null);
    const avgSleep7d = sleeps.length
      ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length
      : null;

    return {
      today,
      weightToday,
      weightLatest,
      recentWeights,
      mealCountToday: mealsToday.length,
      recordedMealTypes: [...typeSet] as AssistantSnapshot['recordedMealTypes'],
      kcalToday,
      proteinToday,
      exerciseTodayCount: exToday.length,
      exerciseTodayMinutes: exToday.reduce((a, e) => a + (e.duration || 0), 0),
      exerciseTodayLabels: exLabels,
      exerciseWeekCount: exWeek.length,
      statusToday,
      statusWeekCount: statusWeek.length,
      avgSleep7d,
      cycleEnabled,
      cycleRecords,
    };
  }, [weightRecords, mealRecords, exerciseRecords, statusRecords, cycleEnabled, cycleRecords]);
}
