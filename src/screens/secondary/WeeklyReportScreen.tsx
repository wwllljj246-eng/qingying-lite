/**
 * 周报 Weekly Report（Task 7）
 *
 * 数据闭环：记录 → 数据分析 → 周报 → 建议
 * - 全部数据来自真实 Store（weight / diet / exercise / bodyStatus / cycle）
 * - 基于「最近 7 个自然日（含今天）」聚合
 * - 小结 / 建议由本地规则生成，不接 AI API
 * - 约束：不诊断、不绝对化、不伪造数据
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Rect } from 'react-native-svg';
import {
  ScreenContainer,
  Header,
  Section,
  Card,
  Typography,
  EmptyState,
  MiniTrend,
  Icon,
} from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useWeightStore } from '@/stores/weightStore';
import { useDietStore } from '@/stores/dietStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { useCycleStore } from '@/stores/cycleStore';
import { useQuickAddStore } from '@/stores/quickAddStore';
import { todayISO, parseISODate, addDays, toISODate } from '@/utils/date';
import {
  getCyclePhaseInfo,
  PHASE_LABEL,
  ENERGY_LABEL,
  MOOD_LABEL,
} from '@/services/advice';
import type { Rating } from '@/types';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** ISO 日期 → "09.14" 展示格式 */
function shortDate(iso: string): string {
  return iso.slice(5).replace('-', '.');
}

