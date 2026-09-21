import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Rect } from 'react-native-svg';
import {
  ScreenContainer,
  Header,
  Section,
  Card,
  Typography,
  MiniTrend,
  Icon,
} from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { useWeightStore } from '@/stores/weightStore';
import { useDietStore } from '@/stores/dietStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { useCycleStore } from '@/stores/cycleStore';
import { useUserStore } from '@/stores/userStore';
import { useTabStore } from '@/stores/tabStore';
import { NUTRITION_TARGETS, MACRO_META } from '@/constants';
import {
  todayISO,
  parseISODate,
  addDays,
  toISODate,
} from '@/utils/date';
import {
  getCyclePhaseInfo,
  getCycleBodySummary,
  getDashboardSummary,
  PHASE_LABEL,
  ENERGY_LABEL,
  MOOD_LABEL,
} from '@/services/advice';
import type { Rating } from '@/types';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
/** 精力 / 心情 1-5 的轻量表情（与 ENERGY_LABEL / MOOD_LABEL 对应） */
const ENERGY_EMOJI = ['😞', '😕', '😐', '🙂', '😊'];
const MOOD_EMOJI = ['😞', '😕', '😐', '🙂', '😊'];

/** 取最近 window 天（含今天）的日期上界 */
function windowStart(today: string, windowDays: number): Date {
  return addDays(parseISODate(today), -(windowDays - 1));
}

