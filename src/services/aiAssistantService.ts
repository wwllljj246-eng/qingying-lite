/**
 * AI 助手建议 Service（Task 8）
 *
 * 第一版：规则式本地生成，不接真实 AI API、不上传用户数据、无 API Key。
 *
 * 预留真实路径：
 *   App → POST /api/ai/assistant（后端中转）→ LLM
 * 后期只需将各 generate* 的实现替换为 requestAssistantAPI()，
 * 页面与数据快照结构不变。
 *
 * 约束（与 advice.ts 一致）：
 * - 不做医疗诊断 / 绝对化健康结论
 * - 不伪造数据：所有「依据」均来自调用方传入的真实 Store 快照
 * - 输入可能是 null / undefined / [] / 0，全部安全守卫
 */

import type { BodyStatusRecord, MealType } from '@/types';
import {
  ENERGY_LABEL,
  MOOD_LABEL,
  PHASE_LABEL,
  getCyclePhaseInfo,
  type CyclePhase,
} from '@/services/advice';
import type { CycleRecord } from '@/types';

/* ---------------- 数据快照（由页面从真实 Store 聚合） ---------------- */

export interface AssistantSnapshot {
  today: string;

  // —— 体重 ——
  /** 今天是否已有体重记录 */
  weightToday: number | null;
  /** 最新一次体重（任意日期） */
  weightLatest: number | null;
  /** 最近若干条体重（旧 → 新），用于趋势判断 */
  recentWeights: number[];

  // —— 饮食（今天） ——
  mealCountToday: number;
  recordedMealTypes: MealType[];
  kcalToday: number;
  proteinToday: number;

  // —— 运动 ——
  exerciseTodayCount: number;
  exerciseTodayMinutes: number;
  /** 今日运动的中文类型标签（去重） */
  exerciseTodayLabels: string[];
  /** 最近 7 天运动次数 */
  exerciseWeekCount: number;

  // —— 身体状态 ——
  statusToday: BodyStatusRecord | null;
  /** 最近 7 天身体状态记录天数 */
  statusWeekCount: number;
  /** 最近 7 天平均睡眠（h），可能为 null */
  avgSleep7d: number | null;

  // —— 周期 ——
  cycleEnabled: boolean;
  cycleRecords: CycleRecord[];
}

export interface AdviceResult {
  title: string;
  content: string;
  /** 数据依据：必须来自真实记录 */
  evidence: string;
}

/** 是否存在任何可用数据（用于整页空状态） */
export function hasAnySnapshotData(s: AssistantSnapshot): boolean {
  return (
    s.recentWeights.length > 0 ||
    s.mealCountToday > 0 ||
    s.exerciseTodayCount > 0 ||
    s.statusToday != null ||
    s.exerciseWeekCount > 0 ||
    s.statusWeekCount > 0
  );
}

/* ---------------- 工具 ---------------- */

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

const SAFE = (n: number | null | undefined, digits = 1): string =>
  typeof n === 'number' && Number.isFinite(n) ? n.toFixed(digits) : '—';

/**
 * 当前周期阶段（Task 9 联动核心）。
 * - 未开启周期管理 / 无周期记录 → null（不生成任何周期内容）
 * - 有记录 → 经期 / 经后 / 排卵期附近 / 经前
 * 数据不足时 getCyclePhaseInfo 内部会保守返回阶段或 null，不做猜测。
 */
export function getSnapshotPhase(s: AssistantSnapshot): CyclePhase | null {
  if (!s.cycleEnabled || !s.cycleRecords.length) return null;
  return getCyclePhaseInfo(s.cycleRecords, s.today).phase;
}

