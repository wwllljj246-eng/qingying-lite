# 轻盈 Lite · AI 健康体重管理 App

> 不只记录体重，而是理解你的身体。

一个面向年轻用户的健康体重管理 App，通过体重、饮食、运动、睡眠、情绪、身体状态等多维数据，结合 AI 给出个性化建议。

---

## 当前进度

**Phase 0：项目初始化 ✅**
- ✅ Expo SDK 52 + TS + RN 0.76；主题系统；基础/布局组件；Icon 封装
- ✅ 8 个 Zustand store + MMKV 持久化；AI 服务（Mock）；自定义底部 TabBar（4 tab + ＋FAB）

**Phase 1：首页 + 二级路由 ✅**
- ✅ React Navigation 接入；首页 7 大模块；体重趋势 / 周报告 / AI 助手 / 周期 / 设置 二级页

**Phase 2：饮食记录 + AI 拍照识别 ✅**
- ✅ 饮食 Tab（今日总览 + 餐次列表）；AI 拍照识别 → 结果确认/编辑 → 营养分析 → 保存闭环
- ✅ 草稿 Store（foodDraftStore）、份量按比例重算、手动添加食物

**Phase 3：运动模块完整化 ✅**
- ✅ 运动 Tab：今日概览、本周柱状图、周目标进度、今日记录（可删除）
- ✅ 运动记录弹层支持类型 + 强度选择，按 MET × 强度系数估算热量

**下一步见底部「下一步计划」。**

---

## 启动方式

> 仓库地址：https://github.com/wwllljj246-eng/qingying-lite
> AI 后端与 App 前端是两个独立进程，需要分别启动。

```bash
# 1) 安装依赖
npm install

# 2) 启动 AI 后端（端口 3000）
#    如需真实 AI 识别：复制 .env.example 为 .env 并填入 AI_API_KEY（.env 已被忽略，切勿提交）
npm start

# 3) 另开一个终端启动 App（开发环境默认请求 http://localhost:3000）
npm run web        # Web 浏览器
npm run android    # Android 模拟器 / 真机
npm run ios        # iOS 模拟器（需 macOS）
```

**真机说明**：项目依赖 `react-native-mmkv` 原生模块，**Expo Go 无法运行**，需使用 EAS 开发构建（配置见 `eas.json`，完整说明见 `DEPLOYMENT_REPORT.md`）：

```bash
npm run build:web                                    # 导出 Web 静态站到 dist-web-showcase/（部署用）
eas build --platform ios --profile development       # iOS 云端构建，需 Expo 账号
eas build --platform android --profile development   # Android 云端构建
```

---

## 项目结构

```
lite-app/
├── App 入口
├── src/
│   ├── app/             # App.tsx / bootstrap
│   ├── theme/           # 设计系统（colors / typography / spacing / radii / shadows）
│   ├── components/      # UI 组件
│   │   ├── common/      # Button / Card / Input / ModalSheet / Typography
│   │   ├── layout/      # ScreenContainer / Header / TabBar / Section
│   │   └── icons/       # Icon 封装（lucide-react-native）
│   ├── screens/         # 页面（占位）
│   ├── navigation/      # 路由（Phase 0 自渲染，Phase 1+ 接入 React Navigation）
│   ├── stores/          # Zustand store（8 个）
│   ├── services/
│   │   ├── storage/     # MMKV 封装
│   │   └── ai/          # AI service（Mock，预留真实 API 接口）
│   ├── types/           # TS 类型
│   ├── constants/       # 枚举 / 配置
│   ├── utils/           # 工具（date / format）
│   └── hooks/           # 自定义 Hook（Phase 0 占位）
└── assets/              # 静态资源
```

---

## 设计令牌

| Token | 值 |
|---|---|
| 主色 green400 | `#A8C68A` |
| 主色 green200（柔） | `#CDE9C0` |
| 主色 green100（背景） | `#EAF9DA` |
| 米白背景 | `#FEFFFA` |
| 浅粉（饮食/周期） | `#F6CFD8` |
| 浅紫（AI） | `#BDB2E3` |
| 米黄（成就） | `#F5E2A1` |
| 大卡片圆角 | 24px |
| 小卡片圆角 | 16px |
| 按钮圆角 | 16px |
| 页面左右边距 | 20px |
| FAB 圆角 | 28px |

---

## 关键技术决策

1. **AI**：Phase 0 使用 Mock，service 层封装了真实 API 调用路径（`App → Backend → AI Provider`），禁止在客户端放 API Key。
2. **状态**：Zustand + MMKV 持久化，所有 model 设计为 plain object，方便后续迁移到云数据库。
3. **样式**：StyleSheet（无 Tailwind），方便精确控制柔和、绿色、留白风格。
4. **导航**：Phase 0 用自渲染 Tab + 状态切换，Phase 1 替换为 React Navigation。
5. **动画**：已引入 Reanimated（ModalSheet 使用），后续业务页面继续复用。

---

## 下一步计划

| Phase | 内容 | 状态 |
|---|---|---|
| 1 | 首页 + 二级路由（React Navigation） | ✅ |
| 2 | 饮食记录 + AI 拍照识别闭环 | ✅ |
| 3 | 运动模块完整化（概览 / 周柱状图 / 目标 / 记录） | ✅ |
| 4 | 数据分析：周报告真实聚合（当前为 Mock）、体重趋势增强 | 待做 |
| 5 | AI 助手深化：结合用户数据给出个性化建议（当前为关键词 Mock） | 待做 |
| 6 | 真实相机接入（expo-camera）替换演示餐盘 | 待做 |
| 7 | 测试 / 打包 / 部署（Expo EAS） | 待做 |