# 「轻盈 Lite」AI 健康体重管理 App · 产品分析与技术方案

> **产品定位**：不只记录体重，而是理解你的身体。
> **目标用户**：年轻用户（轻养生 + 自我量化人群）
> **差异化**：不强调极端减肥，而是通过多维数据（体重 / 饮食 / 运动 / 睡眠 / 情绪 / 身体状态）+ AI 给出个性化建议，柔和、可爱的健康 App。

---

## 一、产品分析

### 1.1 核心价值主张
- **多维数据驱动**：体重 + 饮食 + 运动 + 睡眠 + 情绪 + 身体状态 → 更立体的健康画像
- **AI 加持**：拍照识别食物 / 个性化建议 / 周报告生成 / 智能问答
- **女性友好**：周期管理作为重要模块（粉色系呼应）
- **情绪温度**：把"减肥"变成"轻盈"，弱化目标压迫感

### 1.2 功能模块归类（11 个核心功能 → 5 个 Tab + 弹层/二级页）

| 模块 | 归属 | 入口 |
|---|---|---|
| 首页 | Tab 1 | 默认 |
| 饮食记录 | Tab 2 | Tab |
| AI 拍照识别食物 | Tab 2 子页 | 饮食 → 右上角相机 / ＋弹层 |
| 营养分析 | Tab 2 子页 | 饮食 → 卡片入口 |
| 运动记录 | Tab 4 | Tab |
| 身体状态记录 | ＋ 弹层 | ＋ → 记录身体状态 |
| 体重趋势 | 二级页 | 首页卡片 / 我的 |
| 周报告 | 二级页 | 首页卡片 |
| AI 助手 | 全局浮窗 + 独立页 | 首页 AI 卡 / 全局入口 |
| 周期管理 | 二级页 | 我的 |
| 我的 | Tab 5 | Tab |

### 1.3 关键交互流
1. **一日流程**：起床 → 记录体重 / 睡眠 → 拍照吃早餐 → 记录运动 → 喝水打卡 → 晚上总结 → 睡前身体状态打卡
2. **AI 干预点**：拍照后自动识别 + 估算热量；周报自动生成；首页每日一句建议

---

## 二、技术栈推荐

### 2.1 主推方案：**React Native + Expo + TypeScript**

| 维度 | 选型 | 理由 |
|---|---|---|
| 框架 | **React Native + Expo SDK 51+** | 真 App 体验，可 EAS 云端打包 iOS（Windows 下可构建），生态丰富 |
| 语言 | **TypeScript** | 11 个模块类型安全必需 |
| 导航 | **React Navigation 7** (Bottom Tabs + Native Stack) | 底部 Tab + Stack 嵌套方案成熟 |
| 状态管理 | **Zustand** + **React Query** | Zustand 管本地状态，React Query 管 AI/远端 |
| 持久化 | **MMKV** + **expo-sqlite** | MMKV 存轻量 KV，SQLite 存历史记录 |
| 动画 | **Reanimated 3** + **Moti** | 满足柔和过渡、卡片入场 |
| 图表 | **react-native-svg-charts** 或 **Victory Native** | 趋势图、周报可视化 |
| 相机 | **expo-camera** + **expo-image-picker** | 拍照识别食物 |
| 图标 | **lucide-react-native** + 自绘 SVG | 线条简洁 |
| 字体 | 系统字体 + Noto Sans SC | 轻量化 |
| 样式 | **StyleSheet** + **Tailwind (NativeWind)** | Token 化样式 |
| AI 服务 | **OpenAI Vision API** 或 **食物识别专项 API**（如食物图鉴 / 百度食物识别） | 拍照识别 → 营养解析 |
| 表单 | **react-hook-form** + **zod** | 数据录入校验 |
| 国际化 | **i18next** | 中英文预留 |

### 2.2 备选方案
- **Vue 3 + Vite + Vant**（H5 优先，最快出 MVP，无原生相机/AI 体验）
- **原生 Swift / SwiftUI**（最佳 iOS 体验，但需 macOS，迭代慢）

### 2.3 选型建议
> **推荐 React Native + Expo**。当前为 Windows 环境，但 Expo EAS Build 支持云端打包 iOS，可不依赖 macOS；既保证 iOS 体验，又能保留 Web 适配能力。后续如需 Android，零成本扩展。

---

## 三、项目目录结构

