import type { MealType, FoodItem } from './models';

/**
 * 路由参数类型 — 强类型导航
 * 所有页面跳转的参数必须在此声明
 */

export type RootStackParamList = {
  MainTabs: undefined;
  // 来自 HomeTab 的二级页
  WeightTrend: undefined;
  WeeklyReport: { reportId?: string } | undefined;
  AIAssistant: undefined;
  // 来自 DietTab
  NutritionAnalysis: undefined;
  AIFoodRecognition: { mealType: MealType } | undefined;
  FoodRecognitionResult: undefined;
  FoodSearch: { mealType?: MealType } | undefined;
  FoodAmount: { foodName?: string; manual?: FoodItem; mealType?: MealType } | undefined;
  // Quick Add 弹层内的子页
  QuickAdd: undefined;
  RecordWeight: undefined;
  RecordWater: undefined;
  RecordBodyStatus: undefined;
  // 来自 ProfileTab
  CycleManagement: undefined;
  Cycle: undefined;
  Settings: undefined;
  ProfileEdit: undefined;
  BodyStatus: undefined;
  DataAnalysis: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Diet: undefined;
  QuickAdd: undefined; // 中间 FAB，触发 Modal
  Exercise: undefined;
  Profile: undefined;
};

// 全局类型声明，使 useNavigation() 拥有强类型
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}