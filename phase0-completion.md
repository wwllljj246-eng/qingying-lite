# Phase 0 · 项目初始化 完成报告

> 轻盈 Lite · AI 健康体重管理 App
> 完成日期：2026-09-18

---

## 1. 创建的文件清单（共 56 个源码 + 6 个项目配置）

### 1.1 项目根配置（7 个）
```
package.json              — Expo SDK 52 + TypeScript + 全部依赖
app.config.ts             — Expo 配置（iPhone 17 portrait、米白启动屏、相机权限）
tsconfig.json             — 严格模式 + 路径别名 @/*
babel.config.js           — Reanimated plugin + 路径别名
index.js                  — registerRootComponent(App)
expo-env.d.ts             — Expo 环境类型
README.md                 — 完整项目说明
```

### 1.2 src/theme（设计系统，6 个）
```
colors.ts                 — 26 个 token：3 绿 + 米白 + 4 辅色 + 9 文字/边框
typography.ts             — h1/h2/h3/body/bodyStrong/caption/micro/number 8 个
spacing.ts                — spacing (xxs~huge) + layout 页面级常量
radii.ts                  — button/smallCard/largeCard/fab 圆角
shadows.ts                — soft/medium/large/fab 阴影
index.ts                  — 统一导出
```

### 1.3 src/types（4 个）
```
models.ts                 — User/WeightRecord/MealRecord/ExerciseRecord/BodyStatusRecord/WaterRecord/CycleRecord/FoodItem/AIMessage 完整数据模型
navigation.ts             — 路由参数类型（Phase 0 占位）
api.ts                    — 通用 API 响应包装
index.ts
```

### 1.4 src/constants（5 个）
```
meals.ts                  — 4 餐类型 + 顺序 + 默认结构
exerciseTypes.ts          — 7 种运动 + MET 系数 + 智能计算卡路里函数
moods.ts                  — Mood/Energy/Symptom 枚举与中文标签
config.ts                 — 运行时配置（含 mockAI / apiBaseUrl 开关）
index.ts
```

### 1.5 src/utils（3 个）
```
date.ts                   — todayISO / toISODateTime / weekRange / formatDateCN / greetingByHour
format.ts                 — genId / fmtNumber / clamp / roundToStep
index.ts
```

### 1.6 src/services（8 个）
```
storage/mmkv.ts           — MMKV 封装 + StorageKeys 注册
storage/index.ts          — getJSON/setJSON/removeJSON 便捷函数
ai/types.ts               — 真实 API 调用路径签名（永远不在此处放 API Key）
ai/foodRecognition.ts     — 食物识别 Mock（含米饭/牛肉/西兰花/鸡蛋 540kcal 真实场景数据）
ai/nutritionAnalysis.ts   — 营养雷达图 Mock + 个性化建议
ai/assistant.ts           — 流式对话 Mock（关键词匹配 5 套回复 + 兜底）
ai/index.ts
services/index.ts         — 命名空间统一导出
```

### 1.7 src/stores（9 个 Zustand store）
```
userStore.ts              — 用户信息（MMKV 持久化）
weightStore.ts            — 体重记录（含 today/latest 选择器）
dietStore.ts              — 饮食记录（含 mealsByDateAndType）
exerciseStore.ts          — 运动记录（含 todayExercises/weekExercises）
bodyStatusStore.ts        — 身体状态（含按日 upsert）
waterStore.ts             — 饮水（含 todayTotal）
cycleStore.ts             — 周期（含 latestPeriod/predictNext）
aiStore.ts                — AI 对话历史
index.ts                  — 全部导出
```

### 1.8 src/components（11 个组件）
```
common/Typography.tsx     — 排印组件 + H1/H2/H3/Body/Caption/Number_ 便捷别名
common/Button.tsx         — 6 种 variant × 3 种 size，支持 loading/leftIcon/rightIcon
common/Card.tsx           — 大/小圆角，可点击 + ripple
common/Input.tsx          — label/helper/error/rightIcon
common/ModalSheet.tsx     — 基于 @gorhom/bottom-sheet
common/index.ts
layout/ScreenContainer.tsx — 安全区 + 页面 padding + 可选 scroll
layout/Header.tsx          — 返回/标题/右侧操作
layout/TabBar.tsx          — 严格 4 tab + 中间 ＋ FAB（5 个位置固定）
layout/Section.tsx         — 页面分区（标题 + 操作）
layout/index.ts
icons/Icon.tsx            — lucide-react-native 封装（24 个图标）
icons/index.ts
components/index.ts       — 三层统一导出
```

