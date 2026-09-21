import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, Header, Section, Card, Typography, Button, ModalSheet } from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { useCycleStore } from '@/stores/cycleStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { todayISO, diffDays } from '@/utils/date';
import { getCycleBodySummary, ENERGY_LABEL, MOOD_LABEL, FATIGUE_LABEL } from '@/services/advice';

export function CycleScreen() {
  const navigation = useNavigation();
  const enabled = useCycleStore((s) => s.enabled);
  const records = useCycleStore((s) => s.records);
  const setEnabled = useCycleStore((s) => s.setEnabled);
  const startPeriod = useCycleStore((s) => s.startPeriod);
  const endPeriod = useCycleStore((s) => s.endPeriod);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const bodyRecords = useBodyStatusStore((s) => s.records);

  const latest = records.length
    ? [...records].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
    : null;
  const today = todayISO();
  // 当前「进行中」= 存在记录且没有结束日期；一旦写入结束日期即视为已结束
  const inPeriod = !!latest && !latest.endDate;
  const periodDay = inPeriod ? diffDays(today, latest!.startDate) + 1 : null;

  if (!enabled) {
    return (
      <ScreenContainer scroll>
        <Header title="周期管理" onLeftPress={() => navigation.goBack()} />
        <Section gap={spacing.lg}>
          <Card background={semantic.accentDietSoft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Typography variant="h3" color="diet">🌙 周期管理</Typography>
            </View>
            <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
              开启后，首页会显示经期提醒，并给你温和的运动与休息建议。这是一个可选功能，关闭后不会出现在首页。
            </Typography>
          </Card>
          <Button title="开启周期管理" variant="diet" fullWidth iconLeft="moon" onPress={() => setEnabled(true)} />
          <Typography variant="micro" color="tertiary" align="center">
            我们不会用绝对化的医学结论给你压力，只做温柔的提醒。
          </Typography>
        </Section>
      </ScreenContainer>
    );
  }

  const confirmEnd = () => {
    if (!latest) return;
    endPeriod(latest.id, today);
    setConfirmVisible(false);
  };

  const bodySummary = getCycleBodySummary(bodyRecords, today);

  return (
    <ScreenContainer scroll>
      <Header title="周期管理" onLeftPress={() => navigation.goBack()} />
      <Section gap={spacing.lg}>
        <Card background={semantic.accentDietSoft}>
          {inPeriod ? (
            <>
              <Typography variant="h3" color="diet">经期第 {periodDay} 天</Typography>
              <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
                今天可以适当调整运动强度，关注休息和身体感受。
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h3" color="diet">周期记录</Typography>
              <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
                当前不在经期。保持规律作息，留意身体变化即可。
              </Typography>
            </>
          )}
        </Card>

        <Card>
          <Typography variant="captionStrong" color="secondary">最近记录</Typography>
          {latest ? (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <Typography variant="caption" color="tertiary">开始于 {latest.startDate}</Typography>
              {latest.endDate ? (
                <>
                  <Typography variant="caption" color="tertiary">结束于 {latest.endDate}</Typography>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
                    <View style={styles.doneDot} />
                    <Typography variant="captionStrong" color="secondary">已结束</Typography>
                    {latest.periodLength ? (
                      <Typography variant="caption" color="tertiary">· 共 {latest.periodLength} 天</Typography>
                    ) : null}
                  </View>
                </>
              ) : (
                <Typography variant="caption" color="tertiary">进行中</Typography>
              )}
            </View>
          ) : (
            <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.sm }}>
              还没有周期记录，点击下方按钮开始。
            </Typography>
          )}
        </Card>

        <Card>
          <Typography variant="captionStrong" color="secondary">近期身体状态</Typography>
          {bodySummary.count < 3 ? (
            <Typography variant="body" color="secondary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
              记录更多身体状态后，可以看到更完整的变化。
            </Typography>
          ) : (
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              <CycleStat
                label="平均精力"
                value={bodySummary.avgEnergy != null ? ENERGY_LABEL[Math.round(bodySummary.avgEnergy) - 1] : '—'}
              />
              <CycleStat
                label="平均睡眠"
                value={bodySummary.avgSleep != null ? `${bodySummary.avgSleep.toFixed(1)}h` : '—'}
              />
              <CycleStat
                label="心情变化"
                value={
                  bodySummary.avgMood != null
                    ? `${MOOD_LABEL[Math.round(bodySummary.avgMood) - 1]}${
                        bodySummary.moodTrend === 'up' ? ' ↑' : bodySummary.moodTrend === 'down' ? ' ↓' : ''
                      }`
                    : '—'
                }
              />
              <CycleStat
                label="疲劳情况"
                value={bodySummary.fatigue ? FATIGUE_LABEL[bodySummary.fatigue] : '—'}
              />
            </View>
          )}
        </Card>

        <Button
          title={inPeriod ? '结束本次经期' : latest?.endDate ? '开始记录下一周期' : '记录本次经期开始'}
          variant="diet"
          fullWidth
          iconLeft="calendar"
          onPress={() => (inPeriod ? setConfirmVisible(true) : startPeriod(today))}
        />
      </Section>

      {/* 结束确认弹窗：仅在点击「结束本次经期」后挂载，避免常驻覆盖页面 */}
      {confirmVisible && (
        <ModalSheet title="确定结束本次周期吗？" onDismiss={() => setConfirmVisible(false)} snapPoints={['40%']}>
          <Typography variant="body" color="secondary">
            将以今天（{today}）作为本次经期的结束日期，结束后可随时开始记录下一周期。
          </Typography>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button title="取消" variant="secondary" fullWidth onPress={() => setConfirmVisible(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="确认结束" variant="diet" fullWidth onPress={confirmEnd} />
            </View>
          </View>
        </ModalSheet>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  doneDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: palette.pink400,
  },
  cycleStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
});

function CycleStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cycleStatRow}>
      <Typography variant="caption" color="secondary">{label}</Typography>
      <Typography variant="captionStrong" color="primary">{value}</Typography>
    </View>
  );
}

export default CycleScreen;