```
lite-app/
├── app.config.ts                  # Expo 配置（含 iOS Bundle ID、相机权限等）
├── tsconfig.json
├── package.json
├── .eslintrc.cjs
├── .prettierrc
├── assets/                        # 静态资源
│   ├── fonts/
│   ├── images/                    # 插画、空状态、引导图
│   └── icons/                     # SVG 图标
├── src/
│   ├── app/                       # 应用入口
│   │   ├── App.tsx
│   │   ├── Providers.tsx          # 全局 Provider 包裹
│   │   └── bootstrap.ts           # 初始化（主题、字体、Mock 数据）
│   ├── navigation/                # 路由
│   │   ├── RootNavigator.tsx
│   │   ├── MainTabs.tsx           # 底部 5 Tab
│   │   ├── types.ts               # 路由参数类型
│   │   └── linking.ts
│   ├── screens/                   # 页面（按业务模块划分）
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── WeightTrendScreen.tsx
│   │   │   ├── WeeklyReportScreen.tsx
│   │   │   └── AIAssistantScreen.tsx
│   │   ├── diet/
│   │   │   ├── DietScreen.tsx
│   │   │   ├── NutritionAnalysisScreen.tsx
│   │   │   └── AICameraFoodScreen.tsx
│   │   ├── exercise/
│   │   │   └── ExerciseScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── CycleManagementScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   └── quick-add/             # ＋ 弹层内的子页
│   │       ├── QuickAddSheet.tsx
│   │       ├── RecordWeightSheet.tsx
│   │       ├── RecordWaterSheet.tsx
│   │       └── RecordBodyStatusSheet.tsx
│   ├── components/                # 组件
│   │   ├── common/                # 通用基础组件
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Input/
│   │   │   ├── Switch/
│   │   │   ├── Chip/
│   │   │   ├── ModalSheet/        # 底部弹层
│   │   │   ├── Toast/
│   │   │   ├── EmptyState/
│   │   │   ├── LoadingState/
│   │   │   └── ProgressRing/
│   │   ├── layout/                # 布局类
│   │   │   ├── ScreenContainer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── SafeArea.tsx
│   │   │   └── TabBar.tsx
│   │   ├── business/              # 业务组件
│   │   │   ├── WeightCard.tsx
│   │   │   ├── MealCard.tsx
│   │   │   ├── ExerciseCard.tsx
│   │   │   ├── MoodSelector.tsx
│   │   │   ├── SleepBar.tsx
│   │   │   ├── WaterTracker.tsx
│   │   │   ├── CycleRing.tsx
│   │   │   ├── NutritionRadar.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   ├── WeeklySummary.tsx
│   │   │   ├── AIChatBubble.tsx
│   │   │   └── AIRecognitionResult.tsx
│   │   └── illustrations/         # 插画组件
│   │       └── *.tsx
│   ├── stores/                    # Zustand 状态
│   │   ├── userStore.ts
│   │   ├── weightStore.ts
│   │   ├── dietStore.ts
│   │   ├── exerciseStore.ts
│   │   ├── bodyStatusStore.ts
│   │   ├── cycleStore.ts
│   │   └── aiStore.ts
│   ├── services/                  # 服务层
│   │   ├── ai/
│   │   │   ├── foodRecognition.ts # 拍照识别
│   │   │   ├── chatAssistant.ts    # AI 助手对话
│   │   │   └── weeklyReportGen.ts  # 周报生成
│   │   ├── nutrition/             # 营养数据库查询
│   │   ├── storage/               # MMKV / SQLite 封装
│   │   └── notification/          # 本地通知
│   ├── theme/                     # 设计系统
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── radii.ts
│   │   ├── shadows.ts
│   │   └── index.ts
│   ├── hooks/                     # 自定义 Hook
│   │   ├── useUser.ts
│   │   ├── useTodaySummary.ts
│   │   └── useDebounce.ts
│   ├── types/                     # 全局类型
│   │   ├── models.ts              # 业务模型
│   │   ├── navigation.ts
│   │   └── api.ts
│   ├── constants/                 # 常量
│   │   ├── meals.ts               # 早午晚简餐枚举
│   │   ├── exerciseTypes.ts
│   │   ├── moods.ts
│   │   └── config.ts
│   ├── utils/                     # 工具
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validators.ts
│   └── mocks/                     # 开发期假数据
└── README.md
```

---

## 四、页面结构（11 个核心页面 + 子页）

