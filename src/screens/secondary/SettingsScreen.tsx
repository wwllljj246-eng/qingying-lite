import React from 'react';
import { View, Pressable, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, Header, Section, Card, Typography, Icon } from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { useCycleStore } from '@/stores/cycleStore';
import { useUserStore } from '@/stores/userStore';
import { navigate } from '@/navigation';

export function SettingsScreen() {
  const navigation = useNavigation();
  const user = useUserStore((s) => s.user);
  const enabled = useCycleStore((s) => s.enabled);
  const setEnabled = useCycleStore((s) => s.setEnabled);

  return (
    <ScreenContainer scroll>
      <Header title="设置" onLeftPress={() => navigation.goBack()} />
      <Section gap={spacing.lg}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[styles.avatar, { backgroundColor: semantic.primaryBg }]}>
              <Icon name="user" size={24} color={semantic.primary} />
            </View>
            <View>
              <Typography variant="h3">{user?.name ?? '轻盈用户'}</Typography>
              <Typography variant="caption" color="secondary">
                目标 {user?.goalWeight ? `${user.goalWeight} kg` : '未设置'}
              </Typography>
            </View>
          </View>
        </Card>

        <Card>
          <Pressable
            style={styles.row}
            hitSlop={6}
            onPress={() => navigate('WeightTrend')}
          >
            <View style={styles.rowLeft}>
              <Icon name="scale" size={20} color={semantic.primary} />
              <Typography variant="body" style={{ marginLeft: spacing.md }}>体重趋势</Typography>
            </View>
            <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} hitSlop={6} onPress={() => navigate('WeeklyReport')}>
            <View style={styles.rowLeft}>
              <Icon name="calendar" size={20} color={semantic.primary} />
              <Typography variant="body" style={{ marginLeft: spacing.md }}>周报告</Typography>
            </View>
            <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} hitSlop={6} onPress={() => navigate('Cycle')}>
            <View style={styles.rowLeft}>
              <Icon name="moon" size={20} color={palette.pink400} />
              <Typography variant="body" style={{ marginLeft: spacing.md }}>周期管理</Typography>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: semantic.border, true: semantic.accentDiet }}
              thumbColor={palette.surface}
            />
          </Pressable>
        </Card>

        <Card>
          <Typography variant="caption" color="tertiary">
            轻盈 Lite · 你的身体，慢慢来 🌿
          </Typography>
        </Card>
      </Section>
    </ScreenContainer>
  );
}

const styles = {
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  divider: {
    height: 1,
    backgroundColor: semantic.border,
  },
};

export default SettingsScreen;