### 1.9 src/screens（7 个页面占位）
```
home/HomeScreen.tsx        — 首页骨架
diet/DietScreen.tsx        — 饮食骨架
exercise/ExerciseScreen.tsx — 运动骨架
profile/ProfileScreen.tsx  — 我的骨架（含 5 个二级页入口）
quick-add/QuickAddSheet.tsx — ＋ 弹层（5 个快速入口）
quick-add/QuickAddSubSheets.tsx — 5 个子记录 Sheet 占位表单
screens.ts                 — 统一导出
```

### 1.10 src/navigation（4 个）
```
tabs.ts                   — MAIN_TABS 配置（严格 5 个 Tab）
MainTabs.tsx              — 主 Tab 容器（自渲染切换，Phase 1 替换为 React Navigation）
RootNavigator.tsx         — 全局 Provider 包裹（SafeArea + GestureHandler + Tab + Quick Add）
index.ts
```

### 1.11 src/app（3 个）
```
App.tsx                   — App 入口
bootstrap.ts              — bootstrap 占位
index.ts
```

### 1.12 其他
```
src/hooks/index.ts        — hooks 占位（Phase 1+ 填充）
assets/images/.gitkeep    — 资源占位（Phase 1+ 接入 icon/splash）
```

---

## 2. 项目目录结构

```
20260918173719/
├── App 入口
├── app.config.ts          # Expo 配置
├── babel.config.js        # Babel 别名 + Reanimated
├── tsconfig.json          # TS 严格模式 + @/* 别名
├── expo-env.d.ts
├── index.js
├── package.json           # 全部依赖已锁定
├── README.md              # 项目说明
├── product-analysis.md    # 产品技术方案
│
├── src/
│   ├── app/               # App.tsx / bootstrap
│   ├── theme/             # 5 文件设计系统
│   ├── components/
│   │   ├── common/        # Button/Card/Input/ModalSheet/Typography
│   │   ├── layout/        # ScreenContainer/Header/TabBar/Section
│   │   └── icons/         # Icon 封装
│   ├── screens/           # 7 个页面（含占位）
│   │   ├── home/ diet/ exercise/ profile/
│   │   └── quick-add/     # ＋ 弹层 + 5 个子 Sheet
│   ├── navigation/        # RootNavigator + MainTabs
│   ├── stores/            # 8 个 Zustand store
│   ├── services/
│   │   ├── storage/       # MMKV 封装
│   │   └── ai/            # foodRecognition/nutritionAnalysis/assistant（Mock + 真实接口预留）
│   ├── types/             # models/navigation/api
│   ├── constants/         # meals/exerciseTypes/moods/config
│   ├── utils/             # date/format
│   └── hooks/             # 占位
└── assets/
    └── images/              # 占位
```

---

## 3. 安装的依赖（package.json 锁定）

### 运行时（17 个）
| 包名 | 版本 | 作用 |
|---|---|---|
| `expo` | ~52.0.46 | Expo SDK 52 |
| `react` / `react-dom` | 18.3.1 | React 18 |
| `react-native` | 0.76.9 | RN 0.76 |
| `@gorhom/bottom-sheet` | 5.0.6 | ModalSheet |
| `react-native-reanimated` | ~3.16.1 | 动画 |
| `react-native-gesture-handler` | ~2.20.2 | 手势 |
| `react-native-safe-area-context` | 4.12.0 | 安全区 |
| `react-native-screens` | ~4.4.0 | 屏幕 |
| `react-native-mmkv` | 3.1.0 | 本地持久化 |
| `react-native-svg` | 15.8.0 | SVG 渲染 |
| `lucide-react-native` | 0.469.0 | 图标 |
| `zustand` | 5.0.2 | 状态管理 |
| `expo-constants` | ~17.0.8 | Expo 常量 |
| `expo-status-bar` | ~2.0.1 | 状态栏 |

