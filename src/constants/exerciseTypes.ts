import type { ExerciseType, ExerciseIntensity } from '@/types';

export const EXERCISE_TYPE_LIST: Array<{
  key: ExerciseType;
  label: string;
  icon: string; // lucide 图标名（业务开发时绑定）
  emoji: string; // 选择器 / 列表展示用
  metValue: number; // 用于估算卡路里
}> = [
  { key: 'walking', label: '快走', icon: 'footprints', emoji: '🚶', metValue: 3.5 },
  { key: 'jogging', label: '慢跑', icon: 'footprints', emoji: '🏃', metValue: 6.5 },
  { key: 'running', label: '跑步', icon: 'footprints', emoji: '💨', metValue: 8.0 },
  { key: 'cycling', label: '骑行', icon: 'footprints', emoji: '🚴', metValue: 6.8 },
  { key: 'yoga', label: '瑜伽', icon: 'footprints', emoji: '🧘', metValue: 2.5 },
  { key: 'strength', label: '力量训练', icon: 'footprints', emoji: '🏋️', metValue: 6.0 },
  { key: 'swimming', label: '游泳', icon: 'footprints', emoji: '🏊', metValue: 7.0 },
  { key: 'badminton', label: '羽毛球', icon: 'footprints', emoji: '🏸', metValue: 5.5 },
  { key: 'hiit', label: 'HIIT', icon: 'footprints', emoji: '🔥', metValue: 9.0 },
  { key: 'pilates', label: '普拉提', icon: 'footprints', emoji: '🤸', metValue: 3.0 },
  { key: 'other', label: '其他', icon: 'footprints', emoji: '🌟', metValue: 4.0 },
];

/** 通过 key 取展示信息 */
export function getExerciseTypeInfo(key: ExerciseType) {
  return EXERCISE_TYPE_LIST.find((e) => e.key === key) ?? EXERCISE_TYPE_LIST[EXERCISE_TYPE_LIST.length - 1];
}

export const EXERCISE_INTENSITY_LIST: Array<{
  key: ExerciseIntensity;
  label: string;
  multiplier: number;
}> = [
  { key: 'low', label: '轻松', multiplier: 0.85 },
  { key: 'medium', label: '适中', multiplier: 1.0 },
  { key: 'high', label: '高强度', multiplier: 1.15 },
];