### 4.1 主 Tab（5 个）
1. **首页 HomeScreen**
   - 顶部问候（早安）+ 今日体重卡（绿色系）
   - 今日摄入圆环 + 卡路里 / 蛋白 / 碳水 / 脂肪
   - 今日运动时长 / 饮水量 / 睡眠
   - 体重趋势小图（点击进入）
   - 周报告卡（点击进入）
   - AI 助手入口卡（紫色系）
   - 周期提醒卡（粉色，仅女性）

2. **饮食 DietScreen**
   - 顶部日期切换
   - 四餐 Tab：早餐 / 午餐 / 晚餐 / 加餐
   - 每餐卡：食物列表 + 营养小计
   - 右上角相机按钮 → AI 拍照
   - 底部"营养分析"按钮 → NutritionAnalysisScreen

3. **＋ QuickAddSheet（Modal）**
   - 拍照饮食
   - 记录体重
   - 记录运动
   - 记录饮水
   - 记录身体状态
   - 每个动作 → 各自弹层 / 子页

4. **运动 ExerciseScreen**
   - 今日运动卡
   - 运动类型图标网格（跑步 / 骑行 / 瑜伽 / 力量 / 散步 / 游泳 …）
   - 时长 / 强度滑块
   - 周运动时长柱状图
   - 消耗卡路里总览

5. **我的 ProfileScreen**
   - 用户头像 / 昵称 / BMI
   - 周期管理入口（女性）
   - 体重趋势入口
   - 周报告入口
   - 设置

### 4.2 二级页 / 全屏页
- **AICameraFoodScreen**：相机 + 自动识别 + 食物列表编辑
- **NutritionAnalysisScreen**：当日营养雷达图 + 缺口建议
- **WeightTrendScreen**：30 天 / 90 天 / 全部 体重曲线 + BMI
- **WeeklyReportScreen**：周报告长图（可分享）+ AI 文案
- **AIAssistantScreen**：对话式 AI 问答
- **CycleManagementScreen**：周期日历 + 预测 + 症状记录
- **RecordWeightSheet** / **RecordWaterSheet** / **RecordBodyStatusSheet**：底部抽屉表单

---

## 五、组件结构

### 5.1 通用组件（`components/common/`）

| 组件 | 关键 Props | 备注 |
|---|---|---|
| `Button` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'ai'`, `size`, `icon`, `loading` | 主色绿 / AI 紫 / 米黄成就 |
| `Card` | `radius: 'large' \| 'small'`, `padding`, `shadow: 'soft' \| 'none'` | 24 / 16px 圆角 |
| `Input` | `label`, `suffix`, `error`, `numeric` | 体重 / 饮水量录入 |
| `Chip` | `active`, `color` | 餐次 / 运动类型 |
| `ModalSheet` | `snapPoints`, `title` | ＋弹层、确认弹层 |
| `Toast` | `type: 'success' \| 'warn' \| 'info'` | 提交反馈 |
| `ProgressRing` | `value`, `total`, `color`, `thickness` | 卡路里环 |
| `EmptyState` | `illustration`, `title`, `action` | 空数据 |
| `LoadingState` | `skeleton: boolean` | 骨架屏 |
| `Section` | `title`, `action` | 首页分区标题 |

### 5.2 布局组件（`components/layout/`）

- `ScreenContainer`：统一 padding（左右 20px、上下安全区）
- `Header`：可选返回按钮 + 标题 + 右上角操作
- `SafeArea`：iOS 状态栏 + Home Indicator 安全区
- `TabBar`：自定义底部 Tab（5 个），中间 ＋ 用特殊圆形按钮

### 5.3 业务组件（`components/business/`）

| 组件 | 职责 |
|---|---|
| `WeightCard` | 显示今日体重 + 与昨日对比 + 健康状态小标识 |
| `MealCard` | 单餐食物条目，含营养标签 |
| `ExerciseCard` | 运动图标 + 时长 + 消耗 |
| `MoodSelector` | 5 档情绪 emoji / 文字选择 |
| `SleepBar` | 睡眠时长 + 质量 |
| `WaterTracker` | 8 杯水滴可视化，已喝数量 |
| `CycleRing` | 周期环形进度 + 下一阶段预测 |
| `NutritionRadar` | 6 维营养雷达图（蛋白/碳水/脂肪/纤维/维生素/水分） |
| `TrendChart` | 折线图，支持周/月/全部切换 |
| `WeeklySummary` | 周报大卡片 + AI 文案摘要 |
| `AIChatBubble` | 用户 / 助手对话气泡 |
| `AIRecognitionResult` | 拍照后识别结果展示（食物名、份量、卡路里、置信度） |

### 5.4 自定义 TabBar 重点说明

```
┌────────────────────────────────────────┐
│ 首页    饮食     [＋]    运动    我的  │
│  🌿     🍴     ⭕     🏃     👤    │
└────────────────────────────────────────┘
```

- 中间 ＋：直径 56px，绿色背景，浮起阴影；点击打开 QuickAddSheet
- 其他 4 个：等分，点击切换
- 选中态：图标绿色 + 文字绿色；未选中：浅灰

---

## 六、数据结构（TypeScript Models）

```ts
// ===== 用户 =====
interface User {
  id: string;
  name: string;
  avatar?: string;
  gender: 'female' | 'male' | 'other';
  birthDate: string;          // ISO
  height: number;             // cm
  goalWeight: number;         // kg
  goalType: 'lose' | 'maintain' | 'gain';
  activityLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

// ===== 体重 =====
interface WeightRecord {
  id: string;
  weight: number;             // kg
  bodyFat?: number;           // %
  recordedAt: string;         // ISO 日期（含时间）
  note?: string;
}

// ===== 饮食 =====
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  portion: number;            // g
  calories: number;           // kcal
  protein: number;            // g
  carbs: number;              // g
  fat: number;                // g
  confidence?: number;        // AI 识别置信度 0~1
  source: 'manual' | 'ai' | 'search';
}