/** 阶段展示文案（AI 助手「身体背景」行 / 首页周期卡共用） */
export function phaseDisplayText(s: AssistantSnapshot): string | null {
  if (!s.cycleEnabled) return null;
  if (!s.cycleRecords.length) return '完善周期记录，获得更个性化建议';
  const info = getCyclePhaseInfo(s.cycleRecords, s.today);
  if (info.phase === 'period' && info.periodDay != null) {
    return `经期第 ${info.periodDay} 天`;
  }
  if (info.phase == null) return '暂时无法准确判断周期阶段';
  const label = PHASE_LABEL[info.phase];
  return info.nextInDays != null && info.nextInDays > 0
    ? `${label} · 距下次经期约 ${info.nextInDays} 天`
    : label;
}

/* ---------------- 今日综合建议 ---------------- */

export function generateDailyAdvice(s: AssistantSnapshot): AdviceResult {
  const phase = getSnapshotPhase(s);

  // 无任何今日数据
  if (s.mealCountToday === 0 && s.exerciseTodayCount === 0 && !s.statusToday) {
    return {
      title: '先从记录开始',
      content: '今天还没有新的记录。可以先记录一餐饮食或今天的身体状态，我会根据你的真实情况给出更有针对性的建议。',
      evidence: `今日记录：饮食 0 餐 · 运动 0 次 · 身体状态未记录`,
    };
  }

  // 经期 + 精力偏低 → 优先恢复（周期 × 身体状态联动）
  if (phase === 'period' && s.statusToday) {
    const lowEnergy =
      (s.statusToday.energy != null && s.statusToday.energy <= 2) ||
      s.statusToday.fatigue === 'high';
    if (lowEnergy) {
      return {
        title: '经期里优先照顾自己',
        content: '结合你的周期和今天的身体状态，今天可以放轻安排：温和活动、早点休息，吃点自己觉得舒服的食物就好。',
        evidence: `当前为经期，今日精力 ${s.statusToday.energy != null ? ENERGY_LABEL[s.statusToday.energy - 1] : '未记录'}${s.statusToday.fatigue === 'high' ? ' · 疲劳感较明显' : ''}。`,
      };
    }
  }

  // 有饮食、还没记录晚餐 → 优先规律饮食
  if (s.mealCountToday > 0 && !s.recordedMealTypes.includes('dinner')) {
    const next = s.recordedMealTypes.includes('lunch') ? '晚餐' : '下一餐';
    const periodHint =
      phase === 'period' ? '经期里可以优先选温和、好消化的食物。' : '';
    return {
      title: '今天可以优先保证规律饮食',
      content: `你今天已经记录了 ${s.mealCountToday} 餐，目前还没有记录${next === '晚餐' ? '晚餐' : '其他餐食'}。规律的三餐比刻意少吃更可持续，${next}记得吃点蛋白质和蔬菜。${periodHint}`,
      evidence: `今日已记录 ${s.mealCountToday} 餐（${s.recordedMealTypes.map((m) => MEAL_LABEL[m]).join('、') || '无'}），约 ${Math.round(s.kcalToday)} kcal${phase === 'period' ? ' · 当前处于经期' : ''}。`,
    };
  }

  // 今天有运动 → 肯定 + 恢复提醒
  if (s.exerciseTodayCount > 0) {
    const lowEnergy = s.statusToday?.energy != null && s.statusToday.energy <= 2;
    return {
      title: lowEnergy ? '运动后注意恢复' : '今天的运动完成得不错',
      content: lowEnergy
        ? '今天已经动过了，精力又偏低，晚上可以早点休息，让身体好好恢复。'
        : '今天的运动已经安排上了，运动后记得补水，如果有饥饿感，选一些好消化的蛋白质。',
      evidence: `今日运动 ${s.exerciseTodayCount} 次 · ${s.exerciseTodayMinutes} 分钟${s.exerciseTodayLabels.length ? `（${s.exerciseTodayLabels.join('、')}）` : ''}。`,
    };
  }

  // 有身体状态、无运动
  if (s.statusToday) {
    const energy = s.statusToday.energy;
    if (energy != null && energy <= 2) {
      return {
        title: '今天以恢复为主',
        content: '今天精力偏低，可以不安排高强度活动，做点拉伸或散步就很好，早点休息。',
        evidence: `今日精力 ${energy != null ? ENERGY_LABEL[energy - 1] : '—'}${s.statusToday.sleepHours != null ? ` · 睡眠 ${SAFE(s.statusToday.sleepHours)}h` : ''}。`,
      };
    }
    const phaseHint = phase === 'period' ? '，经期里按体感调整强度就好' : '';
    return {
      title: '状态平稳，可以动一动',
      content: `今天状态平稳，如果还没有运动安排，可以考虑 20~30 分钟的轻到中等强度活动${phaseHint}。`,
      evidence: `今日精力 ${energy != null ? ENERGY_LABEL[energy - 1] : '—'} · 运动 0 次。`,
    };
  }

  // 仅饮食
  return {
    title: '继续保持记录',
    content: `今天已经记录了 ${s.mealCountToday} 餐。如果愿意，再补充一下运动或身体状态，建议会更完整。`,
    evidence: `今日饮食 ${s.mealCountToday} 餐 · 约 ${Math.round(s.kcalToday)} kcal。`,
  };
}

