import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ScreenContainer,
  Header,
  Section,
  Card,
  Typography,
  Button,
  Icon,
  EmptyState,
} from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { useCycleStore } from '@/stores/cycleStore';
import { useQuickAddStore } from '@/stores/quickAddStore';
import { todayISO, toISODate, addDays } from '@/utils/date';
import { getCyclePhaseInfo, PHASE_LABEL, type CyclePhase } from '@/services/advice';
import type { BodyStatusRecord, Level3, Severity, Appetite, PeriodFlow } from '@/types';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

const ENERGY_EMOJI = ['😴', '😐', '🙂', '😊', '⚡'];
const MOOD_EMOJI = ['😞', '😐', '🙂', '😊', '🥰'];
const ENERGY_LABEL = ['很低', '一般', '不错', '很好', '充沛'];
const MOOD_LABEL = ['差', '一般', '还行', '不错', '超好'];

const FATIGUE_LABEL: Record<Level3, string> = { low: '低', medium: '中', high: '高' };
const SORENESS_LABEL: Record<Severity, string> = { none: '无', mild: '轻微', obvious: '明显' };
const APPETITE_LABEL: Record<Appetite, string> = { low: '低', normal: '正常', strong: '较强' };
const PERIOD_LABEL: Record<PeriodFlow, string> = { light: '量少', medium: '量中', heavy: '量多' };

type DayCol = { date: string; weekday: string; record?: BodyStatusRecord };