export function WeeklyReportScreen() {
  const navigation = useNavigation<any>();

  const weightRecords = useWeightStore((s) => s.records);
  const mealRecords = useDietStore((s) => s.records);
  const exerciseRecords = useExerciseStore((s) => s.records);
  const statusRecords = useBodyStatusStore((s) => s.records);
  const cycleEnabled = useCycleStore((s) => s.enabled);
  const cycleRecords = useCycleStore((s) => s.records);

  const data = useMemo(() => {
    const today = todayISO();
    const start = toISODate(addDays(parseISODate(today), -6)); // 最近 7 个自然日（含今天）

    // —— 体重（窗口内） ——
    const weekWeights = [...weightRecords]
      .filter((r) => {
        const d = r.recordedAt.slice(0, 10);
        return d >= start && d <= today;
      })
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const weightCount = weekWeights.length;
    const latestWeight = weightCount > 0 ? weekWeights[weightCount - 1].weight : null;
    const weekChange =
      weightCount >= 2
        ? +(weekWeights[weightCount - 1].weight - weekWeights[0].weight).toFixed(2)
        : null;
    const trendValues = weekWeights.map((r) => r.weight);

    // —— 饮食（窗口内，按天聚合） ——
    const mealsInWindow = mealRecords.filter(
      (m) => m.items && m.items.length > 0 && m.date >= start && m.date <= today,
    );
    const dayTotals = new Map<string, { kcal: number; p: number; c: number; f: number }>();
    for (const m of mealsInWindow) {
      const cur = dayTotals.get(m.date) ?? { kcal: 0, p: 0, c: 0, f: 0 };
      for (const it of m.items) {
        cur.kcal += it.calories;
        cur.p += it.protein;
        cur.c += it.carbs;
        cur.f += it.fat;
      }
      dayTotals.set(m.date, cur);
    }
    const dietDays = dayTotals.size;
    const avgOf = (k: 'kcal' | 'p' | 'c' | 'f') =>
      dietDays > 0
        ? Math.round(
            [...dayTotals.values()].reduce((a, v) => a + v[k], 0) / dietDays,
          )
        : null;
    const avgKcal = avgOf('kcal');
    const avgProtein = avgOf('p');
    const avgCarbs = avgOf('c');
    const avgFat = avgOf('f');

    // —— 运动（窗口内） ——
    const exercisesInWindow = exerciseRecords.filter(
      (e) => e.date >= start && e.date <= today,
    );
    const exCount = exercisesInWindow.length;
    const exMinutes = exercisesInWindow.reduce((a, e) => a + e.duration, 0);
    const exAvgPerSession = exCount > 0 ? Math.round(exMinutes / exCount) : null;
    // 7 天柱状图（无数据的日期为 0）
    const t = parseISODate(today);
    const exBars: Array<{ label: string; mins: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const day = toISODate(addDays(t, -i));
      const dow = parseISODate(day).getDay(); // 0=Sun
      const label = WEEKDAY_LABELS[dow === 0 ? 6 : dow - 1];
      const mins = exerciseRecords
        .filter((e) => e.date === day)
        .reduce((acc, e) => acc + e.duration, 0);
      exBars.push({ label, mins });
    }

    // —— 身体状态（窗口内） ——
    const statusesInWindow = statusRecords.filter(
      (r) => r.date >= start && r.date <= today,
    );
    const bodyDays = statusesInWindow.length;
    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    const avgSleep = mean(
      statusesInWindow
        .map((s) => s.sleepHours)
        .filter((x): x is number => x != null),
    );
    const avgEnergy = mean(
      statusesInWindow
        .map((s) => s.energy)
        .filter((x): x is Rating => typeof x === 'number'),
    );
    const avgMood = mean(
      statusesInWindow
        .map((s) => s.mood)
        .filter((x): x is Rating => typeof x === 'number'),
    );

    // —— 周期（仅 enabled 时计算） ——
    const phaseInfo = cycleEnabled
      ? getCyclePhaseInfo(cycleRecords, today)
      : null;

    // —— 本周小结（本地规则，1~3 条） ——
    const summaryLines: string[] = [];
    if (dietDays >= 5) summaryLines.push(`本周饮食记录比较规律，共记录 ${dietDays} 天。`);
    if (exCount >= 3) summaryLines.push(`本周完成 ${exCount} 次运动，共 ${exMinutes} 分钟。`);
    if (avgSleep != null) {
      summaryLines.push(`最近记录的平均睡眠为 ${avgSleep.toFixed(1)} 小时。`);
    } else if (weekChange != null) {
      // 睡眠缺失时用体重变化补一条温和描述（不做确定性判断）
      const word =
        weekChange <= -0.1 ? '略有下降' : weekChange >= 0.1 ? '略有上升' : '保持稳定';
      summaryLines.push(`本周体重整体${word}（${Math.abs(weekChange).toFixed(1)} kg）。`);
    }
    if (summaryLines.length === 0) {
      summaryLines.push('继续记录几天，我们会帮你发现更多变化。');
    }

    // —— 下周建议（本地规则） ——
    const adviceLines: string[] = [];
    if (exCount >= 3 && dietDays >= 5 && bodyDays >= 3) {
      adviceLines.push('继续保持目前的记录习惯，并关注运动和睡眠的平衡。');
    } else {
      if (exCount < 3) adviceLines.push('可以从每周 2～3 次轻量运动开始。');
      if (dietDays === 0) {
        adviceLines.push('试着开始记录每日饮食，慢慢了解自己的饮食规律。');
      } else if (dietDays < 5) {
        adviceLines.push('可以继续保持每日饮食记录，帮助了解自己的饮食规律。');
      }
      if (bodyDays < 3) {
        adviceLines.push('每天花一点时间记录身体状态，更容易发现自己的变化。');
      }
    }

    const hasAnyData =
      weightCount > 0 || dietDays > 0 || exCount > 0 || bodyDays > 0;

    return {
      weekRangeLabel: `${shortDate(start)} - ${shortDate(today)}`,
      hasAnyData,
      weightCount,
      latestWeight,
      weekChange,
      trendValues,
      dietDays,
      avgKcal,
      avgProtein,
      avgCarbs,
      avgFat,
      exCount,
      exMinutes,
      exAvgPerSession,
      exBars,
      bodyDays,
      avgSleep,
      avgEnergy,
      avgMood,
      phaseInfo,
      summaryLines: summaryLines.slice(0, 3),
      adviceLines: adviceLines.slice(0, 2),
    };
  }, [weightRecords, mealRecords, exerciseRecords, statusRecords, cycleEnabled, cycleRecords]);

  const openQuickAdd = () => useQuickAddStore.getState().openMain();

  return (
    <ScreenContainer scroll>
      <Header title="周报告" onLeftPress={() => navigation.goBack()} />

      {/* ===== 整页空状态 ===== */}
      {!data.hasAnyData ? (
        <Section gap={spacing.md}>
          <Card>
            <EmptyState
              icon="🌱"
              title="还没有足够的数据生成周报"
              description="记录体重、饮食、运动和身体状态后，这里会逐渐形成你的每周总结"
              actionLabel="去记录"
              onAction={openQuickAdd}
            />
          </Card>
          <Typography variant="micro" color="tertiary" align="center">
            所有数据均来自你的真实记录，未做任何推测或填充 🌿
          </Typography>
        </Section>
      ) : (
        <Section gap={spacing.md}>
          {/* ===== 本周概览 ===== */}
          <Card background={semantic.primaryBg}>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="primary">本周概览</Typography>
              <Typography variant="caption" color="tertiary">{data.weekRangeLabel}</Typography>
            </View>
            <View style={styles.overviewGrid}>
              <OverviewStat
                label="当前体重"
                value={data.latestWeight != null ? data.latestWeight.toFixed(1) : '—'}
                unit={data.latestWeight != null ? 'kg' : undefined}
                big
              />
              <OverviewStat
                label="本周变化"
                value={
                  data.weekChange != null
                    ? `${data.weekChange <= 0 ? '↓' : '↑'} ${Math.abs(data.weekChange).toFixed(1)}`
                    : '—'
                }
                unit={data.weekChange != null ? 'kg' : undefined}
                big
              />
            </View>
            <View style={[styles.overviewGrid, { marginTop: spacing.md }]}>
              <OverviewStat label="饮食" value={`${data.dietDays}`} unit="/ 7 天" />
              <OverviewStat
                label="运动"
                value={data.exCount > 0 ? `${data.exCount} 次 · ${data.exMinutes} 分钟` : '0 次'}
              />
              <OverviewStat label="身体状态" value={`${data.bodyDays}`} unit="/ 7 天" />
            </View>
          </Card>

          {/* ===== 体重表现 ===== */}
          <Card>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="secondary">体重表现</Typography>
              <Icon name="scale" size={18} color={semantic.primary} />
            </View>
            {data.weightCount === 0 ? (
              <EmptyHint text="本周还没有足够的体重记录。" />
            ) : data.weightCount === 1 ? (
              <View style={{ marginTop: spacing.md }}>
                <Stat label="当前体重" value={data.latestWeight!.toFixed(1)} unit="kg" />
                <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.sm }}>
                  再记录几次，就可以看到本周的变化。
                </Typography>
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <View style={styles.statRow}>
                  <Stat label="最新体重" value={data.latestWeight!.toFixed(1)} unit="kg" />
                  <Stat
                    label="本周变化"
                    value={`${data.weekChange! <= 0 ? '↓' : '↑'} ${Math.abs(data.weekChange!).toFixed(1)}`}
                    unit="kg"
                  />
                </View>
                <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                  <MiniTrend
                    data={data.trendValues}
                    width={300}
                    height={80}
                    color={semantic.primary}
                    fillColor={semantic.primarySoft}
                    showDots
                  />
                </View>
              </View>
            )}
          </Card>

          {/* ===== 饮食表现 ===== */}
          <Card background={semantic.accentDietSoft}>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="diet">饮食表现</Typography>
              <Icon name="utensils" size={18} color={semantic.accentDiet} />
            </View>
            {data.dietDays === 0 ? (
              <EmptyHint text="记录饮食后，这里会显示你的每周饮食概况。" />
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <Typography variant="caption" color="tertiary">
                  本周共记录 {data.dietDays} / 7 天
                </Typography>
                <View style={[styles.statRow, { marginTop: spacing.sm }]}>
                  <Stat label="日均热量" value={`${data.avgKcal ?? '—'}`} unit="kcal" />
                  <Stat label="日均蛋白质" value={`${data.avgProtein ?? '—'}`} unit="g" />
                </View>
                <View style={[styles.statRow, { marginTop: spacing.sm }]}>
                  <Stat label="日均碳水" value={`${data.avgCarbs ?? '—'}`} unit="g" />
                  <Stat label="日均脂肪" value={`${data.avgFat ?? '—'}`} unit="g" />
                </View>
              </View>
            )}
          </Card>

          {/* ===== 运动表现 ===== */}
          <Card background={semantic.primaryBg}>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="primary">运动表现</Typography>
              <Icon name="footprints" size={18} color={semantic.primary} />
            </View>
            {data.exCount === 0 ? (
              <EmptyHint text="本周还没有运动记录，动一动后这里会显示统计。" />
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <View style={styles.statRow}>
                  <Stat label="运动次数" value={`${data.exCount}`} unit="次" />
                  <Stat label="总时长" value={`${data.exMinutes}`} unit="分钟" />
                  <Stat
                    label="平均每次"
                    value={data.exAvgPerSession != null ? `${data.exAvgPerSession}` : '—'}
                    unit="分钟"
                  />
                </View>
                <Typography
                  variant="captionStrong"
                  color="secondary"
                  style={{ marginTop: spacing.md }}
                >
                  近 7 天每日运动时长
                </Typography>
                <WeekBarChart bars={data.exBars} />
              </View>
            )}
          </Card>

          {/* ===== 身体状态 ===== */}
          <Card>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="secondary">身体状态</Typography>
              <Icon name="heart" size={18} color={semantic.primary} />
            </View>
            {data.bodyDays === 0 ? (
              <EmptyHint text="继续记录身体状态，可以看到更完整的变化。" />
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <Typography variant="caption" color="tertiary">
                  本周共记录 {data.bodyDays} / 7 天
                </Typography>
                <View style={[styles.statRow, { marginTop: spacing.sm }]}>
                  <Stat
                    label="平均睡眠"
                    value={data.avgSleep != null ? data.avgSleep.toFixed(1) : '—'}
                    unit={data.avgSleep != null ? 'h' : undefined}
                  />
                  <Stat
                    label="平均精力"
                    value={
                      data.avgEnergy != null
                        ? ENERGY_LABEL[Math.round(data.avgEnergy) - 1]
                        : '—'
                    }
                  />
                  <Stat
                    label="平均心情"
                    value={
                      data.avgMood != null
                        ? MOOD_LABEL[Math.round(data.avgMood) - 1]
                        : '—'
                    }
                  />
                </View>
              </View>
            )}
          </Card>

          {/* ===== 周期信息（仅开启时显示） ===== */}
          {data.phaseInfo ? (
            <Card background={semantic.accentCycleSoft}>
              <View style={styles.cardHeader}>
                <Typography variant="captionStrong" color="diet">周期信息</Typography>
                <Icon name="moon" size={18} color={semantic.accentDiet} />
              </View>
              <Typography variant="h3" color="primary" style={{ marginTop: spacing.sm }}>
                🌙{' '}
                {data.phaseInfo.phase ? PHASE_LABEL[data.phaseInfo.phase] : '周期'}
                {data.phaseInfo.periodDay ? ` · 第 ${data.phaseInfo.periodDay} 天` : ''}
              </Typography>
              {data.phaseInfo.nextInDays != null && data.phaseInfo.nextInDays > 0 ? (
                <Typography variant="caption" color="tertiary" style={{ marginTop: 4 }}>
                  距下次经期约 {data.phaseInfo.nextInDays} 天
                </Typography>
              ) : null}
              {data.bodyDays > 0 ? (
                <View style={[styles.statRow, { marginTop: spacing.md }]}>
                  <Stat
                    label="平均精力"
                    value={
                      data.avgEnergy != null
                        ? ENERGY_LABEL[Math.round(data.avgEnergy) - 1]
                        : '—'
                    }
                  />
                  <Stat
                    label="平均睡眠"
                    value={data.avgSleep != null ? data.avgSleep.toFixed(1) : '—'}
                    unit={data.avgSleep != null ? 'h' : undefined}
                  />
                  <Stat
                    label="平均心情"
                    value={
                      data.avgMood != null
                        ? MOOD_LABEL[Math.round(data.avgMood) - 1]
                        : '—'
                    }
                  />
                </View>
              ) : (
                <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.sm }}>
                  记录身体状态后，可以看到周期与状态的联动。
                </Typography>
              )}
            </Card>
          ) : null}

          {/* ===== 本周小结（本地规则） ===== */}
          <Card background={semantic.accentAISoft}>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="aiAccent">🌱 本周小结</Typography>
              <Icon name="sparkles" size={18} color={semantic.accentAI} />
            </View>
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              {data.summaryLines.map((line, i) => (
                <Typography key={i} variant="body" color="primary" style={{ lineHeight: 23 }}>
                  {line}
                </Typography>
              ))}
            </View>
          </Card>

          {/* ===== 下周建议（本地规则） ===== */}
          <Card background={semantic.primaryBg}>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="primary">🌿 下周可以试试</Typography>
              <Icon name="calendar" size={18} color={semantic.primary} />
            </View>
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              {data.adviceLines.map((line, i) => (
                <Typography key={i} variant="body" color="primary" style={{ lineHeight: 23 }}>
                  {line}
                </Typography>
              ))}
            </View>
          </Card>

          <Typography variant="micro" color="tertiary" align="center">
            所有数据均来自你的真实记录，未做任何推测或填充 🌿
          </Typography>
        </Section>
      )}
    </ScreenContainer>
  );
}

