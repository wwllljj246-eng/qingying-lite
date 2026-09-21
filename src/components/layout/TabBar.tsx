import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { Icon, IconName } from '../icons';
import { Typography } from '../common/Typography';

export interface TabBarItem {
  key: string;
  label: string;
  icon: IconName;
}

export interface TabBarProps {
  tabs: TabBarItem[];
  activeKey: string;
  onChange: (key: string) => void;
  onPlusPress?: () => void;
}

/**
 * 自定义底部 TabBar
 * 严格 5 个：Home ｜ Diet ｜ [＋] ｜ Exercise ｜ Profile
 * 中间 ＋ 用浮起圆形按钮，触发 Modal 快速记录
 */
export function TabBar({ tabs, activeKey, onChange, onPlusPress }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);

  // 4 个普通 tab（去掉中间的 +）
  const left = tabs.slice(0, 2);
  const right = tabs.slice(3);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingBottom: bottom }]}
    >
      <View style={styles.bar}>
        {left.map((t) => (
          <TabItem
            key={t.key}
            item={t}
            active={t.key === activeKey}
            onPress={() => onChange(t.key)}
          />
        ))}

        {/* 中间 ＋ 占位 */}
        <View style={styles.fabSlot}>
          <Pressable
            onPress={onPlusPress}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <Icon name="plus" size={28} color={semantic.surface} strokeWidth={2.5} />
          </Pressable>
        </View>

        {right.map((t) => (
          <TabItem
            key={t.key}
            item={t}
            active={t.key === activeKey}
            onPress={() => onChange(t.key)}
          />
        ))}
      </View>
    </View>
  );
}

interface TabItemProps {
  item: TabBarItem;
  active: boolean;
  onPress: () => void;
}

function TabItem({ item, active, onPress }: TabItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
    >
      <Icon
        name={item.icon}
        size={22}
        color={active ? semantic.primary : semantic.textTertiary}
        strokeWidth={active ? 2.4 : 2}
      />
      <Typography
        variant="micro"
        style={{ color: active ? semantic.primary : semantic.textTertiary, marginTop: 2 }}
      >
        {item.label}
      </Typography>
    </Pressable>
  );
}

const BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // 高于页面层（MainTabs 中页面 zIndex: 1），避免 Web / 原生被页面内容盖住
    zIndex: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: semantic.surface,
    borderRadius: radii.largeCard,
    height: BAR_HEIGHT,
    paddingHorizontal: spacing.md,
    ...shadows.large,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: palette.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  fabSlot: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.fab,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    ...shadows.fab,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
});

export default TabBar;