/* ---------------- 饮食建议 ---------------- */

export function generateDietAdvice(s: AssistantSnapshot): AdviceResult {
  const phase = getSnapshotPhase(s);
  const appetite = s.statusToday?.appetite ?? null;
  const periodSuffix =
    phase === 'period'
      ? '可以优先选择自己容易接受、营养结构较完整的食物，并根据实际状态调整。'
      : '';

  if (s.mealCountToday === 0) {
    // 饮食记录少 + 食欲较低 → 先保证规律进餐（Task 9 联动）
    if (appetite === 'low') {
      return {
        title: '饮食建议',
        content: '今天记录的饮食较少，食欲也偏低。可以先保证规律进餐，再观察自己的饥饿感和状态，不必勉强吃很多。',
        evidence: `今日饮食记录：0 餐 · 今日食欲：低${s.statusToday ? `（精力 ${s.statusToday.energy != null ? ENERGY_LABEL[s.statusToday.energy - 1] : '未记录'}）` : ''}。`,
      };
    }
    return {
      title: '饮食建议',
      content: '今天还没有饮食记录，可以先记录一餐，让我帮你看看整体摄入情况。',
      evidence: '今日饮食记录：0 餐。',
    };
  }

  const kcal = Math.round(s.kcalToday);
  const protein = Math.round(s.proteinToday);
  const meals = s.recordedMealTypes.map((m) => MEAL_LABEL[m]).filter(Boolean);
  const missingDinner = !s.recordedMealTypes.includes('dinner');
  const phaseText = phase === 'period' ? ' · 当前处于经期' : '';

  if (s.proteinToday > 0 && s.proteinToday < 25) {
    return {
      title: '饮食建议',
      content: `目前今天记录了约 ${kcal} kcal，蛋白质 ${protein}g 还不算多，接下来的一餐可以加一些鸡蛋、豆腐、酸奶或瘦肉这类优质蛋白。${periodSuffix}`,
      evidence: `今日已记录 ${s.mealCountToday} 餐（${meals.join('、')}）· 约 ${kcal} kcal · 蛋白质 ${protein}g${phaseText}。`,
    };
  }

  if (s.proteinToday >= 25) {
    return {
      title: '饮食建议',
      content: missingDinner
        ? `今天蛋白质摄入已经比较充足（${protein}g），晚餐可以吃得清淡均衡一些，蔬菜和主食都留一点位置。${periodSuffix}`
        : `今天蛋白质摄入约 ${protein}g，比较充足，继续保持这样的记录节奏就好。${periodSuffix}`,
      evidence: `今日已记录 ${s.mealCountToday} 餐（${meals.join('、')}）· 约 ${kcal} kcal · 蛋白质 ${protein}g${phaseText}。`,
    };
  }

  return {
    title: '饮食建议',
    content: `今天已经记录了 ${s.mealCountToday} 餐、约 ${kcal} kcal。如果之后还有进食，记得随手记录，数据越完整建议越准。${periodSuffix}`,
    evidence: `今日已记录 ${s.mealCountToday} 餐（${meals.join('、')}）· 约 ${kcal} kcal${phaseText}。`,
  };
}