/* ---------------- 趋势条（自绘，无第三方图表库） ---------------- */
const BAR_MAX = 72;
function TrendBars({
  days,
  max,
  getEmoji,
  getValue,
  getSub,
}: {
  days: DayCol[];
  max: number;
  getEmoji: (r: BodyStatusRecord) => string;
  getValue: (r: BodyStatusRecord) => number;
  getSub: (r: BodyStatusRecord) => string;
}) {
  return (
    <View style={styles.trendRow}>
      {days.map((d) => {
        const has = !!d.record;
        const v = has ? getValue(d.record!) : 0;
        const filled = has && v > 0;
        const h = filled ? Math.max(8, (v / max) * BAR_MAX) : 4;
        return (
          <View key={d.date} style={styles.trendCol}>
            <View style={styles.trendTop}>
              {has ? (
                <Typography variant="body">{getEmoji(d.record!)}</Typography>
              ) : (
                <Typography variant="micro" color="tertiary">
                  ·
                </Typography>
              )}
            </View>
            <View style={styles.trendTrack}>
              <View
                style={[
                  styles.trendFill,
                  { height: h, backgroundColor: filled ? semantic.primary : semantic.primarySoft },
                ]}
              />
            </View>
            <Typography variant="micro" color={has ? 'secondary' : 'tertiary'} style={styles.trendLabel}>
              {d.weekday}
            </Typography>
            {filled ? (
              <Typography variant="micro" color="tertiary" style={styles.trendSub}>
                {getSub(d.record!)}
              </Typography>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/* ---------------- 今日状态行 ---------------- */
function TodayLine({ emoji, text }: { emoji?: string; text: string }) {
  return (
    <View style={styles.todayLine}>
      {emoji ? (
        <Typography variant="h3" style={{ marginRight: spacing.sm }}>
          {emoji}
        </Typography>
      ) : null}
      <Typography variant="body" color="primary">
        {text}
      </Typography>
    </View>
  );
}

/* ---------------- 身体感受行 ---------------- */
function FeelRow({ label, value }: { label: string; value: string }) {
  const muted = value === '未记录';
  return (
    <View style={styles.feelRow}>
      <Typography variant="body" color="secondary">
        {label}
      </Typography>
      <View style={[styles.feelPill, muted ? styles.feelPillMuted : null]}>
        <Typography variant="captionStrong" color={muted ? 'tertiary' : 'primary'}>
          {value}
        </Typography>
      </View>
    </View>
  );
}

/* ---------------- 主页面 ---------------- */
export function BodyStatusScreen() {
  const navigation = useNavigation();
  const records = useBodyStatusStore((s) => s.records);
  const openSub = useQuickAddStore((s) => s.openSub);
  const cycleEnabled = useCycleStore((s) => s.enabled);
  const cycleRecords = useCycleStore((s) => s.records);

  const today = todayISO();

  const { last7, todayRecord, periodDay, cyclePhase } = useMemo(() => {
    const map = new Map<string, BodyStatusRecord>();
    for (const r of records) map.set(r.date, r);

    const arr: DayCol[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = addDays(new Date(), -i);
      const iso = toISODate(dt);
      arr.push({ date: iso, weekday: WEEKDAY[dt.getDay()], record: map.get(iso) });
    }

    const tRec = map.get(today) ?? null;

    let pDay: number | null = null;
    let phase: CyclePhase | null = null;
    if (cycleEnabled && cycleRecords.length > 0) {
      const info = getCyclePhaseInfo(cycleRecords, today);
      phase = info.phase;
      if (info.phase === 'period' && info.periodDay != null) {
        pDay = info.periodDay;
      }
    }
    return { last7: arr, todayRecord: tRec, periodDay: pDay, cyclePhase: phase };
  }, [records, cycleEnabled, cycleRecords, today]);

  const openSheet = () => openSub('bodyStatus');

  return (
    <ScreenContainer scroll>
      <Header title="身体状态" onLeftPress={() => navigation.goBack()} />

      {/* 周期联动（仅开启周期管理时显示） */}
      {cycleEnabled ? (
        <Card background={semantic.accentDietSoft} style={{ marginBottom: spacing.md }}>
          <View style={styles.cycleHead}>
            <Icon name="moon" size={18} color={palette.pink400} />
            <Typography variant="captionStrong" color="diet" style={{ marginLeft: 6 }}>
              {periodDay != null
                ? `经期第 ${periodDay} 天`
                : cyclePhase != null
                  ? `当前周期：${PHASE_LABEL[cyclePhase]}`
                  : '周期管理'}
            </Typography>
          </View>

          {cycleRecords.length === 0 ? (
            <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
              完善周期记录，获得更个性化建议 🌱
            </Typography>
          ) : todayRecord ? (
            <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
              今天的身体状态：精力 {todayRecord.energy ? ENERGY_LABEL[todayRecord.energy - 1] : '未记录'}
              {' · '}睡眠 {todayRecord.sleepHours != null ? `${todayRecord.sleepHours}h` : '未记录'}
              {' · '}心情 {todayRecord.mood ? MOOD_LABEL[todayRecord.mood - 1] : '未记录'}
            </Typography>
          ) : (
            <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
              记录今天的身体状态，可以更好地了解自己的周期与身体状态。
            </Typography>
          )}

          {/* 经期：本周期状态（腹部不适 + 经量，均来自真实记录） */}
          {periodDay != null && todayRecord ? (
            <Typography variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
              本周期状态：腹部不适 {todayRecord.discomfort ? SORENESS_LABEL[todayRecord.discomfort] : '未记录'}
              {todayRecord.periodFlow ? ` · 经量 ${PERIOD_LABEL[todayRecord.periodFlow]}` : ''}
            </Typography>
          ) : null}

          <Typography variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
            这些记录会帮助你更好地了解自己的周期与身体状态。
          </Typography>
        </Card>
      ) : null}

      {/* 今日状态 */}
      <Section title="今日状态" gap={spacing.md} style={{ marginTop: spacing.md }}>
        {todayRecord ? (
          <Card>
            <TodayLine
              emoji={todayRecord.energy ? ENERGY_EMOJI[todayRecord.energy - 1] : undefined}
              text={`精力${todayRecord.energy ? ENERGY_LABEL[todayRecord.energy - 1] : '未记录'}`}
            />
            <View style={styles.divider} />
            <TodayLine
              text={`睡眠 ${todayRecord.sleepHours != null ? `${todayRecord.sleepHours}h` : '未记录'}`}
            />
            <View style={styles.divider} />
            <TodayLine
              emoji={todayRecord.mood ? MOOD_EMOJI[todayRecord.mood - 1] : undefined}
              text={`心情${todayRecord.mood ? MOOD_LABEL[todayRecord.mood - 1] : '未记录'}`}
            />
            <Button
              title="编辑今日状态"
              variant="secondary"
              fullWidth
              style={{ marginTop: spacing.lg }}
              onPress={openSheet}
            />
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="🌿"
              title="今天还没有记录身体状态"
              description="花 10 秒记录一下，照顾好自己"
              actionLabel="记录今日状态"
              onAction={openSheet}
              compact
            />
          </Card>
        )}
      </Section>

      {/* 最近 7 天 */}
      <Section title="最近 7 天" gap={spacing.md} style={{ marginTop: spacing.md }}>
        <Card>
          <Typography variant="captionStrong" color="secondary">
            精力
          </Typography>
          <View style={{ marginTop: spacing.md }}>
            <TrendBars
              days={last7}
              max={5}
              getEmoji={(r) => (r.energy ? ENERGY_EMOJI[r.energy - 1] : '🙂')}
              getValue={(r) => r.energy ?? 0}
              getSub={(r) => (r.energy ? ENERGY_LABEL[r.energy - 1] : '')}
            />
          </View>
        </Card>
        <Card>
          <Typography variant="captionStrong" color="secondary">
            睡眠
          </Typography>
          <View style={{ marginTop: spacing.md }}>
            <TrendBars
              days={last7}
              max={10}
              getEmoji={() => '🌙'}
              getValue={(r) => r.sleepHours ?? 0}
              getSub={(r) => (r.sleepHours != null ? `${r.sleepHours}h` : '')}
            />
          </View>
        </Card>
        <Card>
          <Typography variant="captionStrong" color="secondary">
            心情
          </Typography>
          <View style={{ marginTop: spacing.md }}>
            <TrendBars
              days={last7}
              max={5}
              getEmoji={(r) => (r.mood ? MOOD_EMOJI[r.mood - 1] : '🙂')}
              getValue={(r) => r.mood ?? 0}
              getSub={(r) => (r.mood ? MOOD_LABEL[r.mood - 1] : '')}
            />
          </View>
        </Card>
      </Section>

      {/* 身体感受 */}
      <Section title="身体感受" gap={spacing.md} style={{ marginTop: spacing.md }}>
        <Card>
          {todayRecord ? (
            <View style={{ gap: spacing.sm }}>
              <FeelRow
                label="疲劳"
                value={todayRecord.fatigue ? FATIGUE_LABEL[todayRecord.fatigue] : '未记录'}
              />
              <FeelRow
                label="肌肉酸痛"
                value={todayRecord.muscleSoreness ? SORENESS_LABEL[todayRecord.muscleSoreness] : '未记录'}
              />
              <FeelRow
                label="食欲"
                value={todayRecord.appetite ? APPETITE_LABEL[todayRecord.appetite] : '未记录'}
              />
              <FeelRow
                label="身体不适"
                value={todayRecord.discomfort ? SORENESS_LABEL[todayRecord.discomfort] : '未记录'}
              />
            </View>
          ) : (
            <Typography variant="body" color="secondary" align="center" style={{ paddingVertical: spacing.md }}>
              暂无记录
            </Typography>
          )}
        </Card>
      </Section>
    </ScreenContainer>
  );
}

export default BodyStatusScreen;

const styles = StyleSheet.create({
  cycleHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: semantic.divider,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.giant,
  },
  feelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  feelPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: semantic.primaryBg,
  },
  feelPillMuted: {
    backgroundColor: semantic.surfaceAlt,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
  },
  trendTop: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTrack: {
    width: '100%',
    height: BAR_MAX,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendFill: {
    width: 16,
    borderRadius: radii.pill,
    backgroundColor: semantic.primary,
  },
  trendLabel: { marginTop: spacing.xs },
  trendSub: { marginTop: 1 },
  trendEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
