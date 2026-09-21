import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MAIN_TABS } from './tabs';
import { TabBar } from '@/components';
import { useTabStore, type MainTabKey } from '@/stores/tabStore';
import {
  HomeScreen,
  DietScreen,
  ExerciseScreen,
  ProfileScreen,
} from '@/screens/screens';

/**
 * 主 Tab 容器：自渲染 4 个页面 + 自定义 TabBar
 * 「＋」作为 FAB 触发 QuickAdd Sheet（由 RootNavigator 内的 quickAddStore 控制）
 *
 * 激活态来自 tabStore，便于任意页面切换 Tab（如首页「开始运动」）
 */
export interface MainTabsProps {
  onPlusPress: () => void;
}

export function MainTabs({ onPlusPress }: MainTabsProps) {
  const active = useTabStore((s) => s.active);
  const setActive = useTabStore((s) => s.setActive);

  return (
    <View style={styles.container}>
      <View
        style={[styles.page, active === 'Home' ? styles.visible : styles.hidden]}
        pointerEvents={active === 'Home' ? 'auto' : 'none'}
      >
        <HomeScreen />
      </View>
      <View
        style={[styles.page, active === 'Diet' ? styles.visible : styles.hidden]}
        pointerEvents={active === 'Diet' ? 'auto' : 'none'}
      >
        <DietScreen />
      </View>
      <View
        style={[styles.page, active === 'Exercise' ? styles.visible : styles.hidden]}
        pointerEvents={active === 'Exercise' ? 'auto' : 'none'}
      >
        <ExerciseScreen />
      </View>
      <View
        style={[styles.page, active === 'Profile' ? styles.visible : styles.hidden]}
        pointerEvents={active === 'Profile' ? 'auto' : 'none'}
      >
        <ProfileScreen />
      </View>

      <TabBar
        tabs={MAIN_TABS}
        activeKey={active}
        onChange={(k) => {
          if (k === 'QuickAdd') {
            onPlusPress();
            return;
          }
          setActive(k as MainTabKey);
        }}
        onPlusPress={onPlusPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFFFA' },
  page: { ...StyleSheet.absoluteFillObject },
  visible: { opacity: 1, zIndex: 1 },
  hidden: { opacity: 0, zIndex: 0 },
});

export default MainTabs;