interface MealRecord {
  id: string;
  date: string;               // YYYY-MM-DD
  mealType: MealType;
  items: FoodItem[];
  imageUri?: string;
  aiRecognized: boolean;
  createdAt: string;
}

// ===== 运动 =====
type ExerciseType =
  | 'running' | 'walking' | 'cycling' | 'yoga'
  | 'strength' | 'swimming' | 'hiit' | 'pilates' | 'other';

interface ExerciseRecord {
  id: string;
  type: ExerciseType;
  duration: number;           // minutes
  intensity: 'low' | 'medium' | 'high';
  caloriesBurned: number;
  distance?: number;          // km
  date: string;               // YYYY-MM-DD
  createdAt: string;
}

// ===== 身体状态 =====
type Rating = 1 | 2 | 3 | 4 | 5;

interface BodyStatusRecord {
  id: string;
  date: string;               // YYYY-MM-DD
  sleepHours?: number;
  sleepQuality?: Rating;
  mood?: Rating;              // 1 很低落 ~ 5 很开心
  energy?: Rating;
  waterIntake?: number;       // ml
  symptoms?: string[];        // ['腹胀', '疲劳', ...]
  note?: string;
}

// ===== 饮水（独立打卡更轻） =====
interface WaterRecord {
  id: string;
  amount: number;             // ml
  date: string;
  createdAt: string;
}

// ===== 周期（女性） =====
interface CycleRecord {
  id: string;
  startDate: string;          // YYYY-MM-DD
  endDate?: string;
  cycleLength?: number;       // 自动计算
  periodLength?: number;
  flow?: 'light' | 'medium' | 'heavy';
  symptoms?: string[];        // ['痛经', '腹胀', ...]
  mood?: Rating;
}

// ===== 周报告 =====
interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  weightChange: number;       // kg
  meanCalories: number;
  totalExerciseMinutes: number;
  meanSleepHours: number;
  meanMood: number;
  highlights: string[];
  aiSummary: string;          // AI 生成
}

// ===== AI =====
interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: Record<string, any>;
  createdAt: string;
}
```

---

## 七、页面路由（React Navigation）

```
RootStack (Native Stack)
├── AuthStack            // 预留：未来登录/引导
│   ├── OnboardingScreen
│   └── LoginScreen
└── MainTabs (Bottom Tabs)
    ├── HomeTab
    │   ├── HomeScreen                 [Home]
    │   ├── WeightTrendScreen         [WeightTrend]
    │   ├── WeeklyReportScreen        [WeeklyReport]
    │   └── AIAssistantScreen         [AIAssistant]
    ├── DietTab
    │   ├── DietScreen                [Diet]
    │   ├── NutritionAnalysisScreen   [NutritionAnalysis]
    │   └── AICameraFoodScreen        [AICameraFood] (presentation: modal)
    ├── QuickAddButton (Middle ＋ FAB)──→ 触发 Modal Sheet
    │   └── QuickAddSheet             [QuickAdd] (presentation: modal)
    │       ├── RecordWeightSheet     [RecordWeight]
    │       ├── RecordWaterSheet      [RecordWater]
    │       └── RecordBodyStatusSheet [RecordBodyStatus]
    ├── ExerciseTab
    │   └── ExerciseScreen            [Exercise]
    └── ProfileTab
        ├── ProfileScreen             [Profile]
        ├── CycleManagementScreen     [CycleManagement]
        └── SettingsScreen            [Settings]
