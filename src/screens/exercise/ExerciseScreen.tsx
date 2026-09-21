import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import {
  ScreenContainer,
  Section,
  Typography,
  Card,
  Button,
  Icon,
  EmptyState,
} from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { getExerciseTypeInfo, EXERCISE_INTENSITY_LIST } from '@/constants';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useQuickAddStore } from '@/stores/quickAddStore';
import { useCycleStore } from '@/stores/cycleStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { todayISO, addDays, toISODate } from '@/utils/date';
import { getExerciseAdvice, getCyclePhaseInfo, type CyclePhase } from '@/services/advice';
import type { ExerciseIntensity, ExerciseRecord, ExerciseType } from '@/types';

/** WHO 推荐的每周运动时长温和目标（分钟） */
const WEEKLY_GOAL_MIN = 150;
/** 每日运动目标（分钟） */
const DAILY_GOAL_MIN = 30;

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** 推荐运动（柔和、低门槛，符合轻盈 Lite 调性） */
const RECOMMENDED: Array<{ key: ExerciseType; duration: number; label: string }> = [
  { key: 'walking', duration: 30, label: '晨间快走' },
  { key: 'yoga', duration: 20, label: '舒缓瑜伽' },
  { key: 'strength', duration: 20, label: '力量塑形' },
  { key: 'swimming', duration: 30, label: '放松游泳' },
];

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 · 周${WEEKDAY[d.getDay()]}`;
}

/** 强度 → 展示色（用于装饰点，不传给 Typography） */
function intensityColor(key: ExerciseIntensity): string {
  switch (key) {
    case 'low':
      return semantic.textTertiary;
    case 'medium':
      return semantic.primary;
    case 'high':
      return palette.pink400;
  }
}
function intensityLabel(key: ExerciseIntensity): string {
  return EXERCISE_INTENSITY_LIST.find((i) => i.key === key)?.label ?? '适中';
}

interface WeekDay {
  date: string;
  label: string;
  minutes: number;
  isToday: boolean;
}

/* ---------------- 本周柱状图 ---------------- */
function WeekBars({ data }: { data: WeekDay[] }) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  const CHART_H = 120;
  return (
    <View style={styles.barRow}>
      {data.map((d) => {
        const isToday = d.isToday;
        const h = d.minutes > 0 ? Math.max(10, (d.minutes / max) * (CHART_H - 16)) : 4;
        return (
          <View key={d.date} style={styles.barCol}>
            <View style={styles.barTop}>
              {d.minutes > 0 ? (
                <Typography variant="micro" color={isToday ? 'primaryAccent' : 'tertiary'}>
                  {d.minutes}
                </Typography>
              ) : null}
            </View>
            <View style={[styles.barTrack, { height: CHART_H }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: h,
                    backgroundColor: isToday ? semantic.primary : semantic.primarySoft,
                  },
                ]}
              />
            </View>
            <Typography variant="micro" color={isToday ? 'primaryAccent' : 'tertiary'} style={styles.barLabel}>
              {d.label}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------- 今日记录行 ---------------- */
function ExerciseRow({
  record,
  onDelete,
}: {
  record: ExerciseRecord;
  onDelete: () => void;
}) {
  const info = getExerciseTypeInfo(record.type);
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Typography variant="h3">{info.emoji}</Typography>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowNameRow}>
          <Typography variant="bodyStrong">{info.label}</Typography>
          <View style={styles.intensityTag}>
            <View style={[styles.intensityDot, { backgroundColor: intensityColor(record.intensity) }]} />
            <Typography variant="micro" color="secondary">{intensityLabel(record.intensity)}</Typography>
          </View>
        </View>
        <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {record.duration} 分钟 · 约消耗 {record.caloriesBurned} kcal
        </Typography>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.delBtn}>
        <Icon name="trash" size={16} color={semantic.textTertiary} />
      </Pressable>
    </View>
  );
}

/* ---------------- 主页面 ---------------- */
export function ExerciseScreen() {
  const records = useExerciseStore((s) => s.records);
  const removeExercise = useExerciseStore((s) => s.removeExercise);
  const openSub = useQuickAddStore((s) => s.openSub);

  const cycleEnabled = useCycleStore((s) => s.enabled);
  const cycleRecords = useCycleStore((s) => s.records);
  const todayBody = useBodyStatusStore((s) => s.todayStatus());

  const today = todayISO();
  const cyclePhase: CyclePhase | null = cycleEnabled
    ? getCyclePhaseInfo(cycleRecords, today).phase
    : null;
  const showExerciseAdvice = cycleEnabled || !!todayBody;
  const exerciseAdvice = getExerciseAdvice(cyclePhase, todayBody);

  const {
    todayRecords,
    todayMinutes,
    todayCalories,
    week,
    weekMinutes,
    weekCalories,
    activeDays,
    dailyRatio,
    history,
  } = useMemo(() => {
    const todayRecs = records.filter((r) => r.date === today);
    const tMin = todayRecs.reduce((acc, r) => acc + r.duration, 0);
    const tCal = todayRecs.reduce((acc, r) => acc + r.caloriesBurned, 0);

    // 近 7 天（含今天）逐日分钟
    const days: WeekDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const iso = toISODate(d);
      const mins = records
        .filter((r) => r.date === iso)
        .reduce((acc, r) => acc + r.duration, 0);
      days.push({
        date: iso,
        label: WEEKDAY[d.getDay()],
        minutes: mins,
        isToday: iso === today,
      });
    }
    const wMin = days.reduce((acc, d) => acc + d.minutes, 0);
    const wCal = records
      .filter((r) => days.some((d) => d.date === r.date))
      .reduce((acc, r) => acc + r.caloriesBurned, 0);
    const aDays = days.filter((d) => d.minutes > 0).length;

    // 历史：今天以外的记录，按日期聚合，最近的在前
    const grouped = new Map<string, ExerciseRecord[]>();
    for (const r of records) {
      if (r.date === today) continue;
      const arr = grouped.get(r.date);
      if (arr) arr.push(r);
      else grouped.set(r.date, [r]);
    }
    const hist = [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
      .map(([date, list]) => ({
        date,
        list: list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }));

    return {
      todayRecords: todayRecs,
      todayMinutes: tMin,
      todayCalories: tCal,
      week: days,
      weekMinutes: wMin,
      weekCalories: wCal,
      activeDays: aDays,
      dailyRatio: Math.min(1, tMin / DAILY_GOAL_MIN),
      history: hist,
    };
  }, [records, today]);

  const goalRatio = Math.min(1, weekMinutes / WEEKLY_GOAL_MIN);
  const dateText = (() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日 · 周${WEEKDAY[d.getDay()]}`;
  })();

  return (
    <ScreenContainer scroll>
      {/* 标题 */}
      <View style={styles.titleRow}>
        <View>
          <Typography variant="h2">今日运动</Typography>
          <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {dateText}
          </Typography>
        </View>
        <Pressable onPress={() => openSub('exercise')} hitSlop={8}>
          <Typography variant="captionStrong" color="primary">＋ 记录</Typography>
        </Pressable>
      </View>

      {/* 今日概览 */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroStat}>
            <Typography variant="numberSmall" color="primary">{todayMinutes}</Typography>
            <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>今日运动时长</Typography>
          </View>
          <View style={[styles.heroStat, styles.heroDivider]}>
            <Typography variant="numberSmall" color="primaryAccent">{todayCalories}</Typography>
            <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>消耗 kcal</Typography>
          </View>
          <View style={styles.heroStat}>
            <Typography variant="numberSmall" color="primary">{todayRecords.length}</Typography>
            <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>今日次数</Typography>
          </View>
        </View>

        {/* 今日目标 */}
        <View style={styles.dailyGoal}>
          <View style={styles.goalHead}>
            <Typography variant="captionStrong" color="primary">今日目标</Typography>
            <Typography variant="captionStrong" color="primary">
              {Math.min(todayMinutes, DAILY_GOAL_MIN)} / {DAILY_GOAL_MIN} 分钟
            </Typography>
          </View>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${dailyRatio * 100}%` }]} />
          </View>
          <Typography variant="micro" color="secondary" style={{ marginTop: spacing.xs }}>
            {dailyRatio >= 1
              ? '今日目标已达成，给自己鼓个掌 🌿'
              : `再运动约 ${DAILY_GOAL_MIN - todayMinutes} 分钟就能完成今日目标`}
          </Typography>
        </View>
      </Card>

      {/* 今日建议（周期 × 身体状态 联动） */}
      {showExerciseAdvice ? (
        <Card background={semantic.primaryBg} style={{ marginTop: spacing.lg }}>
          <View style={styles.rowBetween}>
            <View style={styles.rowBaseline}>
              <Icon name="activity" size={18} color={semantic.primary} />
              <Typography variant="captionStrong" color="primary" style={{ marginLeft: 6 }}>
                今日建议
              </Typography>
            </View>
          </View>
          <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
            {exerciseAdvice}
          </Typography>
        </Card>
      ) : null}

      {/* 本周运动 */}
      <Section title="本周运动" gap={spacing.md} style={{ marginTop: spacing.md }}>
        <Card>
          <WeekBars data={week} />
          <View style={styles.weekSummary}>
            <Typography variant="caption" color="secondary">
              累计 <Typography variant="captionStrong" color="primary">{weekMinutes}</Typography> 分钟 · 消耗{' '}
              <Typography variant="captionStrong" color="primary">{weekCalories}</Typography> kcal · 活跃{' '}
              <Typography variant="captionStrong" color="primary">{activeDays}</Typography> 天
            </Typography>
          </View>
        </Card>

        {/* 周目标进度 */}
        <Card background={semantic.primaryBg}>
          <View style={styles.goalHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="activity" size={16} color={semantic.primary} />
              <Typography variant="captionStrong" color="primary" style={{ marginLeft: 6 }}>
                每周目标
              </Typography>
            </View>
            <Typography variant="captionStrong" color="primary">
              {weekMinutes} / {WEEKLY_GOAL_MIN} 分钟
            </Typography>
          </View>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${goalRatio * 100}%` }]} />
          </View>
          <Typography variant="micro" color="secondary" style={{ marginTop: spacing.xs }}>
            {goalRatio >= 1
              ? '本周目标已达成，太棒了 🌿'
              : `再运动约 ${WEEKLY_GOAL_MIN - weekMinutes} 分钟就能达标`}
          </Typography>
        </Card>
      </Section>

      {/* 今日记录 */}
      <Section
        title="今日记录"
        gap={spacing.md}
        style={{ marginTop: spacing.md }}
        action={
          todayRecords.length > 0 ? (
            <Pressable onPress={() => openSub('exercise')} hitSlop={8}>
              <Typography variant="captionStrong" color="primary">＋ 添加</Typography>
            </Pressable>
          ) : undefined
        }
      >
        {todayRecords.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="🏃"
              title="今天还没有运动记录"
              description="动一动，身体会感谢你 🌿"
              actionLabel="记录运动"
              onAction={() => openSub('exercise')}
              compact
            />
          </Card>
        ) : (
          <Card radius="large" padding={0} style={styles.listCard}>
            {todayRecords.map((r, idx) => (
              <View key={r.id}>
                {idx > 0 ? <View style={styles.divider} /> : null}
                <ExerciseRow record={r} onDelete={() => removeExercise(r.id)} />
              </View>
            ))}
          </Card>
        )}
      </Section>

      {/* 运动历史 */}
      <Section
        title="运动历史"
        gap={spacing.md}
        style={{ marginTop: spacing.md }}
      >
        {history.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Typography variant="h2" style={{ textAlign: 'center' }}>📜</Typography>
            <Typography variant="body" color="secondary" align="center" style={{ marginTop: spacing.md }}>
              还没有历史记录
            </Typography>
            <Typography variant="caption" color="tertiary" align="center" style={{ marginTop: spacing.xs }}>
              坚持运动，这里会记录你的每一步
            </Typography>
          </Card>
        ) : (
          history.map((day) => (
            <Card key={day.date} radius="large" padding={0} style={styles.listCard}>
              <View style={styles.historyHead}>
                <Typography variant="captionStrong" color="secondary">{formatHistoryDate(day.date)}</Typography>
                <Typography variant="caption" color="tertiary">
                  {day.list.reduce((a, r) => a + r.duration, 0)} 分钟
                </Typography>
              </View>
              {day.list.map((r, idx) => (
                <View key={r.id}>
                  {idx > 0 ? <View style={styles.divider} /> : null}
                  <ExerciseRow record={r} onDelete={() => removeExercise(r.id)} />
                </View>
              ))}
            </Card>
          ))
        )}
      </Section>

      {/* 推荐运动 */}
      <Section
        title="推荐运动"
        gap={spacing.md}
        style={{ marginTop: spacing.md }}
      >
        <View style={styles.recGrid}>
          {RECOMMENDED.map((rec) => {
            const info = getExerciseTypeInfo(rec.key);
            return (
              <Pressable
                key={rec.key}
                onPress={() => openSub('exercise')}
                style={({ pressed }) => [styles.recCard, pressed && styles.recCardOn]}
              >
                <View style={styles.recIcon}>
                  <Typography variant="h2">{info.emoji}</Typography>
                </View>
                <Typography variant="captionStrong" style={{ marginTop: spacing.sm }}>{rec.label}</Typography>
                <Typography variant="micro" color="tertiary" style={{ marginTop: 2 }}>
                  约 {rec.duration} 分钟
                </Typography>
                <View style={styles.recAdd}>
                  <Icon name="plus" size={14} color={semantic.surface} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* 底部记录按钮 */}
      <Button
        title="＋ 记录运动"
        variant="primary"
        fullWidth
        size="lg"
        iconLeft="footprints"
        onPress={() => openSub('exercise')}
        style={{ marginTop: spacing.lg }}
      />
    </ScreenContainer>
  );
}

export default ExerciseScreen;

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBaseline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCard: { marginBottom: 0 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroDivider: {
    borderLeftWidth: 1,
    borderLeftColor: semantic.divider,
    borderRightWidth: 1,
    borderRightColor: semantic.divider,
  },
  weekSummary: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: semantic.divider,
  },
  goalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  goalTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: semantic.surface,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: semantic.primary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.giant,
  },
  listCard: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  dailyGoal: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: semantic.divider,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: semantic.surfaceAlt,
  },
  recGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.smallCard,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  recCardOn: {
    borderColor: semantic.primary,
    backgroundColor: semantic.primaryBg,
  },
  recIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.fab,
    backgroundColor: semantic.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recAdd: {
    marginTop: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.smallCard,
    backgroundColor: semantic.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  intensityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: semantic.surfaceAlt,
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: semantic.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: semantic.divider,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTop: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: 18,
    borderRadius: radii.pill,
    backgroundColor: semantic.primary,
  },
  barLabel: { marginTop: spacing.xs },
});