/* ---------------- 子组件 ---------------- */

function OverviewStat({
  label,
  value,
  unit,
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  big?: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Typography variant="caption" color="secondary">{label}</Typography>
      <View style={styles.statValueRow}>
        <Typography variant={big ? 'numberSmall' : 'numberSmall'} color="primary">
          {value}
        </Typography>
        {unit ? (
          <Typography variant="caption" color="tertiary" style={{ marginLeft: 3 }}>
            {unit}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View style={styles.stat}>
      <Typography variant="caption" color="tertiary">{label}</Typography>
      <View style={styles.statValueRow}>
        <Typography variant="numberSmall" color="primary">{value}</Typography>
        {unit ? (
          <Typography variant="caption" color="tertiary" style={{ marginLeft: 3 }}>
            {unit}
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

/** 7 天运动柱状图（无数据的日期高度为 0） */
function WeekBarChart({ bars }: { bars: Array<{ label: string; mins: number }> }) {
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
            <Typography variant="micro" color={b.mins > 0 ? 'secondary' : 'tertiary'}>
              {b.label}
            </Typography>
          </View>
        ))}
      </View>
      <Typography variant="micro" color="tertiary" align="center" style={{ marginTop: 2 }}>
        单位：分钟
      </Typography>
    </View>
  );
}

const styles = {
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  overviewGrid: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statRow: {
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
  emptyHint: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center' as const,
  },
};

export default WeeklyReportScreen;