```

**路由参数类型**（强类型）：
```ts
type RootStackParamList = {
  MainTabs: undefined;
  WeightTrend: undefined;
  WeeklyReport: { reportId?: string };
  AIAssistant: undefined;
  NutritionAnalysis: { date: string };
  AICameraFood: { mealType: MealType };
  QuickAdd: undefined;
  RecordWeight: undefined;
  RecordWater: undefined;
  RecordBodyStatus: undefined;
  CycleManagement: undefined;
  Settings: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Diet: undefined;
  QuickAdd: undefined;
  Exercise: undefined;
  Profile: undefined;
};
```

---

## 八、状态管理方案

### 8.1 分层模型
| 层 | 工具 | 职责 |
|---|---|---|
| **客户端本地状态** | Zustand | 当前用户、设置、临时 UI 状态 |
| **业务数据缓存** | Zustand + MMKV | 体重 / 饮食 / 运动 / 身体状态记录（持久化） |
| **AI / 远端数据** | React Query | 拍照识别、AI 对话、周报生成（带 loading / error） |
| **表单状态** | react-hook-form | 录入类表单 |
| **派生状态** | useMemo + Selectors | 今日摘要、本周统计 |

### 8.2 Zustand Store 划分

```ts
// 命名约定：xxxStore.ts，每个 store 一个文件
useUserStore       // 当前用户信息、目标、设置
useWeightStore     // 体重记录列表
useDietStore       // 饮食记录（按日期索引）
useExerciseStore   // 运动记录
useBodyStatusStore // 睡眠 / 情绪 / 精力 / 症状
useWaterStore      // 饮水打卡
useCycleStore      // 周期记录
useAIStore         // AI 对话历史
```

每个 Store 暴露：
```ts
interface WeightStore {
  records: WeightRecord[];
  todayWeight: WeightRecord | null;
  add: (r: WeightRecord) => void;
  update: (id: string, patch: Partial<WeightRecord>) => void;
  remove: (id: string) => void;
  load: () => Promise<void>;   // 从 MMKV 加载
  persist: () => Promise<void>;
}
```

### 8.3 持久化策略
- **MMKV**：所有 Store 数据序列化后写入 key（`weight:records`, `diet:2026-09-18` …）
- **expo-sqlite**（可选）：当单日记录过多时切换到 SQLite
- **首次启动**：从 MMKV 读取种子数据

### 8.4 不选 Redux 的理由
11 个模块的小型 App，Redux 样板代码过重；Zustand 简洁、TS 友好、性能相当。

---

## 九、设计系统（Design Tokens）

```ts
// colors.ts
export const colors = {
  // 主色（绿色）
  primary: '#A8C68A',
  primarySoft: '#CDE9C0',
  primaryBg: '#EAF9DA',

  // 背景
  cream: '#FEFFFA',
  surface: '#FFFFFF',

  // 文字（非纯黑）
  textPrimary: '#2E3328',
  textSecondary: '#7A8270',
  textTertiary: '#B4B9AB',

  // 辅助
  pink: '#F6CFD8',          // 饮食 / 周期
  pinkSoft: '#FDE6EC',
  purple: '#BDB2E3',         // AI
  purpleSoft: '#E2DDF5',
  yellow: '#F5E2A1',         // 提醒 / 成就
  yellowSoft: '#FBF1D2',

  // 状态
  success: '#A8C68A',
  warning: '#F5E2A1',
  danger:  '#E6A6A6',

  // 边框
  border: '#EEEFE7',
};

// radii.ts
export const radii = {
  sm: 8, md: 12, cardSmall: 16, cardLarge: 24, button: 16, full: 999,
};

// spacing.ts（4 倍数）
export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

// typography.ts
export const typography = {
  h1: { size: 28, weight: '700', lineHeight: 36 },
  h2: { size: 22, weight: '600', lineHeight: 30 },
  h3: { size: 18, weight: '600', lineHeight: 26 },
  body: { size: 15, weight: '400', lineHeight: 22 },
  caption: { size: 13, weight: '400', lineHeight: 18 },
  number: { size: 32, weight: '700', lineHeight: 40 },
};

