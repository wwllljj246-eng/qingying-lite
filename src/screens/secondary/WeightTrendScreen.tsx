import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, Header, Section, Card, Typography, Button, MiniTrend } from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useWeightStore } from '@/stores/weightStore';
import { useUserStore } from '@/stores/userStore';
import { useQuickAddStore } from '@/stores/quickAddStore';

export function WeightTrendScreen() {
  const navigation = useNavigation();
  const records = useWeightStore((s) => s.records);
  const goalWeight = useUserStore((s) => s.user?.goalWeight ?? null);
  const openSub = useQuickAddStore((s) => s.openSub);

  const { last7, latest, change } = useMemo(() => {
    const sorted = [...records].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const last = sorted.slice(-7).map((r) => r.weight);
    // 无记录时返回 null，禁止使用任何硬编码占位体重
    const latestW = sorted.length ? sorted[sorted.length - 1].weight : null;
    // 变化：仅当 ≥2 条记录才有意义；不足时为 null（UI 展示 —）
    const change =
      sorted.length >= 2
        ? +(sorted[sorted.length - 1].weight - sorted[sorted.length - 2].weight).toFixed(2)
        : null;
    return { last7: last, latest: latestW, change };
  }, [records]);

  return (
    <ScreenContainer scroll>
      <Header title="体重趋势" onLeftPress={() => navigation.goBack()} />
      <Section gap={spacing.lg}>
        <Card>
          <Typography variant="captionStrong" color="secondary">近 7 次记录</Typography>
          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <MiniTrend data={last7} width={300} height={120} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.lg }}>
            <Stat label="当前" value={latest != null ? `${latest.toFixed(1)}kg` : '—'} />
            <Stat label="目标" value={goalWeight != null ? `${goalWeight.toFixed(1)}kg` : '未设置'} color={semantic.primary} />
            <Stat label="变化" value={change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}kg` : '—'} />
          </View>
        </Card>

        <Card>
          <Typography variant="captionStrong" color="secondary">记录</Typography>
          {records.length === 0 ? (
            <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.sm }}>
              还没有体重记录，点击下方按钮记录第一次吧。
            </Typography>
          ) : (
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              {[...records]
                .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
                .slice(0, 8)
                .map((r) => (
                  <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="secondary">
                      {r.recordedAt.slice(0, 10)}
                    </Typography>
                    <Typography variant="captionStrong">{r.weight.toFixed(1)} kg</Typography>
                  </View>
                ))}
            </View>
          )}
        </Card>

        <Button
          title="记录体重"
          variant="primary"
          fullWidth
          iconLeft="scale"
          onPress={() => openSub('weight')}
        />
      </Section>
    </ScreenContainer>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Typography variant="caption" color="tertiary">{label}</Typography>
      <Typography variant="h3" color={color ? 'primary' : 'primary'} style={{ marginTop: 2 }}>
        {value}
      </Typography>
    </View>
  );
}

export default WeightTrendScreen;
