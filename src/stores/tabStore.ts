/**
 * tabStore — 底部主 Tab 的当前激活态
 * 抽离自 MainTabs 局部 state，使任意页面（如首页「开始运动」）可切换 Tab
 */

import { create } from 'zustand';

export type MainTabKey = 'Home' | 'Diet' | 'Exercise' | 'Profile';

interface TabState {
  active: MainTabKey;
  setActive: (tab: MainTabKey) => void;
}

export const useTabStore = create<TabState>((set) => ({
  active: 'Home',
  setActive: (tab) => set({ active: tab }),
}));

export default useTabStore;
