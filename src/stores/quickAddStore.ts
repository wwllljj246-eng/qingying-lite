/**
 * quickAddStore — 快速记录（＋ 弹层）的全局控制
 * 抽离自 RootNavigator 局部 state，使任意页面可触发打开对应子记录层
 */

import { create } from 'zustand';

export type QuickAddSubType = 'photo' | 'weight' | 'water' | 'bodyStatus' | 'exercise';

interface QuickAddState {
  mainVisible: boolean;
  subType: QuickAddSubType | null;
  openMain: () => void;
  closeMain: () => void;
  openSub: (type: QuickAddSubType) => void;
  closeSub: () => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  mainVisible: false,
  subType: null,
  openMain: () => set({ mainVisible: true, subType: null }),
  closeMain: () => set({ mainVisible: false }),
  openSub: (type) => set({ mainVisible: false, subType: type }),
  closeSub: () => set({ subType: null }),
}));

export default useQuickAddStore;
