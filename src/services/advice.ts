/**
 * 周期 × 身体状态 联动建议（Phase 3）
 *
 * 纯函数模块：不修改任何 Store，只读取传入的数据并生成
 * 「周期阶段」「今日身体状态摘要」「今日建议」等文案。
 *
 * 设计约束：
 * - 不使用绝对化 / 医疗诊断式语言
 * - 用词偏向「可能 / 可以考虑 / 根据今天的状态 / 如果你感觉…」
 * - 不伪造数据，仅在确有记录时给出统计与建议
 */

import { diffDays, toISODate, addDays, parseISODate } from '@/utils/date';
import type { BodyStatusRecord, CycleRecord, Level3, Rating } from '@/types';

/* ---------------- 文案常量（与 BodyStatusScreen 保持一致） ---------------- */

export const ENERGY_LABEL = ['很低', '一般', '不错', '很好', '充沛'];
export const MOOD_LABEL = ['差', '一般', '还行', '不错', '超好'];
export const FATIGUE_LABEL: Record<Level3, string> = { low: '低', medium: '中', high: '高' };
export const SORENESS_LABEL: Record<'none' | 'mild' | 'obvious', string> = {
  none: '无',
  mild: '轻微',
  obvious: '明显',
};

/* ---------------- 周期阶段 ---------------- */

export type CyclePhase = 'period' | 'post' | 'ovulation' | 'pre';

export const PHASE_LABEL: Record<CyclePhase, string> = {
  period: '经期',
  post: '经后阶段',
  ovulation: '排卵期附近',
  pre: '经前阶段',
};

export interface CyclePhaseInfo {
  phase: CyclePhase | null;
  periodDay: number | null;
  nextInDays: number | null;
}

/**
 * 根据已有周期记录判断当前阶段（只读，不修改 Store 算法）。
 * - 经期：最近一期仍在进行中（无结束日期，或今天未超过结束日期）
 * - 经后阶段：经期结束后 7 天内，或暂时无法预测下次经期时
 * - 排卵期附近：预计下次经期前约 14 天（±2 天）
 * - 经前阶段：预计下次经期前 5 天内
 */
