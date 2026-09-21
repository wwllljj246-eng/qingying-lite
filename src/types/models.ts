/**
 * 业务数据模型
 * 全部定义为可序列化的 plain object，方便后续迁移到云数据库。
 */

// ===== 用户 =====
export type Gender = 'female' | 'male' | 'other';
export type ActivityLevel = 'low' | 'medium' | 'high';
export type GoalType = 'lose' | 'maintain' | 'gain';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  gender: Gender;
  birthDate: string; // ISO date
  age?: number; // 年龄（表单层必填，Store 兼容旧数据可为空）
  height: number; // cm
  goalWeight: number; // kg
  goalType: GoalType;
  activityLevel: ActivityLevel;
  cycleEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== 体重 =====
export interface WeightRecord {
  id: string;
  weight: number; // kg
  bodyFat?: number; // %
  recordedAt: string; // ISO datetime
  note?: string;
}

// ===== 饮食 =====
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'manual' | 'ai' | 'search';

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  portion: number; // 份量数值（默认按 g）
  unit?: string; // 份量单位（g / 个 / 碗 / 份…），缺省视为 g
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  confidence?: number; // 0~1 (AI 识别置信度)
  source: FoodSource;
}

export interface MealRecord {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  items: FoodItem[];
  imageUri?: string;
  aiRecognized: boolean;
  /** 记录入口来源：搜索食物 / 拍照识别 / 未指定（手动） */
  source?: 'search' | 'camera';
  createdAt: string;
  updatedAt: string;
}

// ===== 运动 =====
export type ExerciseType =
  | 'running'
  | 'walking'
  | 'jogging'
  | 'cycling'
  | 'yoga'
  | 'strength'
  | 'swimming'
  | 'badminton'
  | 'hiit'
  | 'pilates'
  | 'other';

export type ExerciseIntensity = 'low' | 'medium' | 'high';

export interface ExerciseRecord {
  id: string;
  type: ExerciseType;
  duration: number; // minutes
  intensity: ExerciseIntensity;
  caloriesBurned: number;
  distance?: number; // km
  date: string; // YYYY-MM-DD
  createdAt: string;
}

// ===== 身体状态 =====
export type Rating = 1 | 2 | 3 | 4 | 5;

/** 三档程度：低 / 中 / 高（疲劳等） */
export type Level3 = 'low' | 'medium' | 'high';
/** 三档程度：无 / 轻微 / 明显（肌肉酸痛、身体不适等） */
export type Severity = 'none' | 'mild' | 'obvious';
/** 食欲：低 / 正常 / 较强 */
export type Appetite = 'low' | 'normal' | 'strong';

export interface BodyStatusRecord {
  id: string;
  date: string;
  sleepHours?: number;
  sleepQuality?: Rating;
  mood?: Rating;
  energy?: Rating;
  waterIntake?: number; // ml
  symptoms?: string[];
  note?: string;

  // —— Phase 3 新增字段 ——
  /** 疲劳程度：低 / 中 / 高 */
  fatigue?: Level3;
  /** 肌肉酸痛：无 / 轻微 / 明显 */
  muscleSoreness?: Severity;
  /** 食欲：低 / 正常 / 较强 */
  appetite?: Appetite;
  /** 身体不适：无 / 轻微 / 明显 */
  discomfort?: Severity;
  /** 周期相关（仅当用户开启周期管理时填写）：经期流量 */
  periodFlow?: PeriodFlow;
}

// ===== 饮水（独立打卡更轻） =====
export interface WaterRecord {
  id: string;
  amount: number; // ml
  date: string;
  createdAt: string;
}

// ===== 周期 =====
export type PeriodFlow = 'light' | 'medium' | 'heavy';

export interface CycleRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  cycleLength?: number; // 自动计算
  periodLength?: number;
  flow?: PeriodFlow;
  symptoms?: string[];
  mood?: Rating;
}

// ===== 周报告 =====
export interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  weightChange: number; // kg
  meanCalories: number;
  totalExerciseMinutes: number;
  meanSleepHours: number;
  meanMood: number;
  highlights: string[];
  aiSummary: string;
  createdAt: string;
}

// ===== AI =====
export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  context?: Record<string, unknown>;
  createdAt: string;
}