/* ---------------- 运动建议 ---------------- */

const EXERCISE_LABEL: Record<string, string> = {
  running: '跑步',
  walking: '快走',
  jogging: '慢跑',
  cycling: '骑行',
  yoga: '瑜伽',
  strength: '力量训练',
  swimming: '游泳',
  badminton: '羽毛球',
  hiit: 'HIIT',
  pilates: '普拉提',
  other: '运动',
};

export function exerciseTypeLabel(t: string): string {
  return EXERCISE_LABEL[t] ?? '运动';
}

export function generateExerciseAdvice(s: AssistantSnapshot): AdviceResult {
  const phase = getSnapshotPhase(s);
  const r = s.statusToday;
  const lowEnergy = (r?.energy != null && r.energy <= 2) || r?.fatigue === 'high';
  const phaseText = phase === 'period' ? ' · 当前处于经期' : '';

  // 经期 × 身体状态联动（Task 9）
  if (phase === 'period') {
    if (lowEnergy) {
      return {
        title: '运动建议',
        content: '今天可以优先考虑低强度活动，比如散步、舒缓拉伸，按自己的状态调整，感觉累了就休息。',
        evidence: `当前为经期${r ? ` · 今日精力 ${r.energy != null ? ENERGY_LABEL[r.energy - 1] : '未记录'}${r.fatigue === 'high' ? ' · 疲劳感较明显' : ''}` : ''}${s.exerciseTodayCount > 0 ? ` · 今日已运动 ${s.exerciseTodayCount} 次` : ''}。`,
      };
    }
    if (r) {
      return {
        title: '运动建议',
        content: '如果身体感觉良好，可以保持轻量到中等强度活动；如果过程中感觉不适，随时停下来休息。',
        evidence: `当前为经期 · 今日精力 ${r.energy != null ? ENERGY_LABEL[r.energy - 1] : '未记录'} · 今日运动 ${s.exerciseTodayCount} 次。`,
      };
    }
  }

  if (s.exerciseTodayCount === 0) {
    const weekPart =
      s.exerciseWeekCount > 0
        ? `最近 7 天你已经完成了 ${s.exerciseWeekCount} 次运动。`
        : '最近 7 天还没有运动记录。';
    const statePart = lowEnergy
      ? '今天精力偏低，可以根据状态安排一次轻量活动，或者干脆休息一天。'
      : '可以根据自己的状态安排一次轻量活动，比如散步 20 分钟或一组拉伸。';
    return {
      title: '运动建议',
      content: `今天还没有运动记录，${statePart}`,
      evidence: `今日运动 0 次 · ${weekPart}${phaseText}`,
    };
  }

  const labels = s.exerciseTodayLabels.length
    ? s.exerciseTodayLabels.join('、')
    : '运动';
  const long = s.exerciseTodayMinutes >= 75;

  return {
    title: '运动建议',
    content: long
      ? `今天已经运动了 ${s.exerciseTodayMinutes} 分钟，量已经比较充足，接下来以拉伸和休息为主，别让自己太累。`
      : `今天完成了 ${s.exerciseTodayCount} 次${labels}，共 ${s.exerciseTodayMinutes} 分钟，循序渐进就很好。`,
    evidence: `今日运动 ${s.exerciseTodayCount} 次 · ${s.exerciseTodayMinutes} 分钟（${labels}）${phaseText}。`,
  };
}

/* ---------------- 身体状态建议 ---------------- */

