# Phase 1 · 首页业务 + 二级路由 完成报告

> 轻盈 Lite · AI 健康体重管理 App · 2026-09-18

---

## 1. 修改的文件（12 个）

| 文件 | 改动 |
|---|---|
| `src/stores/index.ts` | 注册 `tabStore` / `quickAddStore` |
| `src/navigation/RootNavigator.tsx` | 用 `NavigationContainer` + `Stack` 包裹；QuickAdd 改由 `quickAddStore` 驱动；导出 `navigate` / `navigationRef` |
| `src/navigation/MainTabs.tsx` | 激活态改读 `tabStore`（可被首页「开始运动」切换） |
| `src/navigation/index.ts` | 导出 `navigate` / `navigationRef` / `MainTabsProps` |
| `src/screens/home/HomeScreen.tsx` | **重写**：实现首页全部 7 大模块 |
| `src/screens/screens.ts` | 新增 5 个二级页导出 |
| `src/screens/profile/ProfileScreen.tsx` | 重写：真实菜单，跳转 体重趋势/周报告/AI/周期/设置 |
| `src/screens/quick-add/QuickAddSubSheets.tsx` | 5 个子记录层接入 Store，保存真实数据 |
| `src/screens/secondary/WeightTrendScreen.tsx` | 新增 |
| `src/screens/secondary/WeeklyReportScreen.tsx` | 新增 |
| `src/screens/secondary/AIAssistantScreen.tsx` | 新增（可运行 Mock 流式对话） |
| `src/screens/secondary/CycleScreen.tsx` | 新增 |
| `src/screens/secondary/SettingsScreen.tsx` | 新增 |
| `src/types/navigation.ts` | RootStackParamList 增加 `Cycle` 路由名 |

## 2. 新增的文件（7 个）

```
src/stores/tabStore.ts              # 主 Tab 激活态（轻量）
src/stores/quickAddStore.ts         # 快速记录弹层全局控制
src/hooks/useHomeSummary.ts         # 首页数据聚合（Store → 汇总，无数据回退 MOCK）
src/components/common/RingProgress.tsx   # 柔和圆环进度（SVG）
src/components/common/MiniTrend.tsx      # 极简趋势线（SVG）
src/components/common/index.ts      # 导出两个新组件
src/hooks/index.ts                  # 导出 useHomeSummary
```

## 3. 首页完成的模块（7 项全部实现）

1. **顶部问候**：`早上好/中午好/下午好/晚上好，{昵称} 👋`；昵称取自 `userStore`，无昵称则 `早上好 👋`（不固定"小可爱"）。
2. **今日状态卡**（24px 圆角）：当前体重 / 目标 / 变化（↑↓），内含 `MiniTrend` 极简趋势线。
3. **今日饮食卡**：`1280 / 1600 kcal` 柔和圆环（粉辅助色）+ 蛋白/碳水/脂肪三项。
4. **今日运动卡**：绿色进度条 `6320 / 7000 步` + `运动 X min` + 「开始运动 →」（切到运动 Tab）。
5. **AI 今日建议**：浅紫辅色，点击进入 AI 助手；文案温和，无医学绝对结论。
6. **身体状态 / 周期**：`cycleStore.enabled` 为真显示「🌙 经期第 N 天」+ 温和建议；为假显示「今日身体状态」+ 精力/睡眠。用词均为"可以/建议/关注身体感受"。
7. **今日任务**：3 个轻量 Check（记录早餐 / 喝水 1000ml / 完成运动），**根据真实数据自动勾选**。

## 4. Mock 数据范围

| 数据 | 来源 | 说明 |
|---|---|---|
| 昵称/目标体重 | `userStore` | 默认空 → 首页显示占位 |
| 体重/趋势/变化 | `weightStore` | 无记录 → MOCK 56.8 / 52.0 / -0.3 + 7 日 MOCK 曲线 |
| 饮食热量/宏量 | `dietStore` | 无记录 → MOCK 1280/1600 + 42/86/28 |
| 运动分钟 | `exerciseStore` | 真实累计；步数为 MOCK（暂未接入计步源） |
| 饮水/身体状态 | `waterStore` / `bodyStatusStore` | 真实；无记录 → MOCK |
| AI 建议文案 | 静态 MOCK | AI 助手页用 Mock 流式生成 |
| 周报告 | 静态 MOCK | Phase 后续接真实聚合 |

快速记录（＋弹层全部 5 项）**已可真实写入 Store**，刷新后卡片即时反映。

## 5. 视觉规范执行

- 页面左右 20px、卡片间距 12~16px、大卡 24px、内卡/按钮 16px、FAB 28px —— 全部取自 `theme/*`，**未在 JSX 写死颜色值**。
- 主色 `#A8C68A`、米白 `#FEFFFA`、粉(饮食/周期) `#F6CFD8`、紫(AI) `#BDB2E3`、米黄(成就) `#F5E2A1` 均用 `semantic`。
- 非纯黑文字、轻阴影 `shadows.soft`、大圆角、简洁线性图标（lucide）。
- 底部导航严格 5 个：首页｜饮食｜＋｜运动｜我的；＋ 为 FAB 弹层，未新增第 6 Tab。

## 6. 验证结果

| 检查 | 结果 |
|---|---|
| `npx tsc --noEmit` | ✅ 0 错误 |
| `npx expo-doctor` | ✅ 18/18 通过 |
| 依赖安装 | ✅ 新增 `@react-navigation/native` + `@react-navigation/native-stack` |

**说明**：完整真机/模拟器运行需你本地扫码（`npm start` + Expo Go），本环境未能实际启动 Metro 渲染。所有静态检查通过，导航与组件 API 均按 React Navigation 标准用法接线。

## 7. 下一步建议（Phase 2）

**饮食记录 + AI 拍照识别**（顺序最优）：
1. 接入 `expo-camera`，实现 `AICameraFood` 拍照页。
2. 打通 `services/ai/foodRecognition.ts` Mock → 食物列表 → 份量估算 → 营养分析 → 确认保存（已预留接口）。
3. 饮食 Tab 首页：今日三餐列表 + 加号进入拍照。
4. 营养分析页 `NutritionAnalysis`（复用 `RingProgress` / `MiniTrend`）。

需要我继续 Phase 2 时，请确认优先级与是否在本环境尝试启动预览。