export function DataAnalysisScreen() {
  const navigation = useNavigation<any>();
  const [windowDays, setWindowDays] = useState<7 | 30>(7);

  const weightRecords = useWeightStore((s) => s.records);
  const mealRecords = useDietStore((s) => s.records);
  const exerciseRecords = useExerciseStore((s) => s.records);
  const statusRecords = useBodyStatusStore((s) => s.records);
  const cycleEnabled = useCycleStore((s) => s.enabled);
  const cycleRecords = useCycleStore((s) => s.records);
  const goalWeight = useUserStore((s) => s.user?.goalWeight ?? 52);

  // —— 导航：栈页直跳，Tab 页切 tab 后返回 ——
  const goToWeight = () => navigation.navigate('WeightTrend');
  const goToBody = () => navigation.navigate('BodyStatus');
  const goToCycle = () => navigation.navigate('Cycle');
  const goToDiet = () => {
    useTabStore.getState().setActive('Diet');
    navigation.goBack();
  };
  const goToExercise = () => {
    useTabStore.getState().setActive('Exercise');
    navigation.goBack();
  };

  const data = useMemo(() => {
    const today = todayISO();
    const start = windowStart(today, windowDays);

    // —— 体重 ——
    const allWeights = [...weightRecords].sort((a, b) =>
      a.recordedAt.localeCompare(b.recordedAt),
    );
    const hasWeight = allWeights.length > 0;
    const latestWeight = hasWeight
      ? allWeights[allWeights.length - 1].weight
      : null;
    const prevWeight =
      allWeights.length >= 2 ? allWeights[allWeights.length - 2].weight : null;
    const weightDelta =
      latestWeight != null && prevWeight != null
        ? +(latestWeight - prevWeight).toFixed(2)
        : null;
    const weightsInWindow = allWeights.filter(
      (r) => parseISODate(r.recordedAt.slice(0, 10)) >= start,
    );
    const windowChange =
      weightsInWindow.length >= 2
        ? +(
            weightsInWindow[weightsInWindow.length - 1].weight -
            weightsInWindow[0].weight
          ).toFixed(2)
        : null;
    const trendSource =
      weightsInWindow.length >= 2
        ? weightsInWindow
        : allWeights.slice(-Math.min(allWeights.length, 14));
    const trendValues = trendSource.map((r) => r.weight);

    // —— 饮食（今日优先，窗口均值补充） ——
    const mealsWithItems = mealRecords.filter(
      (m) => m.items && m.items.length > 0,
    );
    const hasDiet = mealsWithItems.length > 0;
    const byDay = new Map<string, typeof mealRecords>();
    for (const m of mealsWithItems) {
      const arr = byDay.get(m.date) ?? [];
      arr.push(m);
      byDay.set(m.date, arr);
    }
    const todayMeals = byDay.get(today) ?? [];
    let displayDate = today;
    let displayMeals = todayMeals;
    if (displayMeals.length === 0 && byDay.size > 0) {
      const recent = [...byDay.keys()].sort((a, b) => b.localeCompare(a))[0];
      displayDate = recent;
      displayMeals = byDay.get(recent) ?? [];
    }
    let dayCalories = 0;
    let dayProtein = 0;
    let dayCarbs = 0;
    let dayFat = 0;
    for (const m of displayMeals) {
      for (const it of m.items) {
        dayCalories += it.calories;
        dayProtein += it.protein;
        dayCarbs += it.carbs;
        dayFat += it.fat;
      }
    }
    const calorieTarget = NUTRITION_TARGETS.calories;
    const remain = Math.max(0, calorieTarget - dayCalories);
    const macroTargets = {
      protein: NUTRITION_TARGETS.protein,
      carbs: NUTRITION_TARGETS.carbs,
      fat: NUTRITION_TARGETS.fat,
    };

    // —— 饮食：窗口聚合（按天求和 → 求日均） ——
    const mealsInWindow = mealsWithItems.filter(
      (m) => parseISODate(m.date) >= start,
    );
    const dayTotalsMap = new Map<
      string,
      { kcal: number; p: number; c: number; f: number }
    >();
    for (const m of mealsInWindow) {
      const cur = dayTotalsMap.get(m.date) ?? { kcal: 0, p: 0, c: 0, f: 0 };
      for (const it of m.items) {
        cur.kcal += it.calories;
        cur.p += it.protein;
        cur.c += it.carbs;
        cur.f += it.fat;
      }
      dayTotalsMap.set(m.date, cur);
    }
    const dietDaysInWindow = dayTotalsMap.size;
    const sumOf = (k: 'kcal' | 'p' | 'c' | 'f') => {
      let s = 0;
      for (const v of dayTotalsMap.values()) s += v[k];
      return s;
    };
    const windowAvgKcal =
      dietDaysInWindow > 0 ? Math.round(sumOf('kcal') / dietDaysInWindow) : 0;
    const windowAvgP =
      dietDaysInWindow > 0 ? Math.round(sumOf('p') / dietDaysInWindow) : 0;
    const windowAvgC =
      dietDaysInWindow > 0 ? Math.round(sumOf('c') / dietDaysInWindow) : 0;
    const windowAvgF =
      dietDaysInWindow > 0 ? Math.round(sumOf('f') / dietDaysInWindow) : 0;

    // —— 运动（窗口内） ——
    const exerciseInWindow = exerciseRecords.filter(
      (e) => parseISODate(e.date) >= start,
    );
    const hasExercise = exerciseInWindow.length > 0;
    const exerciseTotalCount = exerciseInWindow.length;
    const exerciseDaysCount = new Set(exerciseInWindow.map((e) => e.date))
      .size;
    const exerciseTotalMinutes = exerciseInWindow.reduce(
      (a, e) => a + e.duration,
      0,
    );
    const exerciseAvgPerDay = Math.round(exerciseTotalMinutes / windowDays);
    // 柱状图：7 天 = 近 7 日；30 天 = 近 5 周聚合
    let exerciseBars: { label: string; mins: number }[];
    if (windowDays === 7) {
      const t = parseISODate(today);
      exerciseBars = [];
      for (let i = 6; i >= 0; i--) {
        const day = toISODate(addDays(t, -i));
        const dow = parseISODate(day).getDay(); // 0=Sun
        const label = WEEKDAY_LABELS[dow === 0 ? 6 : dow - 1];
        const mins = exerciseRecords
          .filter((e) => e.date === day)
          .reduce((acc, e) => acc + e.duration, 0);
        exerciseBars.push({ label, mins });
      }
    } else {
      const t = parseISODate(today);
      exerciseBars = [];
      for (let w = 4; w >= 0; w--) {
        const wStart = addDays(t, -(w * 7 + 6));
        const wEnd = addDays(t, -(w * 7));
        const mins = exerciseRecords
          .filter((e) => {
            const d = parseISODate(e.date);
            return d >= wStart && d <= wEnd;
          })
          .reduce((acc, e) => acc + e.duration, 0);
        exerciseBars.push({ label: `W${5 - w}`, mins });
      }
    }

    // —— 身体状态（窗口内） ——
    const statusesInWindow = statusRecords.filter(
      (s) => parseISODate(s.date) >= start,
    );
    const hasBody = statusesInWindow.length > 0;
    const bodyDays = statusesInWindow.length;
    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    const avgEnergy = mean(
      statusesInWindow
        .map((s) => s.energy)
        .filter((x): x is Rating => typeof x === 'number'),
    );
    const avgSleep = mean(
      statusesInWindow
        .map((s) => s.sleepHours)
        .filter((x): x is number => x != null),
    );
    const avgMood = mean(
      statusesInWindow
        .map((s) => s.mood)
        .filter((x): x is Rating => typeof x === 'number'),
    );
    // 最近 7 天（升序），用于 emoji 趋势
    const recentStatuses = statusesInWindow
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    // —— 周期 ——
    const phaseInfo = cycleEnabled
      ? getCyclePhaseInfo(cycleRecords, today)
      : { phase: null, periodDay: null, nextInDays: null };
    const cycleBody = getCycleBodySummary(statusRecords, today, 365);

    // —— 小结 ——
    const summary = getDashboardSummary({
      windowDays,
      dietDays: dietDaysInWindow,
      exerciseCount: exerciseTotalCount,
      exerciseMinutes: exerciseTotalMinutes,
      hasWeight,
      weightChange: windowChange ?? weightDelta ?? 0,
      bodyDays,
    });

    return {
      hasWeight,
      latestWeight,
      weightDelta,
      trendValues,
      hasDiet,
      displayDate,
      dayCalories,
      remain,
      dayProtein,
      dayCarbs,
      dayFat,
      macroTargets,
      windowAvgKcal,
      windowAvgP,
      windowAvgC,
      windowAvgF,
      dietDaysInWindow,
      hasExercise,
      exerciseTotalCount,
      exerciseDaysCount,
      exerciseTotalMinutes,
      exerciseAvgPerDay,
      exerciseBars,
      hasBody,
      avgEnergy,
      avgSleep,
      avgMood,
      recentStatuses,
      phaseInfo,
      cycleBody,
      summary,
    };
  }, [
    windowDays,
    weightRecords,
    mealRecords,
    exerciseRecords,
    statusRecords,
    cycleEnabled,
    cycleRecords,
  ]);

  return (
    <ScreenContainer scroll>
      <Header title="数据分析" onLeftPress={() => navigation.goBack()} />

      {/* 顶部时间筛选 */}
      <View style={styles.filterRow}>
        <Segmented
          options={[
            { key: 7, label: '7天' },
            { key: 30, label: '30天' },
          ]}
          value={windowDays}
          onChange={(v) => setWindowDays(v as 7 | 30)}
        />
        <Typography variant="caption" color="tertiary">
          数据来自你的真实记录
        </Typography>
      </View>

      <Section gap={spacing.md}>
        {/* 体重趋势（可点击 → WeightTrend） */}
        <Card onPress={data.hasWeight ? goToWeight : undefined}>
          <View style={styles.cardHeader}>
            <Typography variant="captionStrong" color="secondary">
              体重趋势
            </Typography>
            <View style={styles.cardHeaderRight}>
              <Icon name="scale" size={18} color={semantic.primary} />
              {data.hasWeight ? (
                <View style={{ marginLeft: 4 }}>
                  <Icon name="chevron-right" size={16} color={semantic.textTertiary} />
                </View>
              ) : null}
            </View>
          </View>
          {data.hasWeight ? (
            <View style={styles.weightBody}>
              <View style={styles.weightStats}>
                <Stat
                  label="当前"
                  value={`${data.latestWeight!.toFixed(1)}`}
                  unit="kg"
                />
                <Stat
                  label="本周期变化"
                  value={
                    data.weightDelta != null
                      ? `${data.weightDelta >= 0 ? '+' : ''}${data.weightDelta.toFixed(1)}`
                      : '—'
                  }
                  unit={data.weightDelta != null ? 'kg' : undefined}
                  trend={
                    data.weightDelta == null
                      ? undefined
                      : data.weightDelta < 0
                        ? 'down'
                        : data.weightDelta > 0
                          ? 'up'
                          : 'flat'
                  }
                />
                <Stat
                  label="目标"
                  value={`${goalWeight.toFixed(1)}`}
                  unit="kg"
                  highlight
                />
              </View>
              <View style={styles.trendWrap}>
                <MiniTrend
                  data={data.trendValues}
                  width={300}
                  height={84}
                  color={semantic.primary}
                  fillColor={semantic.primarySoft}
                  showDots
                />
              </View>
            </View>
          ) : (
            <EmptyHint text="记录更多体重后，这里会显示趋势。" />
          )}
        </Card>

        {/* 饮食数据（可点击 → Diet Tab） */}
        <Card background={semantic.accentDietSoft} onPress={data.hasDiet ? goToDiet : undefined}>
          <View style={styles.cardHeader}>
            <Typography variant="captionStrong" color="diet">
              饮食数据
            </Typography>
            <View style={styles.cardHeaderRight}>
              <Icon name="utensils" size={18} color={semantic.accentDiet} />
              {data.hasDiet ? (
                <View style={{ marginLeft: 4 }}>
                  <Icon name="chevron-right" size={16} color={semantic.textTertiary} />
                </View>
              ) : null}
            </View>
          </View>
          {data.hasDiet ? (
            <View style={styles.dietBody}>
              <View style={styles.dietHead}>
                <View style={{ flex: 1 }}>
                  <Typography variant="caption" color="tertiary">
                    {data.displayDate === todayISO() ? '今日摄入' : '最近摄入'}
                  </Typography>
                  <View style={styles.dietCalRow}>
                    <Typography variant="numberSmall" color="diet">
                      {Math.round(data.dayCalories)}
                    </Typography>
                    <Typography variant="caption" color="tertiary">
                      {' '}/ {NUTRITION_TARGETS.calories} kcal
                    </Typography>
                  </View>
                  {data.displayDate !== todayISO() ? (
                    <Typography variant="micro" color="tertiary">
                      显示 {data.displayDate.slice(5)}（今日暂无记录）
                    </Typography>
                  ) : null}
                </View>
                <View style={[styles.remainBox, { backgroundColor: semantic.surface }]}>
                  <Typography variant="caption" color="tertiary">
                    剩余
                  </Typography>
                  <Typography variant="numberSmall" color="primary">
                    {Math.round(data.remain)}
                  </Typography>
                  <Typography variant="caption" color="tertiary">
                    kcal
                  </Typography>
                </View>
              </View>

              {/* 三大营养素进度条（基于今日或最近一天） */}
              <View style={styles.macroList}>
                {MACRO_META.map((m) => {
                  const val =
                    m.key === 'protein'
                      ? data.dayProtein
                      : m.key === 'carbs'
                        ? data.dayCarbs
                        : data.dayFat;
                  const target = data.macroTargets[m.key];
                  const color =
                    m.key === 'protein'
                      ? palette.pink400
                      : m.key === 'carbs'
                        ? palette.yellow400
                        : palette.green400;
                  return (
                    <MacroBar
                      key={m.key}
                      label={m.label}
                      value={val}
                      target={target}
                      color={color}
                    />
                  );
                })}
              </View>

              {/* 窗口均值（一行 caption，紧凑） */}
              {data.dietDaysInWindow > 0 ? (
                <Typography variant="micro" color="tertiary" style={{ marginTop: spacing.sm }}>
                  近 {windowDays} 天平均 · {data.windowAvgKcal} kcal · 蛋白质{' '}
                  {data.windowAvgP}g · 碳水 {data.windowAvgC}g · 脂肪 {data.windowAvgF}g
                </Typography>
              ) : null}
            </View>
          ) : (
            <EmptyHint text="记录饮食后，这里会显示你的摄入情况。" />
          )}
        </Card>

        {/* 运动数据（可点击 → Exercise Tab） */}
        <Card background={semantic.primaryBg} onPress={data.hasExercise ? goToExercise : undefined}>
          <View style={styles.cardHeader}>
            <Typography variant="captionStrong" color="primary">
              运动数据
            </Typography>
            <View style={styles.cardHeaderRight}>
              <Icon name="footprints" size={18} color={semantic.primary} />
              {data.hasExercise ? (
                <View style={{ marginLeft: 4 }}>
                  <Icon name="chevron-right" size={16} color={semantic.textTertiary} />
                </View>
              ) : null}
            </View>
          </View>
          {data.hasExercise ? (
            <View style={styles.exBody}>
              <View style={styles.weightStats}>
                <Stat label="运动天数" value={`${data.exerciseDaysCount}`} unit="天" />
                <Stat label="总时长" value={`${data.exerciseTotalMinutes}`} unit="分钟" />
                <Stat
                  label="平均/天"
                  value={`${data.exerciseAvgPerDay}`}
                  unit="分钟"
                />
              </View>
              <Typography
                variant="captionStrong"
                color="secondary"
                style={{ marginTop: spacing.md }}
              >
                {windowDays === 7 ? '近 7 天每日运动时长' : '近 30 天每周运动时长'}
              </Typography>
              <WeekBarChart bars={data.exerciseBars} />
            </View>
          ) : (
            <EmptyHint text="还没有运动记录，动一动后这里会显示柱状图。" />
          )}
        </Card>

        {/* 身体状态（可点击 → BodyStatus） */}
        <Card onPress={data.hasBody ? goToBody : undefined}>
          <View style={styles.cardHeader}>
            <Typography variant="captionStrong" color="secondary">
              身体状态
            </Typography>
            <View style={styles.cardHeaderRight}>
              <Icon name="heart" size={18} color={semantic.primary} />
              {data.hasBody ? (
                <View style={{ marginLeft: 4 }}>
                  <Icon name="chevron-right" size={16} color={semantic.textTertiary} />
                </View>
              ) : null}
            </View>
          </View>
          {data.hasBody ? (
            <View style={styles.bodyBody}>
              <View style={styles.weightStats}>
                <Stat
                  label="平均睡眠"
                  value={data.avgSleep != null ? `${data.avgSleep.toFixed(1)}` : '—'}
                  unit={data.avgSleep != null ? 'h' : undefined}
                />
                <Stat
                  label="平均精力"
                  value={data.avgEnergy ? ENERGY_LABEL[Math.round(data.avgEnergy) - 1] : '—'}
                />
                <Stat
                  label="平均心情"
                  value={data.avgMood ? MOOD_LABEL[Math.round(data.avgMood) - 1] : '—'}
                />
              </View>
              {/* 简单 emoji 趋势：精力 / 睡眠 / 心情 各一行 */}
              {data.recentStatuses.length >= 1 ? (
                <View style={{ marginTop: spacing.sm }}>
                  <EmojiTrendRow
                    label="精力"
                    records={data.recentStatuses}
                    kind="energy"
                  />
                  <EmojiTrendRow
                    label="睡眠"
                    records={data.recentStatuses}
                    kind="sleep"
                  />
                  <EmojiTrendRow
                    label="心情"
                    records={data.recentStatuses}
                    kind="mood"
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <EmptyHint text="记录身体状态后，可以看到你的状态变化。" />
          )}
        </Card>

        {/* 周期数据（仅开启时；可点击 → Cycle） */}
        {cycleEnabled ? (
          <Card background={semantic.accentCycleSoft} onPress={goToCycle}>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="diet">
                周期数据
              </Typography>
              <View style={styles.cardHeaderRight}>
                <Icon name="moon" size={18} color={palette.pink400} />
                <View style={{ marginLeft: 4 }}>
                  <Icon name="chevron-right" size={16} color={semantic.textTertiary} />
                </View>
              </View>
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <Typography variant="h3" color="primary">
                🌙 {data.phaseInfo.phase ? PHASE_LABEL[data.phaseInfo.phase] : '周期'}
                {data.phaseInfo.periodDay ? `第 ${data.phaseInfo.periodDay} 天` : ''}
              </Typography>
            </View>
            {data.cycleBody.count > 0 ? (
              <View style={[styles.weightStats, { marginTop: spacing.md }]}>
                <Stat
                  label="平均睡眠"
                  value={data.cycleBody.avgSleep != null ? `${data.cycleBody.avgSleep.toFixed(1)}` : '—'}
                  unit={data.cycleBody.avgSleep != null ? 'h' : undefined}
                />
                <Stat
                  label="平均精力"
                  value={
                    data.cycleBody.avgEnergy
                      ? ENERGY_LABEL[Math.round(data.cycleBody.avgEnergy) - 1]
                      : '—'
                  }
                />
                <Stat
                  label="心情"
                  value={
                    data.cycleBody.avgMood
                      ? MOOD_LABEL[Math.round(data.cycleBody.avgMood) - 1]
                      : '—'
                  }
                />
              </View>
            ) : (
              <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.sm }}>
                记录更多身体状态后，可以看到周期与身体状态的变化。
              </Typography>
            )}
          </Card>
        ) : null}

        {/* 本阶段小结 */}
        <Card background={semantic.accentAISoft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="sparkles" size={18} color={semantic.accentAI} />
            <Typography variant="captionStrong" color="aiAccent">
              本阶段小结
            </Typography>
          </View>
          <Typography
            variant="body"
            color="primary"
            style={{ marginTop: spacing.sm, lineHeight: 23 }}
          >
            {data.summary}
          </Typography>
        </Card>

        <Typography variant="micro" color="tertiary" align="center">
          所有数据均来自你的真实记录，未做任何推测或填充 🌿
        </Typography>
      </Section>
    </ScreenContainer>
  );
}

/* ---------------- 子组件 ---------------- */

function Segmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: number; label: string }>;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segmentItem, active ? styles.segmentActive : null]}
          >
            <Typography
              variant="captionStrong"
              color={active ? 'inverse' : 'secondary'}
            >
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight,
  trend,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  trend?: 'up' | 'down' | 'flat';
}) {
  return (
    <View style={styles.stat}>
      <Typography variant="caption" color="tertiary">
        {label}
      </Typography>
      <View style={styles.statValueRow}>
        <Typography
          variant="numberSmall"
          color={highlight ? 'primaryAccent' : 'primary'}
        >
          {value}
        </Typography>
        {unit ? (
          <Typography variant="caption" color="tertiary" style={{ marginLeft: 3 }}>
            {unit}
          </Typography>
        ) : null}
        {trend === 'down' ? (
          <Typography variant="caption" color="primaryAccent" style={{ marginLeft: 4 }}>
            ↓
          </Typography>
        ) : null}
        {trend === 'up' ? (
          <Typography variant="caption" color="diet" style={{ marginLeft: 4 }}>
            ↑
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <View style={styles.emptyHint}>
      <Typography variant="caption" color="tertiary" align="center">
        {text}
      </Typography>
    </View>
  );
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroRowTop}>
        <Typography variant="caption" color="secondary">
          {label}
        </Typography>
        <Typography variant="caption" color="tertiary">
          {Math.round(value)} / {target}g
        </Typography>
      </View>
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

/** 精力 / 心情 emoji 趋势行 + 睡眠数值行 */
function EmojiTrendRow({
  label,
  records,
  kind,
}: {
  label: string;
  records: Array<{
    energy?: Rating;
    sleepHours?: number;
    mood?: Rating;
  }>;
  kind: 'energy' | 'mood' | 'sleep';
}) {
  return (
    <View style={styles.emojiRow}>
      <Typography
        variant="micro"
        color="tertiary"
        style={{ width: 30 }}
      >
        {label}
      </Typography>
      <View style={styles.emojiChips}>
        {records.map((r, i) => {
          let content: string;
          if (kind === 'sleep') {
            content = r.sleepHours != null ? `${r.sleepHours}h` : '—';
          } else if (kind === 'energy') {
            content = r.energy ? ENERGY_EMOJI[r.energy - 1] : '·';
          } else {
            content = r.mood ? MOOD_EMOJI[r.mood - 1] : '·';
          }
          return (
            <Typography
              key={i}
              variant="caption"
              color={kind === 'sleep' ? 'secondary' : 'primary'}
              style={{ marginRight: 8 }}
            >
              {content}
            </Typography>
          );
        })}
      </View>
    </View>
  );
}

function WeekBarChart({
  bars,
}: {
  bars: Array<{ label: string; mins: number }>;
}) {
  const W = 300;
  const H = 96;
  const baseY = H - 18;
  const maxVal = Math.max(60, ...bars.map((b) => b.mins));
  const slot = W / bars.length;
  const barW = Math.max(slot * 0.46, 6);
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Svg width={W} height={H}>
        {bars.map((b, i) => {
          const h = (b.mins / maxVal) * (baseY - 6);
          const x = slot * i + (slot - barW) / 2;
          const y = baseY - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={4}
              fill={b.mins > 0 ? semantic.primary : semantic.border}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row' }}>
        {bars.map((b, i) => (
          <View key={i} style={{ width: slot, alignItems: 'center' }}>
            <Typography
              variant="micro"
              color={b.mins > 0 ? 'secondary' : 'tertiary'}
            >
              {b.label}
            </Typography>
          </View>
        ))}
      </View>
      <Typography
        variant="micro"
        color="tertiary"
        align="center"
        style={{ marginTop: 2 }}
      >
        单位：分钟
      </Typography>
    </View>
  );
}

const styles = {
  filterRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  segmented: {
    flexDirection: 'row' as const,
    backgroundColor: semantic.surfaceAlt,
    borderRadius: radii.pill,
    padding: 3,
  },
  segmentItem: {
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  segmentActive: {
    backgroundColor: semantic.primary,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  cardHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  weightBody: {
    marginTop: spacing.md,
  },
  weightStats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center' as const,
  },
  statValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    marginTop: spacing.xs,
  },
  trendWrap: {
    alignItems: 'center' as const,
    marginTop: spacing.sm,
  },
  dietBody: {
    marginTop: spacing.md,
  },
  dietHead: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
  },
  dietCalRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    marginTop: 2,
  },
  remainBox: {
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center' as const,
  },
  macroList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  macroRow: {},
  macroRowTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 3,
  },
  macroTrack: {
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: semantic.border,
    overflow: 'hidden' as const,
  },
  macroFill: {
    height: 7,
    borderRadius: radii.pill,
  },
  exBody: {
    marginTop: spacing.md,
  },
  bodyBody: {
    marginTop: spacing.md,
  },
  emojiRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 3,
  },
  emojiChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    flex: 1,
  },
  emptyHint: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center' as const,
  },
};

export default DataAnalysisScreen;