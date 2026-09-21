import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import {
  ScreenContainer,
  Typography,
  Card,
  RingProgress,
  MiniTrend,
  Icon,
} from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { useHomeSummary, useAssistantSnapshot } from '@/hooks';
import { navigate } from '@/navigation';
import { useTabStore } from '@/stores/tabStore';
import { useQuickAddStore } from '@/stores/quickAddStore';
import { useDietStore } from '@/stores/dietStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useWeightStore } from '@/stores/weightStore';
import { getExerciseTypeInfo } from '@/constants';
import { todayISO } from '@/utils/date';
import { getHomeAdvice, MOOD_LABEL, PHASE_LABEL, type CyclePhase } from '@/services/advice';
import { generateHomeBrief } from '@/services/aiAssistantService';
import type { ExerciseRecord, BodyStatusRecord } from '@/types';

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function formatSleep(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

export function HomeScreen() {
  const s = useHomeSummary();
  const setActive = useTabStore((st) => st.setActive);
  const openSub = useQuickAddStore((st) => st.openSub);

  const hasMealToday = useDietStore((st) =>
    st.records.some((r) => r.date === todayISO()),
  );
  const hasWeightToday = useWeightStore((st) =>
    st.records.some((r) => r.recordedAt.startsWith(todayISO())),
  );
  const exerciseRecords = useExerciseStore((st) => st.records);
  const exToday = useMemo(
    () => exerciseRecords.filter((r) => r.date === todayISO()),
    [exerciseRecords],
  );

  const greeting = greetingByTime();
  const title = s.nickname ? `${greeting}，${s.nickname} 👋` : `${greeting} 👋`;

  // AI 建议摘要：与 AI 助手页共用同一份真实数据快照（Task 9）
  const aiSnapshot = useAssistantSnapshot();
  const aiBrief = useMemo(() => generateHomeBrief(aiSnapshot), [aiSnapshot]);

  return (
    <ScreenContainer scroll>
      {/* 1. 顶部问候 */}
      <View style={styles.greeting}>
        <Typography variant="h2">{title}</Typography>
        <Typography variant="body" color="secondary" style={{ marginTop: 4 }}>
          今天也要好好照顾自己 🌿
        </Typography>
      </View>

      {/* 2. 今日状态 */}
      <WeightCard
        weight={s.weight}
        goal={s.goalWeight}
        change={s.change}
        last7={s.last7}
        onPress={() => navigate('WeightTrend')}
        onRecordWeight={() => openSub('weight')}
      />

      {/* 3. 今日饮食 */}
      <DietCard
        calories={s.calories}
        target={s.calTarget}
        protein={s.protein}
        carbs={s.carbs}
        fat={s.fat}
        onPress={() => setActive('Diet')}
      />

      {/* 4. 今日运动 */}
      <ExerciseCard
        records={exToday}
        minutes={s.exMinutes}
        dailyGoal={30}
        onPressStart={() => setActive('Exercise')}
        onAdd={() => openSub('exercise')}
      />

      {/* 5. AI 今日建议 */}
      <AIAdviceCard brief={aiBrief} onPress={() => navigate('AIAssistant')} />

      {/* 6. 身体状态 / 周期 */}
      <StatusOrCycleCard
        cycleEnabled={s.cycleEnabled}
        hasCycleRecords={s.hasCycleRecords}
        phase={s.phase}
        periodDay={s.periodDay}
        nextPeriodInDays={s.nextPeriodInDays}
        hasBody={s.hasBody}
        todayStatus={s.todayStatus}
        mood={s.mood}
        energy={s.energy}
        sleepHours={s.sleepHours}
        onCyclePress={() => navigate('Cycle')}
        onBodyPress={() => navigate('BodyStatus')}
      />

      {/* 7. 今日任务 */}
      <TaskList
        weightDone={hasWeightToday}
        dietDone={hasMealToday}
        exerciseDone={s.exMinutes > 0}
        bodyDone={s.hasBody}
        onWeight={() => openSub('weight')}
        onDiet={() => openSub('photo')}
        onExercise={() => setActive('Exercise')}
        onBody={() => navigate('BodyStatus')}
      />
    </ScreenContainer>
  );
}

/* ---------------- 卡片组件 ---------------- */

function WeightCard({
  weight,
  goal,
  change,
  last7,
  onPress,
  onRecordWeight,
}: {
  weight: number | null;
  goal: number | null;
  change: number | null;
  last7: number[];
  onPress: () => void;
  onRecordWeight: () => void;
}) {
  // 0 条记录：空状态 + 记录入口（不展示虚假体重）
  if (weight == null) {
    return (
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Typography variant="captionStrong" color="secondary">今日状态</Typography>
          <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Typography variant="body" color="primary">暂无体重记录</Typography>
          <Pressable onPress={onRecordWeight} hitSlop={8} style={[styles.changePill, styles.recordPill]}>
            <Icon name="plus" size={14} color={semantic.primary} />
            <Typography variant="captionStrong" color="primary" style={{ marginLeft: 4 }}>
              记录体重
            </Typography>
          </Pressable>
        </View>
      </Card>
    );
  }

  const hasTrend = change != null;
  const down = hasTrend && change <= 0;
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.rowBetween}>
        <Typography variant="captionStrong" color="secondary">今日状态</Typography>
        <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
      </View>
      <View style={styles.weightMain}>
        <View>
          <Typography variant="caption" color="secondary">当前体重</Typography>
          <View style={styles.rowBaseline}>
            <Typography variant="number" color="primary">{weight.toFixed(1)}</Typography>
            <Typography variant="caption" color="secondary" style={{ marginLeft: 4 }}>kg</Typography>
          </View>
          {goal != null ? (
            <Typography variant="caption" color="tertiary" style={{ marginTop: 2 }}>
              目标 {goal.toFixed(1)} kg
            </Typography>
          ) : null}
        </View>
        {last7.length > 0 ? (
          <View style={styles.trendBox}>
            <MiniTrend data={last7} width={150} height={56} />
          </View>
        ) : null}
      </View>
      {hasTrend ? (
        <View style={[styles.changePill, { backgroundColor: semantic.primaryBg }]}>
          <View style={{ transform: [{ scaleY: down ? -1 : 1 }] }}>
            <Icon name="trending-up" size={14} color={semantic.primary} />
          </View>
          <Typography variant="captionStrong" color="primary" style={{ marginLeft: 4 }}>
            {down ? '↓' : '↑'} {Math.abs(change).toFixed(1)} kg
          </Typography>
        </View>
      ) : (
        <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.md }}>
          记录更多后显示变化
        </Typography>
      )}
    </Card>
  );
}