export function generateBodyAdvice(s: AssistantSnapshot): AdviceResult {
  const r = s.statusToday;
  if (!r) {
    return {
      title: '身体状态建议',
      content: '今天还没有记录身体状态。花半分钟记录一下精力、睡眠和心情，我就能给出更贴合你的建议。',
      evidence: `今日身体状态：未记录${s.statusWeekCount > 0 ? `（最近 7 天已记录 ${s.statusWeekCount} 天）` : ''}。`,
    };
  }

  const energyTxt = r.energy != null ? ENERGY_LABEL[r.energy - 1] : null;
  const sleepTxt = r.sleepHours != null ? `${SAFE(r.sleepHours)} 小时` : null;
  const moodTxt = r.mood != null ? MOOD_LABEL[r.mood - 1] : null;
  const evidenceParts = [
    energyTxt ? `精力${energyTxt}` : null,
    sleepTxt ? `睡眠 ${sleepTxt}` : null,
    moodTxt ? `心情${moodTxt}` : null,
  ].filter(Boolean) as string[];
  const evidence = `今日记录：${evidenceParts.join(' · ') || '部分字段未填写'}。`;

  // 精力偏低 / 疲劳明显 → 温和恢复建议（不做诊断）
  if ((r.energy != null && r.energy <= 2) || r.fatigue === 'high') {
    return {
      title: '身体状态建议',
      content: '今天身体比较累，可以把安排放轻一点：早点休息、多喝水、别勉强运动。状态是慢慢养回来的。',
      evidence,
    };
  }

  // 睡眠不足（<6.5h）但精力尚可
  if (r.sleepHours != null && r.sleepHours < 6.5) {
    return {
      title: '身体状态建议',
      content: `最近记录的睡眠是 ${SAFE(r.sleepHours)} 小时，稍微偏少。今晚可以试着提前 15~30 分钟上床，白天有时间就小憩片刻。`,
      evidence,
    };
  }

  // 正向情况
  return {
    title: '身体状态建议',
    content: '今天的整体状态看起来不错，继续保持规律的作息和记录节奏，我也会持续帮你留意变化。',
    evidence,
  };
}

/* ---------------- 周期建议（仅 enabled） ---------------- */

export function generateCycleAdvice(s: AssistantSnapshot): AdviceResult | null {
  if (!s.cycleEnabled) return null;

  const info = getCyclePhaseInfo(s.cycleRecords, s.today);

  if (!s.cycleRecords.length) {
    return {
      title: '周期建议',
      content: '周期管理已开启，但还没有周期记录。坚持记录每次经期的开始和结束，几期之后就能看到你自己的规律。',
      evidence: '周期记录：0 条。',
    };
  }

  const dayPart =
    info.phase === 'period' && info.periodDay != null
      ? `当前是经期第 ${info.periodDay} 天`
      : info.nextInDays != null && info.nextInDays > 0
        ? `距下次经期约 ${info.nextInDays} 天`
        : '经期记录已保存';

  if (info.phase === 'period') {
    return {
      title: '周期建议',
      content: '经期里身体相对敏感，运动以温和为主，饮食上可以偏好温热、好消化的食物，优先照顾休息。',
      evidence: `${dayPart}（最近一次经期开始于 ${s.cycleRecords[s.cycleRecords.length - 1]?.startDate ?? '—'}）。`,
    };
  }
  if (info.phase === 'pre') {
    return {
      title: '周期建议',
      content: '经前这段时间情绪和食欲可能会有波动，属于正常现象。对自己宽容一点，想吃的东西适量满足就好。',
      evidence: `${dayPart}。`,
    };
  }
  if (info.phase === 'ovulation') {
    return {
      title: '周期建议',
      content: '排卵期附近身体状态通常比较舒展，如果有运动计划，可以安排在这段时间，量力而行。',
      evidence: `${dayPart}。`,
    };
  }
  return {
    title: '周期建议',
    content: '经后是身体逐渐恢复的时间段，可以循序渐进地恢复运动强度，同时保持均衡饮食。',
    evidence: `${dayPart}。`,
  };
}

/* ---------------- 体重趋势说明（用于快速提问） ---------------- */

