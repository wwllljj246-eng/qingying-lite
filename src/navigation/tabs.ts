import type { TabBarItem } from '@/components';
import type { MainTabParamList } from '@/types';

/**
 * 底部 5 个 Tab 的固定配置
 * 顺序：首页｜饮食｜＋｜运动｜我的
 * 「＋」作为 FAB 触发 QuickAdd Sheet，不在 tabs 中绑定路由
 */
export const MAIN_TABS: TabBarItem[] = [
  { key: 'Home', label: '首页', icon: 'home' },
  { key: 'Diet', label: '饮食', icon: 'utensils' },
  { key: 'QuickAdd', label: '', icon: 'plus' }, // 占位，实际由 FAB 触发
  { key: 'Exercise', label: '运动', icon: 'footprints' },
  { key: 'Profile', label: '我的', icon: 'user' },
] as const;

export const MAIN_TAB_KEYS: MainTabParamList = {
  Home: undefined,
  Diet: undefined,
  QuickAdd: undefined,
  Exercise: undefined,
  Profile: undefined,
};