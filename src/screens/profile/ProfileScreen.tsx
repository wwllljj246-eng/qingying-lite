import React from 'react';
import { View, Pressable } from 'react-native';
import { ScreenContainer, Section, Card, Typography, Icon } from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { useUserStore } from '@/stores/userStore';
import { useCycleStore } from '@/stores/cycleStore';
import { navigate } from '@/navigation';

export function ProfileScreen() {
  const user = useUserStore((s) => s.user);
  const cycleEnabled = useCycleStore((s) => s.enabled);

  const menu: Array<{ key: string; label: string; icon: any; color: string; onPress: () => void }> = [
    { key: 'weight', label: '体重趋势', icon: 'scale', color: semantic.primary, onPress: () => navigate('WeightTrend') },
    { key: 'analysis', label: '数据分析', icon: 'trending-up', color: semantic.primary, onPress: () => navigate('DataAnalysis') },
    { key: 'weekly', label: '周报告', icon: 'calendar', color: semantic.primary, onPress: () => navigate('WeeklyReport') },
    { key: 'ai', label: 'AI 助手', icon: 'sparkles', color: semantic.accentAI, onPress: () => navigate('AIAssistant') },
    { key: 'body', label: '身体状态', icon: 'heart', color: semantic.primary, onPress: () => navigate('BodyStatus') },
    { key: 'cycle', label: '周期管理', icon: 'moon', color: palette.pink400, onPress: () => navigate('Cycle') },
    { key: 'settings', label: '设置', icon: 'settings', color: semantic.textSecondary, onPress: () => navigate('Settings') },
  ];

  return (
    <ScreenContainer scroll>
      <Section gap={spacing.lg}>
        <Card onPress={() => navigate('ProfileEdit')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={[styles.avatar, { backgroundColor: semantic.primaryBg }]}>
              <Icon name="user" size={26} color={semantic.primary} />
            </View>
            <View>
              <Typography variant="h2">{user?.name ?? '轻盈用户'}</Typography>
              <Typography variant="caption" color="secondary">
                {[
                  user?.age != null ? `${user.age} 岁` : null,
                  user?.goalWeight ? `目标 ${user.goalWeight} kg` : null,
                  cycleEnabled ? '已开启周期' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '点击设置昵称与年龄'}
              </Typography>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
            </View>
          </View>
        </Card>

        <Card>
          {menu.map((m, i) => (
            <View key={m.key}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                onPress={m.onPress}
                hitSlop={6}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={styles.row}>
                  <Icon name={m.icon} size={20} color={m.color} />
                  <Typography variant="body" style={{ marginLeft: spacing.md }}>{m.label}</Typography>
                  <View style={{ marginLeft: 'auto' }}>
                    <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
                  </View>
                </View>
              </Pressable>
            </View>
          ))}
        </Card>

        <Typography variant="micro" color="tertiary" align="center">
          轻盈 Lite · 你的身体，慢慢来 🌿
        </Typography>
      </Section>
    </ScreenContainer>
  );
}

const styles = {
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: semantic.border,
  },
};

export default ProfileScreen;