### 开发（3 个）
`@babel/core` / `@types/react` / `typescript`

> **说明**：Phase 0 不引入 ESLint（减少依赖复杂度），后续阶段按需补充。Phase 0 也不引入 React Navigation（手渲染 Tab 切换即可），Phase 1+ 接入。

---

## 4. 如何启动项目

```bash
cd c:/Users/lenovo/CodeBuddy/20260918173719

# 1. 启动开发服务器（推荐 Expo Go App 扫码）
npm start

# 2. 指定平台
npm run ios        # iOS 模拟器（需 macOS + Xcode）
npm run android    # Android 模拟器
npm run web        # 浏览器

# 3. 类型检查（已通过）
npm run typecheck
```

**Windows 推荐**：下载 **Expo Go** App → 扫码 `npm start` 显示的二维码 → 在 iPhone 17 真机或 Android 真机查看。

---

## 5. 当前运行状态

| 验证 | 状态 |
|---|---|
| `npm install` | ✅ 893 包安装成功 |
| `tsc --noEmit` | ✅ 类型检查 0 错误 |
| `npx expo-doctor` | ✅ 18/18 检查通过 |

**可以立即运行**。首启 Metro 首次会较慢（缓存未生成）。

---

## 6. 设计 Token 已就绪（Phase 1+ 直接使用）

| Token | 值 | 用途 |
|---|---|---|
| `semantic.primary` | `#A8C68A` | 主按钮 / 选中态 / 健康状态 |
| `semantic.primarySoft` | `#CDE9C0` | 柔色背景 |
| `semantic.primaryBg` | `#EAF9DA` | 主背景 |
| `semantic.background` | `#FEFFFA` | 页面米白 |
| `semantic.accentDiet` | `#F6CFD8` | 饮食 / 周期 |
| `semantic.accentAI` | `#BDB2E3` | AI 功能 |
| `semantic.accentReward` | `#F5E2A1` | 成就 / 积极反馈 |
| `radii.largeCard` | 24px | 大卡片 |
| `radii.smallCard` | 16px | 小卡片 / 按钮 |
| `radii.fab` | 28px | ＋ 圆形按钮 |
| `layout.pagePaddingX` | 20px | 页面左右边距 |

---

## 7. 关键架构决策（已落地）

1. **AI 服务预留真实接口**：所有 service 文件顶部都有「真实路径占位注释」，禁止在客户端放 API Key；调用路径固定为 `App → Backend /api/ai/* → AI Provider`
2. **MMKV 持久化**：userStore/weightStore/dietStore 等都已绑定 MMKV，水合完成后再渲染敏感页面
3. **状态分 8 个 Store**：业务域拆分，未来可独立迁移到云数据库
4. **严格 5 个 Tab**：TabBar.tsx 硬编码结构，确保 `Home / Diet / QuickAdd / Exercise / Profile` 顺序与文案
5. **＋ 入口走 ModalSheet**：避免新增第 6 个 Tab，符合设计规范
6. **周期管理预留**：`cycleStore` 已实现完整数据模型 + 预测算法，Phase 5 接入 UI
7. **图标集中管理**：所有 lucide 图标在 `Icon.tsx` 注册类型，新增需先在此登记

---

## 8. 下一步计划（Phase 1）

**Phase 1：首页 + 二级路由**
- 接入 `@react-navigation/native` + `@react-navigation/bottom-tabs` 替代手动切换
- 实现首页业务：体重卡 / 今日摄入环 / 运动 / 睡眠 / AI / 周期卡（按需）
- 实现 5 个二级页路由：WeightTrend / WeeklyReport / AIAssistant / CycleManagement / Settings
- 实现一个完整的卡片组件样板（参考设计图的真正视觉）

**Phase 1 完成后再次确认 → 进入 Phase 2：饮食记录 + AI 拍照识别**

---

请告诉我：
- 启动并预览是否正常？
- Phase 1 的具体优先级（首页先做哪些模块？）？
- 是否还有 Phase 0 的调整要求？