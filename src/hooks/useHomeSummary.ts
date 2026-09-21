import { useMemo } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useWeightStore } from '@/stores/weightStore';
import { useDietStore } from '@/stores/dietStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { useCycleStore } from '@/stores/cycleStore';
import { todayISO, diffDays } from '@/utils/date';
import { NUTRITION_TARGETS } from '@/constants';
import { getCyclePhaseInfo, type CyclePhase } from '@/services/advice';
import type { BodyStatusRecord } from '@/types';

export interface HomeSummary {
  nickname: string | null;
  hasUser: boolean;

  /** 最新体重（kg）；无记录时为 null，禁止使用虚假占位值 */
  weight: number | null;
  /** 用户目标体重（kg）；未设置个人信息时为 null */
  goalWeight: number | null;
  /** 与上一条体重记录的真实变化（kg）；不足 2 条记录时为 null */
  change: number | null;
  hasWeight: boolean;
  /** 最近体重序列（最多 7 条）；无记录时为空数组 */
  last7: number[];

  calories: number;
  calTarget: number;
  protein: number;
  carbs: number;
  fat: number;
  hasDiet: boolean;

  exMinutes: number;
  hasExercise: boolean;

  /** 今日身体状态（无记录时为 null） */
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  hasBody: boolean;

  cycleEnabled: boolean;
  /** 是否存在周期记录（enabled 但无记录时用于引导完善） */
  hasCycleRecords: boolean;
  periodDay: number | null;
  nextPeriodInDays: number | null;

  /** 当前周期阶段（经期 / 经后 / 排卵 / 经前），未开启或无数据时为 null */
  phase: CyclePhase | null;
  /** 今天的身体状态记录（用于首页联动展示），可能为 null */
  todayStatus: BodyStatusRecord | null;
}

/**
 * 首页数据汇总
 * 全部来自各 Store 的真实记录；无数据时返回 null / 0 / 空数组，由 UI 层展示空状态。
 */
export function useHomeSummary(): HomeSummary {
  const user = useUserStore((s) => s.user);
  const weights = useWeightStore((s) => s.records);
  const meals = useDietStore((s) => s.records);
  const exercises = useExerciseStore((s) => s.records);
  const statuses = useBodyStatusStore((s) => s.records);
  const cycleEnabled = useCycleStore((s) => s.enabled);
  const cycleRecords = useCycleStore((s) => s.records);

  return useMemo(() => {
    const today = todayISO();

    // 体重：真实记录，无数据即 null
    const sortedWeights = [...weights].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const hasWeight = sortedWeights.length > 0;
    const latestWeight = hasWeight ? sortedWeights[sortedWeights.length - 1].weight : null;
    const prevWeight = sortedWeights.length >= 2 ? sortedWeights[sortedWeights.length - 2].weight : null;
    const change =
      latestWeight != null && prevWeight != null ? +(latestWeight - prevWeight).toFixed(2) : null;
    const last7 = sortedWeights.slice(-7).map((w) => w.weight);

    // 饮食：真实累加今日记录
    const todayMeals = meals.filter((m) => m.date === today);
    const hasDiet = todayMeals.length > 0;
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    for (const meal of todayMeals) {
      for (const it of meal.items) {
        calories += it.calories;
        protein += it.protein;
        carbs += it.carbs;
        fat += it.fat;
      }
    }

    // 运动：真实累加今日记录
    const todayEx = exercises.filter((e) => e.date === today);
    const hasExercise = todayEx.length > 0;
    const exMinutes = todayEx.reduce((acc, e) => acc + e.duration, 0);

    // 身体状态：仅取今日真实记录
    const todayStatus = statuses.find((s) => s.date === today) ?? null;
    const hasBody = todayStatus !== null;

    // 周期阶段（只读计算，不修改既有周期逻辑）
    const cyclePhaseInfo = getCyclePhaseInfo(cycleRecords, today);

    // 周期
    let periodDay: number | null = null;
    let nextPeriodInDays: number | null = null;
    if (cycleEnabled && cycleRecords.length > 0) {
      const latest = [...cycleRecords].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
      const start = latest.startDate;
      const end = latest.endDate;
      const isOngoing = !end || today <= end;
      if (isOngoing) {
        periodDay = diffDays(today, start) + 1;
      } else {
        // 预测逻辑：取最近两期平均周期
        const completed = cycleRecords.filter((r) => r.endDate).sort((a, b) => b.startDate.localeCompare(a.startDate));
        if (completed.length >= 2) {
          const avg = completed.slice(0, 2).reduce((acc, r, i, arr) => {
            if (i === 0) return acc;
            return acc + diffDays(r.startDate, arr[i - 1].startDate);
          }, 0) / (completed.length - 1);
          nextPeriodInDays = Math.max(0, Math.round(avg - diffDays(today, start)));
        }
      }
    }

    return {
      nickname: user?.name ?? null,
      hasUser: !!user,

      weight: latestWeight,
      goalWeight: user?.goalWeight ?? null,
      change,
      hasWeight,
      last7,

      calories: Math.round(calories),
      calTarget: NUTRITION_TARGETS.calories,
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      hasDiet,

      exMinutes,
      hasExercise,

      mood: todayStatus?.mood ?? null,
      energy: todayStatus?.energy ?? null,
      sleepHours: todayStatus?.sleepHours ?? null,
      hasBody,

      cycleEnabled,
      hasCycleRecords: cycleRecords.length > 0,
      periodDay,
      nextPeriodInDays,

      phase: cyclePhaseInfo.phase,
      todayStatus,
    };
  }, [user, weights, meals, exercises, statuses, cycleEnabled, cycleRecords]);
}