// shadows.ts（柔和）
export const shadows = {
  soft: {
    shadowColor: '#A8C68A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
```

---

## 十、后续开发计划（里程碑）

> 总周期建议：**18~20 天**完成可演示 MVP，后续迭代 1~2 个月打磨细节。

### Phase 0：项目初始化（第 1 天）
- [ ] `npx create-expo-app` 初始化项目
- [ ] 配置 TypeScript / ESLint / Prettier
- [ ] 配置 `app.config.ts`（相机权限、状态栏、启动屏）
- [ ] 目录结构落地
- [ ] 主题（design tokens）落库
- [ ] 接入 NativeWind

### Phase 1：设计系统 + 通用组件（第 2~3 天）
- [ ] Button / Card / Input / Chip / Switch
- [ ] ModalSheet（基于 @gorhom/bottom-sheet）
- [ ] ProgressRing / Toast / EmptyState
- [ ] ScreenContainer / Header / SafeArea
- [ ] 自定义 TabBar（含中间 ＋ FAB）

### Phase 2：导航 + 11 页骨架（第 4 天）
- [ ] 路由全部接入，所有页面渲染占位
- [ ] Mock 数据层（提供完整假数据，方便后续替换）
- [ ] 底部 5 Tab 跳转顺畅

### Phase 3：核心录入（第 5~8 天）
- [ ] 首页布局 + 体重卡 + 今日摘要
- [ ] 饮食列表 + 手动录入食物
- [ ] ＋弹层 + 记录体重 / 饮水 / 身体状态
- [ ] 运动列表 + 类型选择 + 时长滑块

### Phase 4：AI 与趋势（第 9~12 天）
- [ ] AI 拍照识别（调用 Vision API → 解析食物）
- [ ] AI 助手对话页（流式输出）
- [ ] 体重趋势页（折线图 + 时间切换）
- [ ] 营养分析页（雷达图 + 缺口建议）

### Phase 5：周期 + 周报告（第 13~15 天）
- [ ] 周期管理页（日历 + 预测 + 症状）
- [ ] 周报告自动生成（汇总 + AI 文案）
- [ ] 周期首页卡片提醒

### Phase 6：打磨与可发布（第 16~18 天）
- [ ] 微交互动画（Reanimated）
- [ ] 空状态 / 加载状态 / 错误兜底
- [ ] 本地通知（喝水 / 记录提醒）
- [ ] 无障碍：语义标签、对比度、字号自适应
- [ ] iOS 启动屏 / 图标 / 隐私清单
- [ ] EAS Build 打包 iOS

### Phase 7（可选）：上架与运营
- [ ] TestFlight 内测
- [ ] App Store 上架
- [ ] 后端接入（如需云同步）

---

## 十一、风险与权衡

| 风险 | 影响 | 缓解 |
|---|---|---|
| Windows 下 iOS 真机调试受限 | 体验受损 | 使用 Expo Go 开发期热更新；EAS 云端出包 |
| AI 食物识别准确度 | 用户体验 | 预留手动修改入口；置信度低时提示用户确认 |
| 多模块数据耦合 | 维护成本 | Store 严格按业务域拆分；用 selector 派生 |
| 设计还原度 | 视觉一致性 | 先做完整设计稿 → 走 design-to-code 工作流批量生成组件 |
| 性能（图表 / 列表） | 流畅度 | 启用 Hermes；图表用 `react-native-svg-charts`；列表用 FlashList |

---

## 十二、待你确认的关键决策

1. **技术栈**：是否接受 **React Native + Expo + TypeScript** 作为主推方案？（备选：Vue 3 H5 / 原生 Swift）
2. **AI 服务**：食物识别使用 **OpenAI Vision** 还是 **专项食物识别 API**？（影响成本与准确度）
3. **女性周期模块**：作为必含功能开发，还是先做骨架、后期接入？
4. **后端**：是否需要云同步 / 多端？MVP 是否纯本地（推荐先本地）？
5. **目标发布**：仅 iPhone 17 真机演示，还是也要 Android / Web？

---

## 十三、下一步

等你确认上述方案（特别是技术栈与 AI 服务），我将从 **Phase 0 项目初始化** 开始落地：搭建项目骨架 → 配置主题与设计 Token → 实现设计系统组件 → 接入导航 → 逐步填充 11 个页面。

请回复确认或修改意见，我再继续。