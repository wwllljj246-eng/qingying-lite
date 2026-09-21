import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainTabs from './MainTabs';
import { useQuickAddStore } from '@/stores/quickAddStore';
import { semantic } from '@/theme/colors';
import type { RootStackParamList } from '@/types';
import {
  QuickAddSheet,
  TakePhotoDietSheet,
  RecordWeightSheet,
  RecordWaterSheet,
  RecordBodyStatusSheet,
  RecordExerciseSheet,
  type QuickAddItem,
} from '@/screens/screens';
import WeightTrendScreen from '@/screens/secondary/WeightTrendScreen';
import WeeklyReportScreen from '@/screens/secondary/WeeklyReportScreen';
import AIAssistantScreen from '@/screens/secondary/AIAssistantScreen';
import CycleScreen from '@/screens/secondary/CycleScreen';
import SettingsScreen from '@/screens/secondary/SettingsScreen';
import BodyStatusScreen from '@/screens/secondary/BodyStatusScreen';
import DataAnalysisScreen from '@/screens/secondary/DataAnalysisScreen';
import ProfileEditScreen from '@/screens/profile/ProfileEditScreen';
import AIFoodRecognitionScreen from '@/screens/diet/AIFoodRecognitionScreen';
import FoodRecognitionResultScreen from '@/screens/diet/FoodRecognitionResultScreen';
import NutritionAnalysisScreen from '@/screens/diet/NutritionAnalysisScreen';
import FoodSearchScreen from '@/screens/diet/FoodSearchScreen';
import FoodAmountScreen from '@/screens/diet/FoodAmountScreen';

/** 根导航引用，供任意页面在无 navigation prop 时跳转二级页 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
): void {
  if (navigationRef.isReady() && navigationRef.current) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef.current as any).navigate(name, params);
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const QUICK_ITEMS: QuickAddItem[] = [
  { key: 'photo', label: '拍照饮食', icon: 'camera', color: 'pink', onPress: () => useQuickAddStore.getState().openSub('photo') },
  { key: 'weight', label: '记录体重', icon: 'scale', color: 'primary', onPress: () => useQuickAddStore.getState().openSub('weight') },
  { key: 'exercise', label: '记录运动', icon: 'footprints', color: 'purple', onPress: () => useQuickAddStore.getState().openSub('exercise') },
  { key: 'water', label: '记录饮水', icon: 'droplets', color: 'primary', onPress: () => useQuickAddStore.getState().openSub('water') },
  { key: 'bodyStatus', label: '身体状态', icon: 'heart', color: 'yellow', onPress: () => useQuickAddStore.getState().openSub('bodyStatus') },
];

/**
 * 根导航：NavigationContainer 包裹 Stack
 * - MainTabs 作为首个 screen（内部手渲染 4 Tab + 自定义 TabBar + ＋FAB）
 * - 二级页：WeightTrend / WeeklyReport / AIAssistant / Cycle / Settings
 * - Quick Add 弹层由 quickAddStore 全局控制
 */
export function RootNavigator() {
  const { mainVisible, subType, closeMain, closeSub } = useQuickAddStore();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: semantic.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="MainTabs">
              {(props) => <MainTabs {...props} onPlusPress={() => useQuickAddStore.getState().openMain()} />}
            </Stack.Screen>
            <Stack.Screen name="WeightTrend" component={WeightTrendScreen} />
            <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
            <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
            <Stack.Screen name="Cycle" component={CycleScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            {/* 个人资料：昵称 / 年龄 */}
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="BodyStatus" component={BodyStatusScreen} />
            <Stack.Screen name="DataAnalysis" component={DataAnalysisScreen} />
            {/* Phase 2：AI 饮食识别闭环 */}
            <Stack.Screen name="AIFoodRecognition" component={AIFoodRecognitionScreen} />
            <Stack.Screen name="FoodRecognitionResult" component={FoodRecognitionResultScreen} />
            <Stack.Screen name="NutritionAnalysis" component={NutritionAnalysisScreen} />
            <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
            <Stack.Screen name="FoodAmount" component={FoodAmountScreen} />
          </Stack.Navigator>
        </NavigationContainer>

        {/* 快速记录弹层（全局，覆盖在导航之上） */}
        <QuickAddSheet visible={mainVisible} onDismiss={closeMain} items={QUICK_ITEMS} />
        <TakePhotoDietSheet visible={subType === 'photo'} onDismiss={closeSub} />
        <RecordWeightSheet visible={subType === 'weight'} onDismiss={closeSub} />
        <RecordWaterSheet visible={subType === 'water'} onDismiss={closeSub} />
        <RecordBodyStatusSheet visible={subType === 'bodyStatus'} onDismiss={closeSub} />
        <RecordExerciseSheet visible={subType === 'exercise'} onDismiss={closeSub} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
});

export default RootNavigator;