export function getCyclePhaseInfo(
  records: CycleRecord[],
  today: string,
): CyclePhaseInfo {
  if (!records.length) return { phase: null, periodDay: null, nextInDays: null };

  const sorted = [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const latest = sorted[0];

  // 进行中的经期
  if (!latest.endDate || today <= latest.endDate) {
    const periodDay = diffDays(today, latest.startDate) + 1;
    if (periodDay >= 1) return { phase: 'period', periodDay, nextInDays: null };
  }

  // 经期已结束：计算距结束天数 + 预测下次经期
  const end = latest.endDate ?? latest.startDate;
  const daysSinceEnd = diffDays(today, end);

  // 用最近两期平均间隔预测下次开始日（与 cycleStore 逻辑一致，仅用于展示）
  let nextStart: string | null = null;
  const completed = sorted.filter((r) => r.endDate);
  if (completed.length >= 2) {
    let total = 0;
    let n = 0;
    for (let i = 0; i < completed.length - 1; i++) {
      total += diffDays(completed[i].startDate, completed[i + 1].startDate);
      n++;
    }
    const avg = Math.round(total / n);
    const ns = parseISODate(latest.startDate);
    ns.setDate(ns.getDate() + avg);
    nextStart = toISODate(ns);
  }

  if (daysSinceEnd <= 7) {
    return { phase: 'post', periodDay: null, nextInDays: nextStart ? diffDays(nextStart, today) : null };
  }

  if (nextStart) {
    const d = diffDays(nextStart, today);
    if (d <= 5) return { phase: 'pre', periodDay: null, nextInDays: d };
    if (d >= 10 && d <= 16) return { phase: 'ovulation', periodDay: null, nextInDays: d };
    return { phase: 'post', periodDay: null, nextInDays: d };
  }

  return { phase: 'post', periodDay: null, nextInDays: null };
}

/* ---------------- 身体状态文本 ---------------- */

export function energyText(r?: BodyStatusRecord | null): string | null {
  return r?.energy ? ENERGY_LABEL[r.energy - 1] : null;
}
export function moodText(r?: BodyStatusRecord | null): string | null {
  return r?.mood ? MOOD_LABEL[r.mood - 1] : null;
}
export function sleepText(r?: BodyStatusRecord | null): string | null {
  return r?.sleepHours != null ? `${r.sleepHours}h` : null;
}

/* ---------------- 首页建议 ---------------- */

export function getHomeAdvice(phase: CyclePhase | null, r?: BodyStatusRecord | null): string {
  if (!r) return '记录今天的身体状态后，可以获得更贴合自己的建议。';

  const bits: string[] = [];
  if (r.energy && r.energy <= 2) bits.push('今天精力偏低');
  else if (r.energy && r.energy >= 4) bits.push('今天状态不错');
  else bits.push('今天状态平稳');

  if (r.fatigue === 'high') bits.push('疲劳感比较明显');
  else if (r.fatigue === 'medium') bits.push('有些疲劳');

  const state = bits.join('，') + '。';

  let suggest: string;
  if (phase === 'period') suggest = '经期里可以根据体感安排轻量活动，优先照顾休息。';
  else if (phase === 'pre') suggest = '经前这段时间多留意身体变化，别有太大压力。';
  else if (phase === 'ovulation') suggest = '这段时间状态通常比较舒展，可以按计划动一动。';
  else suggest = '保持规律作息，按自己的节奏来就好。';

  return `${state} ${suggest}`;
}

/* ---------------- 运动建议 ---------------- */

export function getExerciseAdvice(phase: CyclePhase | null, r?: BodyStatusRecord | null): string {
  if (!r) return '记录今天的身体状态后，运动建议会更贴合你。';

  if (r.discomfort === 'obvious') {
    return '如果今天身体不适比较明显，可以优先休息，运动以舒缓活动为主。';
  }
  if (r.fatigue === 'high' || r.muscleSoreness === 'obvious') {
    return '今天身体有点累，更适合轻量运动或拉伸，别逞强 🌿';
  }
  if (r.energy && r.energy <= 2) {
    return '今天精力偏低，可以考虑强度低一些的运动，或安排休息。';
  }

  let base = '状态不错，今天可以尝试 30 分钟左右的轻到中等强度运动。';
  if (phase === 'period') base = '经期里可以根据体感安排轻量运动，不必勉强。';
  else if (phase === 'pre') base = '经前可以优先舒缓活动，给身体留点缓冲。';
  return base;
}

/* ---------------- 饮食建议 ---------------- */

export function getDietAdvice(
  phase: CyclePhase | null,
  r?: BodyStatusRecord | null,
  hasDiet = false,
): string {
  const bits: string[] = [];
  if (phase === 'period') bits.push('经期里可以优先温和、好消化的食物');
  else bits.push('今天可以优先保证蛋白质、蔬菜和充足饮水');

  if (r?.appetite === 'low') bits.push('如果食欲偏低，少量多餐更轻松');
  else if (r?.appetite === 'strong') bits.push('如果食欲较强，选饱腹又轻盈的食物就好');

  if (!hasDiet) bits.push('记录今天的饮食后，建议会更具体');

  return bits.join('，') + '。';
}

/* ---------------- 周期页：近期身体状态统计 ---------------- */

export interface CycleBodySummary {
  count: number;
  avgEnergy?: number;
  avgSleep?: number;
  avgMood?: number;
  fatigue?: Level3;
  /** 心情趋势方向（相对区间均值），用于“心情变化”文案 */
  moodTrend?: 'up' | 'down' | 'flat';
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function modeLevel(arr: Level3[]): Level3 {
  const counts: Record<string, number> = {};
  let best: Level3 = arr[0];
  let max = 0;
  for (const x of arr) {
    counts[x] = (counts[x] ?? 0) + 1;
    if (counts[x] > max) {
      max = counts[x];
      best = x;
    }
  }
  return best;
}

/** 取最近 windowDays 天（含今天）的身体状态记录做统计 */
export function getCycleBodySummary(
  records: BodyStatusRecord[],
  today: string,
  windowDays = 7,
): CycleBodySummary {
  const start = addDays(parseISODate(today), -(windowDays - 1));
  const end = parseISODate(today);
  const arr = records.filter((r) => {
    const d = parseISODate(r.date);
    return d >= start && d <= end;
  });
  const count = arr.length;
  if (count === 0) return { count: 0 };

  const energies = arr.map((r) => r.energy).filter((x): x is Rating => typeof x === 'number');
  const sleeps = arr.map((r) => r.sleepHours).filter((x): x is number => typeof x === 'number');
  const moods = arr.map((r) => r.mood).filter((x): x is Rating => typeof x === 'number');
  const fatigues = arr.map((r) => r.fatigue).filter((x): x is Level3 => !!x);

  const avgMood = moods.length ? mean(moods) : undefined;
  let moodTrend: CycleBodySummary['moodTrend'];
  if (moods.length >= 3) {
    const firstHalf = mean(moods.slice(0, Math.floor(moods.length / 2)));
    const secondHalf = mean(moods.slice(Math.floor(moods.length / 2)));
    if (secondHalf - firstHalf >= 0.5) moodTrend = 'up';
    else if (firstHalf - secondHalf >= 0.5) moodTrend = 'down';
    else moodTrend = 'flat';
  }

  return {
    count,
    avgEnergy: energies.length ? mean(energies) : undefined,
    avgSleep: sleeps.length ? mean(sleeps) : undefined,
    avgMood,
    fatigue: fatigues.length ? modeLevel(fatigues) : undefined,
    moodTrend,
  };
}

/* ---------------- 数据分析页：本阶段小结 ---------------- */

export interface DashboardSummaryInput {
  windowDays: number;
  dietDays: number;
  exerciseCount: number;
  exerciseMinutes: number;
  hasWeight: boolean;
  /** 筛选窗口内的体重变化（最新 - 最早），kg */
  weightChange: number;
  bodyDays: number;
}

/**
 * 根据真实聚合数据生成规则型「本阶段小结」。
 * 约束：不做医疗诊断、不做绝对化结论、不伪造数据。
 * 无记录时引导用户继续记录。
 */
export function getDashboardSummary(i: DashboardSummaryInput): string {
  const recordedAny =
    i.dietDays > 0 || i.exerciseCount > 0 || i.hasWeight || i.bodyDays > 0;
  if (!recordedAny) {
    return '继续记录几天，我们会帮你发现更多变化。';
  }

  const parts: string[] = [];
  if (i.dietDays > 0) parts.push(`最近 ${i.windowDays} 天记录了 ${i.dietDays} 天饮食`);
  if (i.exerciseCount > 0)
    parts.push(`完成了 ${i.exerciseCount} 次运动（累计约 ${i.exerciseMinutes} 分钟）`);
  if (i.hasWeight) {
    if (i.weightChange <= -0.1) parts.push('体重整体略有下降');
    else if (i.weightChange >= 0.1) parts.push('体重整体略有上升');
    else parts.push('体重整体保持稳定');
  }
  if (i.bodyDays > 0) parts.push(`记录了 ${i.bodyDays} 天身体状态`);

  let text = parts.join('，') + '。';

  if (i.exerciseCount === 0) {
    text += ' 运动记录还比较少，如果愿意，可以从轻量活动开始慢慢增加 🌿';
  } else if (i.exerciseCount <= 2 && i.windowDays >= 30) {
    text += ' 运动频率还有提升空间，保持规律会更有帮助。';
  } else if (i.dietDays > 0 && i.dietDays < i.windowDays * 0.4) {
    text += ' 饮食记录还可以更完整一些，记录越全越能看出规律。';
  }

  return text;
}