export function generateWeightComment(s: AssistantSnapshot): AdviceResult {
  const w = s.recentWeights.filter((x) => typeof x === 'number' && Number.isFinite(x));

  if (w.length === 0) {
    return {
      title: '体重',
      content: '目前还没有体重记录。开始记录后，我会结合趋势帮你观察变化。',
      evidence: '体重记录：0 条。',
    };
  }
  if (w.length < 2) {
    return {
      title: '体重',
      content: `最新一次体重是 ${SAFE(s.weightLatest ?? w[w.length - 1])} kg。再记录几次，就能看出趋势了。`,
      evidence: `体重记录：${w.length} 条。`,
    };
  }

  const recent = w.slice(-5);
  const range = Math.max(...recent) - Math.min(...recent);
  const latest = SAFE(recent[recent.length - 1]);

  if (range <= 0.5) {
    return {
      title: '体重',
      content: `最近几次体重记录比较稳定（最新 ${latest} kg），可以继续保持目前的记录节奏。`,
      evidence: `最近 ${recent.length} 次记录波动范围约 ${SAFE(range)} kg。`,
    };
  }

  return {
    title: '体重',
    content: `最新体重 ${latest} kg。短期体重变化可能受到水分、饮食、排便等多种因素影响，可以结合一周趋势观察，不必过度关注单日数字。`,
    evidence: `最近 ${recent.length} 次记录波动范围约 ${SAFE(range)} kg。`,
  };
}

/* ---------------- 首页 AI 建议摘要（Task 9） ---------------- */

/**
 * 首页 AI 卡片的一句话摘要。
 * 输入全部来自真实快照；无数据时引导记录，不输出固定 Mock 文案。
 */
export function generateHomeBrief(s: AssistantSnapshot): string {
  const phase = getSnapshotPhase(s);

  // 无任何今日数据
  if (s.mealCountToday === 0 && s.exerciseTodayCount === 0 && !s.statusToday) {
    return '先记录今天的饮食或身体状态，我可以给你更具体的建议。';
  }

  const parts: string[] = [];
  if (s.mealCountToday > 0) parts.push(`已记录 ${s.mealCountToday} 餐饮食`);
  if (s.exerciseTodayCount > 0) {
    parts.push(`运动了 ${s.exerciseTodayMinutes} 分钟`);
  }

  if (s.statusToday) {
    const e = s.statusToday.energy;
    if (e != null && e <= 2) parts.push('身体状态偏低');
    else if (e != null && e >= 4) parts.push('身体状态不错');
    else parts.push('身体状态平稳');
  }

  if (parts.length === 0) {
    // 有周期但无今日记录
    return phase === 'period'
      ? '经期里优先照顾休息，记得记录今天的饮食或状态 🌙'
      : '先记录今天的饮食或身体状态，我可以给你更具体的建议。';
  }

  let text = `今天${parts.join('，')}`;
  if (phase === 'period') {
    text += '。经期里可以按体感调整节奏，优先照顾休息 🌙';
  } else if (parts.length >= 2) {
    text += '，可以继续保持当前节奏 🌿';
  } else {
    text += '，继续保持 🌿';
  }
  return text;
}

/* ---------------- 快速提问 ---------------- */

export const QUICK_QUESTIONS = [
  '今天怎么吃？',
  '今天适合运动吗？',
  '最近体重为什么波动？',
  '帮我看看最近状态',
] as const;