function DietCard({
  calories,
  target,
  protein,
  carbs,
  fat,
  onPress,
}: {
  calories: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
  onPress: () => void;
}) {
  const progress = Math.min(1, calories / target);
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.rowBetween}>
        <Typography variant="captionStrong" color="secondary">今日饮食</Typography>
        <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
      </View>
      <View style={styles.dietBody}>
        <RingProgress progress={progress} size={108} strokeWidth={11} color={palette.pink300}>
          <Typography variant="numberSmall" color="primary">{calories}</Typography>
          <Typography variant="micro" color="tertiary">/ {target} kcal</Typography>
        </RingProgress>
        <View style={styles.macroList}>
          <MacroRow label="蛋白质" value={`${protein}g`} color={semantic.accentDiet} />
          <MacroRow label="碳水" value={`${carbs}g`} color={semantic.accentReward} />
          <MacroRow label="脂肪" value={`${fat}g`} color={semantic.primary} />
        </View>
      </View>
    </Card>
  );
}

function MacroRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Typography variant="caption" color="secondary">{label}</Typography>
      <Typography variant="captionStrong" style={{ marginLeft: 'auto' }}>{value}</Typography>
    </View>
  );
}

function ExerciseCard({
  records,
  minutes,
  dailyGoal,
  onPressStart,
  onAdd,
}: {
  records: ExerciseRecord[];
  minutes: number;
  dailyGoal: number;
  onPressStart: () => void;
  onAdd: () => void;
}) {
  const has = records.length > 0;
  const ratio = Math.min(1, minutes / dailyGoal);
  const summaryText = records
    .slice(0, 3)
    .map((r) => {
      const info = getExerciseTypeInfo(r.type);
      return `${info.emoji} ${info.label} ${r.duration}min`;
    })
    .join(' · ');
  const tail = records.length > 3 ? ` 等 ${records.length} 项` : '';

  return (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <Typography variant="captionStrong" color="secondary">今日运动</Typography>
        <Icon name="footprints" size={18} color={semantic.primary} />
      </View>
      {has ? (
        <View style={{ marginTop: spacing.md }}>
          <View style={styles.rowBaseline}>
            <Typography variant="number" color="primary">{minutes}</Typography>
            <Typography variant="caption" color="secondary" style={{ marginLeft: 6 }}>
              / {dailyGoal} 分钟
            </Typography>
          </View>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${ratio * 100}%`, backgroundColor: semantic.primary }]} />
          </View>
          <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
            <Typography
              variant="caption"
              color="secondary"
              style={{ flex: 1, marginRight: spacing.sm }}
              numberOfLines={1}
            >
              {summaryText}
              {tail}
            </Typography>
            <Pressable onPress={onPressStart} hitSlop={8}>
              <Typography variant="captionStrong" color="primary">查看 →</Typography>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: spacing.md }}>
          <Typography variant="body" color="primary">今天还没有运动记录</Typography>
          <Typography variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
            动一动，身体会感谢你 🌿
          </Typography>
          <Pressable onPress={onAdd} hitSlop={8} style={{ marginTop: spacing.sm }}>
            <Typography variant="captionStrong" color="primary">记录运动 →</Typography>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

function AIAdviceCard({ brief, onPress }: { brief: string; onPress: () => void }) {
  return (
    <Card style={[styles.card, { backgroundColor: semantic.accentAISoft }]}>
      <View style={styles.rowBetween}>
        <View style={styles.rowBaseline}>
          <Icon name="sparkles" size={18} color={semantic.accentAI} />
          <Typography variant="captionStrong" color="aiAccent" style={{ marginLeft: 6 }}>AI 今日建议</Typography>
        </View>
        <Icon name="chevron-right" size={18} color={semantic.accentAI} />
      </View>
      <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
        {brief}
      </Typography>
      <Pressable onPress={onPress} hitSlop={8} style={{ marginTop: spacing.xs }}>
        <Typography variant="captionStrong" color="aiAccent">查看 AI 助手 →</Typography>
      </Pressable>
    </Card>
  );
}

function StatusOrCycleCard({
  cycleEnabled,
  hasCycleRecords,
  phase,
  periodDay,
  nextPeriodInDays,
  hasBody,
  todayStatus,
  mood,
  energy,
  sleepHours,
  onCyclePress,
  onBodyPress,
}: {
  cycleEnabled: boolean;
  hasCycleRecords: boolean;
  phase: CyclePhase | null;
  periodDay: number | null;
  nextPeriodInDays: number | null;
  hasBody: boolean;
  todayStatus: BodyStatusRecord | null;
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  onCyclePress: () => void;
  onBodyPress: () => void;
}) {
  const ENERGY_TEXT = ['', '很低', '一般', '不错', '很好', '充沛'];
  const moodEmoji = (m?: number | null) =>
    m ? ['😞', '😐', '🙂', '😊', '🥰'][Math.max(0, Math.min(4, m - 1))] : null;

  // 开启周期：周期卡 + 今日身体状态摘要 + 简短建议
  if (cycleEnabled) {
    // 周期阶段标题：经期第 N 天 / 当前周期：经后… / 数据不足提示
    const phaseTitle =
      periodDay != null
        ? `经期第 ${periodDay} 天`
        : hasCycleRecords && phase != null
          ? `当前周期：${PHASE_LABEL[phase]}`
          : '周期管理';
    const eText = todayStatus?.energy ? ENERGY_TEXT[todayStatus.energy] : null;
    const sText = todayStatus?.sleepHours != null ? `${todayStatus.sleepHours}h` : null;
    const mText = todayStatus?.mood ? MOOD_LABEL[todayStatus.mood - 1] : null;
    // 无周期记录：引导完善，不猜测阶段
    const advice = !hasCycleRecords
      ? '完善周期记录，获得更个性化建议 🌱'
      : getHomeAdvice(phase, todayStatus);
    return (
      <Card onPress={onCyclePress} style={[styles.card, { backgroundColor: semantic.accentDietSoft }]}>
        <View style={styles.rowBetween}>
          <View style={styles.rowBaseline}>
            <Icon name="moon" size={18} color={palette.pink400} />
            <Typography variant="captionStrong" color="diet" style={{ marginLeft: 6 }}>
              {phaseTitle}
            </Typography>
          </View>
          <Icon name="chevron-right" size={18} color={palette.pink400} />
        </View>

        {todayStatus ? (
          <View style={[styles.statRow, { marginTop: spacing.sm }]}>
            {eText ? (
              <View style={styles.statChip}>
                <Typography variant="caption" color="secondary">精力</Typography>
                <Typography variant="captionStrong" color="primary" style={{ marginLeft: 4 }}>{eText}</Typography>
              </View>
            ) : null}
            {sText ? (
              <View style={styles.statChip}>
                <Icon name="moon" size={14} color={semantic.textSecondary} />
                <Typography variant="captionStrong" color="primary" style={{ marginLeft: 4 }}>{sText}</Typography>
              </View>
            ) : null}
            {mText ? (
              <View style={styles.statChip}>
                <Typography variant="caption" color="secondary">心情</Typography>
                <Typography variant="captionStrong" color="primary" style={{ marginLeft: 4 }}>{mText}</Typography>
              </View>
            ) : null}
          </View>
        ) : (
          <Typography variant="caption" color="secondary" style={{ marginTop: spacing.sm }}>
            记录今天的身体状态，建议会更贴合你 🌿
          </Typography>
        )}

        <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
          {advice}
        </Typography>
      </Card>
    );
  }

  // 未开启周期：展示身体状态（无记录时引导，不展示虚假数据）
  if (!hasBody) {
    return (
      <Card onPress={onBodyPress} style={styles.card}>
        <View style={styles.rowBetween}>
          <Typography variant="captionStrong" color="secondary">今日身体状态</Typography>
          <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
        </View>
        <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
          今天还没有记录身体状态
        </Typography>
        <Typography variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
          告诉我今天感觉怎么样 🌿
        </Typography>
      </Card>
    );
  }

  const eText = energy != null ? ENERGY_TEXT[energy] : null;
  const sleepText = sleepHours != null ? formatSleep(sleepHours) : null;
  const emoji = moodEmoji(mood);
  return (
    <Card onPress={onBodyPress} style={styles.card}>
      <View style={styles.rowBetween}>
        <Typography variant="captionStrong" color="secondary">今日身体状态</Typography>
        <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
      </View>
      <View style={[styles.rowBaseline, { marginTop: spacing.sm }]}>
        <Typography variant="body" color="primary">
          {mood != null ? `${emoji} 心情${MOOD_LABEL[mood - 1]}` : '心情 —'} · 精力{eText ?? '—'}
        </Typography>
        <View style={[styles.rowBaseline, { marginLeft: 'auto' }]}>
          <Icon name="moon" size={16} color={semantic.textSecondary} />
          <Typography variant="caption" color="secondary" style={{ marginLeft: 4 }}>
            睡眠 {sleepText ?? '—'}
          </Typography>
        </View>
      </View>
    </Card>
  );
}

function TaskList({
  weightDone,
  dietDone,
  exerciseDone,
  bodyDone,
  onWeight,
  onDiet,
  onExercise,
  onBody,
}: {
  weightDone: boolean;
  dietDone: boolean;
  exerciseDone: boolean;
  bodyDone: boolean;
  onWeight: () => void;
  onDiet: () => void;
  onExercise: () => void;
  onBody: () => void;
}) {
  const tasks = [
    { key: 'weight', label: '记录体重', done: weightDone, onPress: onWeight },
    { key: 'diet', label: '记录饮食', done: dietDone, onPress: onDiet },
    { key: 'exercise', label: '完成运动', done: exerciseDone, onPress: onExercise },
    { key: 'body', label: '记录身体状态', done: bodyDone, onPress: onBody },
  ];
  return (
    <Card style={styles.card}>
      <Typography variant="captionStrong" color="secondary">今日任务</Typography>
      <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
        {tasks.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => !t.done && t.onPress()}
            hitSlop={6}
            style={({ pressed }) => [{ opacity: pressed && !t.done ? 0.7 : 1 }]}
          >
            <View style={styles.taskRow}>
              <View style={[styles.check, t.done ? styles.checkOn : null]}>
                {t.done ? <Icon name="check" size={14} color={semantic.surface} strokeWidth={3} /> : null}
              </View>
              <Typography
                variant="body"
                color={t.done ? 'tertiary' : 'primary'}
                style={t.done ? styles.taskDone : null}
              >
                {t.label}
              </Typography>
            </View>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

export default HomeScreen;

/* ---------------- 样式 ---------------- */

const styles = StyleSheet.create({
  greeting: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
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
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.accentDietSoft,
    borderWidth: 1,
    borderColor: palette.pink100,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  weightMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  trendBox: {
    backgroundColor: semantic.primaryBg,
    borderRadius: radii.smallCard,
    padding: spacing.xs,
  },
  changePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  recordPill: {
    backgroundColor: semantic.primaryBg,
  },
  dietBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  macroList: {
    flex: 1,
    marginLeft: spacing.lg,
    gap: spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  track: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: semantic.primaryBg,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: semantic.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkOn: {
    backgroundColor: semantic.primary,
    borderColor: semantic.primary,
  },
  taskDone: {
    textDecorationLine: 'line-through',
  },
});