/** 根据问题 + 真实数据快照生成本地规则回答 */
export function answerQuickQuestion(
  question: string,
  s: AssistantSnapshot,
): string {
  const q = question.trim();

  // 完全匹配快捷问题
  if (q === QUICK_QUESTIONS[0]) {
    const a = generateDietAdvice(s);
    return `${a.content}\n依据：${a.evidence}`;
  }
  if (q === QUICK_QUESTIONS[1]) {
    const phase = getSnapshotPhase(s);
    const r = s.statusToday;
    // 经期时优先使用周期 × 身体状态联动建议
    if (phase !== 'period') {
      if (r && ((r.energy != null && r.energy <= 2) || r.fatigue === 'high')) {
        return `今天身体比较累（${r.energy != null ? `精力${ENERGY_LABEL[r.energy - 1]}` : '疲劳感明显'}），更适合散步、拉伸这类轻量活动，或者干脆休息一天。\n依据：今日身体状态记录。`;
      }
      if (s.exerciseTodayCount > 0) {
        return `今天已经完成 ${s.exerciseTodayCount} 次运动、${s.exerciseTodayMinutes} 分钟，运动量已经够了，接下来以放松为主。\n依据：今日运动记录。`;
      }
    }
    const a = generateExerciseAdvice(s);
    return `${a.content}\n依据：${a.evidence}`;
  }
  if (q === QUICK_QUESTIONS[2]) {
    const a = generateWeightComment(s);
    return `${a.content}\n依据：${a.evidence}`;
  }
  if (q === QUICK_QUESTIONS[3]) {
    const parts: string[] = [];
    if (s.statusToday) {
      const r = s.statusToday;
      parts.push(
        `今天：${[
          r.energy != null ? `精力${ENERGY_LABEL[r.energy - 1]}` : null,
          r.sleepHours != null ? `睡眠 ${SAFE(r.sleepHours)}h` : null,
          r.mood != null ? `心情${MOOD_LABEL[r.mood - 1]}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}`,
      );
    }
    if (s.statusWeekCount > 0) {
      parts.push(
        `最近 7 天记录了 ${s.statusWeekCount} 天身体状态${
          s.avgSleep7d != null ? `，平均睡眠 ${SAFE(s.avgSleep7d)} 小时` : ''
        }`,
      );
    }
    if (s.exerciseWeekCount > 0) parts.push(`完成了 ${s.exerciseWeekCount} 次运动`);
    if (s.mealCountToday > 0) parts.push(`今天饮食已记录 ${s.mealCountToday} 餐`);
    if (s.weightLatest != null) parts.push(`最新体重 ${SAFE(s.weightLatest)} kg`);

    if (parts.length === 0) {
      return '最近还没有足够的记录。先记录几天身体状态，我就能帮你梳理整体状态了。';
    }
    return `帮你看了下最近的记录：${parts.join('；')}。整体节奏挺稳的，继续按自己的步调来 🌿`;
  }

  // 自由输入：关键词路由
  if (/吃|饮食|餐|食谱/.test(q)) {
    const a = generateDietAdvice(s);
    return `${a.content}\n依据：${a.evidence}`;
  }
  if (/运动|跑步|锻炼|健身|练/.test(q)) {
    const a = generateExerciseAdvice(s);
    return `${a.content}\n依据：${a.evidence}`;
  }
  if (/体重|波动|瘦|减/.test(q)) {
    const a = generateWeightComment(s);
    return `${a.content}\n依据：${a.evidence}`;
  }
  if (/睡|累|疲劳|心情|情绪|状态/.test(q)) {
    const a = generateBodyAdvice(s);
    return `${a.content}\n依据：${a.evidence}`;
  }
  if (/周期|经期|月经/.test(q)) {
    const a = generateCycleAdvice(s);
    return a
      ? `${a.content}\n依据：${a.evidence}`
      : '周期管理当前是关闭的，可以在「我的 → 周期管理」里开启后再问我 🌿';
  }

  return '这个问题我还在学习～你可以问我饮食、运动、体重趋势或身体状态，也可以点击下面的快捷问题。记录的数据越多，我的回答就越贴合你。';
}

/* ---------------- 预留：真实 AI API 接口 ---------------- */

/**
 * 真实 AI 助手接口（暂未启用）。
 *
 * 后期接入方式：
 *   const res = await fetch(`${API_BASE}/api/ai/assistant`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ snapshot, question }),
 *   });
 *
 * 安全约定：
 * - API Key 只保存在服务端，客户端不持有任何密钥
 * - 用户数据仅在用户主动请求建议时提交，且需在隐私协议中明示
 * - 本阶段（规则版）完全本地生成，不上传任何数据
 */
export async function requestAssistantAPI(
  _snapshot: AssistantSnapshot,
  _question?: string,
): Promise<AdviceResult> {
  throw new Error('requestAssistantAPI 尚未接入：当前使用本地规则生成建议');
}
