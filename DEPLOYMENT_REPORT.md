# 轻盈 Lite · 真机测试与部署检查报告

> 生成时间：2026-09-20
> 项目路径：C:\Users\lenovo\CodeBuddy\20260918173719
> 说明：本文档为「最终真机测试 + 部署准备」阶段产出。**不新增业务功能、不改动 UI、不改动产品结构。**

---

## 一、项目当前状态（已核查）

| 项 | 值 | 备注 |
| --- | --- | --- |
| Expo SDK | ~52.0.46 | 与全部原生依赖版本兼容（expo-doctor 依赖检查通过） |
| React Native | 0.76.9 | 对应 SDK 52 |
| expo-camera | ~16.0.18 | 已实现真实相机（CameraView / useCameraPermissions / takePictureAsync） |
| React Navigation | ^7.4.1 / ^7.19.2 | 原生栈 + 底部 Tab |
| Zustand | 5.0.2 | 状态管理 |
| react-native-mmkv | 3.1.0 | **原生模块（见下：导致 Expo Go 不可用）** |
| React Native 其他 | reanimated / gesture-handler / safe-area-context / screens / svg | 均为 Expo Go 内置 |
| @gorhom/bottom-sheet | 5.0.6 | JS 层，依赖 reanimated + gesture-handler |

### 构建健康
- `npx tsc --noEmit` → **0 errors** ✅
- `npx expo-doctor` → **17/18 通过**；唯一失败项：「`.expo` 未被 Git 忽略」。
  - 根因：本环境未安装 `git`，没有仓库，`.gitignore` 中的 `.expo/` 规则无法被识别。`.gitignore` 已正确包含 `.expo/`、`node_modules/`、`dist/`、`web-build/`、`.env`、`.env.*`。
  - 在装有 git 的机器执行 `git init` 后该项即通过。**非阻塞。**
- Metro 开发服务器启动正常（`expo start --dev-client` 在 `localhost:8081` 正常监听，无打包错误）。

---

## 二、真实手机运行方案（关键结论）

### Expo Go：**不可用**
原因：`react-native-mmkv` 是原生模块，未预置在 Expo Go 运行时中。Expo Go 启动后会因缺少 MMKV 原生绑定而白屏/崩溃。
（expo-camera 本身在 Expo Go 内，但 MMKV 这一项已足以阻断 Expo Go。）

### 推荐方案：EAS Development Build（开发构建）
本机为 Windows，**无法本地 `expo run:ios`**（需 macOS + Xcode）。必须使用 **EAS 云端构建**：

```bash
# 1) 安装并登录 EAS（需 Expo 账号）
npm i -g eas-cli
eas login

# 2) 云端构建 iOS 开发版（自动注入 expo-dev-client）
eas build --platform ios --profile development

# 3) 构建完成后，用 Expo Orbit 或 TestFlight/内部分发把 .ipa 安装到 iPhone
# 4) 启动开发服务器（开发构建模式）
npx expo start --dev-client
# 用 iPhone 上的开发构建 App 扫描终端二维码即可连接
```

- Android 开发构建同理：`eas build --platform android --profile development`（本地也可 `npx expo run:android`，需已装 Android SDK）。
- `eas.json` 已就绪：development（developmentClient）/ preview（内部分发）/ production 三个 profile。

### 真机联调的「后端地址」坑（必须处理）
`src/constants/config.ts` 的 `apiBaseUrl` 默认 `http://localhost:3000`。
- **真机上的 `localhost` 指向手机自己，而非开发电脑**，AI 后端将不可达。
- 联调解决二选一：
  1. 开发电脑与 iPhone 同一局域网，`app.config.ts` 的 `extra.apiBaseUrl` 改为电脑局域网 IP，例如 `http://192.168.1.20:3000`（并放行防火墙 3000 端口），然后重新 `eas build`；或
  2. 将 AI 后端部署到公网（见第八节），`apiBaseUrl` 指向公网地址。
- 未配置 AI Key 时，后端返回 `503 AI_NOT_CONFIGURED`，前端正确进入「暂时无法识别 → 手动添加/搜索」兜底，**不会伪造识别结果**。

---

## 三、真实相机功能核查（代码层，已确认正确）

文件 `src/screens/diet/AIFoodRecognitionScreen.tsx`：
- 进入页自动请求相机权限（`useCameraPermissions`），权限弹窗正常；
- 允许后渲染 `CameraView` 实时预览；`takePictureAsync()` 得到真实 `photo.uri`；
- 支持「重拍 / 确认照片 / 进入识别」；
- 识别中 Loading 覆盖层（识别食物 → 估算份量 → 分析营养 三步动画）；
- 权限被拒绝 → 提示「需要相机权限」并提供「去设置」；
- AI 未配置 / 识别失败 → 错误态，文案「暂时无法识别，请检查照片或手动添加」，并提供「手动搜索食物」「手动添加食物」入口，**不伪造真实结果**；
- Web 端：因无真实相机，显示「网页预览 · 暂不支持真实相机」+ 上传照片 / 演示图片兜底。

> 注意：相机能否在真机真实拍照、image URI 是否正常，**需在 iPhone 开发构建上实测**（详见第四节，本环境为远端代理，无法替你在物理设备操作相机）。

---

## 四、真机测试清单（需你在 iPhone 上执行）

下列项我已在代码/构建层验证可用，但「真机现象」需你用开发构建实测确认：

| 测试 | 预期 | 状态 |
| --- | --- | --- |
| Splash → 首页 | 无白屏、无闪退 | 代码确认 ✅ / 真机待测 |
| TabBar 正常 | 首页/饮食/＋/运动/我的 切换正常 | ✅ 待测 |
| 字体/图标/卡片 | 正常、无溢出 | ✅ 待测 |
| AI 拍照识别 | 权限→预览→拍照→识别→可改食物/份量→保存 | 代码完整 ✅ / 真机待测 |
| 搜索食物（鸡蛋/米饭/牛奶/香蕉） | 改份量→选餐次→保存，全页同步 | 代码完整 ✅ / 真机待测 |
| QuickAdd 反复 5 次 | 不白屏、不卡死、Sheet 可开关 | ✅ 待测 |
| 运动记录 | 类型/时长/强度→保存→首页/周报/AI 同步 | ✅ 待测 |
| 身体状态 | 能量/睡眠/心情/疲劳/酸痛/食欲/不适→同步 | ✅ 待测 |
| 周期开关 A/B | 关闭不出现、开启正常、改日期同步 | ✅ 待测 |
| 数据持久化 | 重启 App 数据仍在（MMKV） | 代码确认 ✅ / 真机待测 |
| 异常 11 项 | 无白屏/闪退/undefined/NaN | 已有兜底 ✅ / 真机待测 |
| Web 402×874 | 全页不白屏 | 预览已验证 ✅ |

---

## 五、安全检查（已通过）

- `src/` 客户端：**未发现**任何 `SecretId / SecretKey / AI_API_KEY / sk- / TENCENT / lke` 等密钥。
- `server/index.mjs`：密钥仅从 `process.env` 读取，无硬编码；未配置 Key 时返回 `503 AI_NOT_CONFIGURED`。
- `.env` 已被 `.gitignore` 忽略；`.env.example` 为示例（不含真实值）。
- `.env` 当前**不存在**（仅有 `.env.example`），不会被提交。

---

## 六、最终构建检查

- `npx tsc --noEmit`：**0 errors** ✅
- `npx expo-doctor`：**17/18**，仅 `.expo` 忽略项（因本机无 git，非阻塞）✅
- `package-lock.json` 存在；`app.json` 由 `app.config.ts` 提供；iOS/Android 配置完整；Camera 权限已配置（iOS `NSCameraUsageDescription`、Android `CAMERA` + `expo-camera` 插件）。

---

## 七、十六问·明确回答

| # | 问题 | 回答 |
| --- | --- | --- |
| 1 | 真机是否成功打开 | 代码/构建已就绪；**实际打开需你用 EAS 开发构建在 iPhone 上安装并连接**（本环境无法替你操作物理设备） |
| 2 | Expo Go 是否可用 | **否**（react-native-mmkv 原生模块不在 Expo Go 内） |
| 3 | 不能用则推荐什么 | **EAS Development Build**（`eas build --platform ios --profile development` 云端构建，Windows 无法本地 build iOS） |
| 4 | Camera 是否可真实拍照 | 代码完整（CameraView+takePictureAsync），**待你在真机实测** |
| 5 | image URI 是否正常 | 代码取 `photo.uri` 并预览，**待真机实测** |
| 6 | 搜索食物是否正常 | 代码完整可用，**待真机实测** |
| 7 | 饮食数据是否持久化 | MMKV 持久化已实现，**待真机重启验证** |
| 8 | 运动是否正常 | 代码完整，**待真机实测** |
| 9 | 身体状态是否正常 | 代码完整（周期关闭时不显示经期项），**待真机实测** |
| 10 | 周期是否正常 | 开关+同步逻辑完整，**待真机实测** |
| 11 | 重启 App 后数据是否存在 | MMKV 持久化，**待真机实测** |
| 12 | Web 是否正常 | **是**（8091 预览已验证，402×874 各页不白屏） |
| 13 | 是否还有白屏 | 代码层无已知白屏；**真机/Web 均未见**，待你复测确认 |
| 14 | 是否还有 Runtime Error | `tsc 0 errors`、Metro 启动无报错；**待真机实测** |
| 15 | TypeScript 是否 0 errors | **是** |
| 16 | expo-doctor 是否通过 | **17/18 通过**（唯一项因本机无 git 导致 .expo 忽略检查无效，非阻塞） |
| 17 | 是否达到正式部署条件 | **代码/构建/安全已达标；正式发布前需**：① 配置 `apiBaseUrl` 为后端地址并重 build；② 提供已配置 AI Key 的后端；③ 执行 `eas build --profile production`（未自动执行） |

---

## 八、部署准备

1. **当前 Expo SDK**：52（RN 0.76.9）
2. **是否需要 Development Build**：是（MMKV 原生模块）
3. **是否可以 Expo Go**：否
4. **iOS 构建方案**：`eas build --platform ios --profile development`（开发）/ `production`（发布），Windows 走云端
5. **Android 构建方案**：`eas build --platform android --profile development|production`（或本地 `expo run:android`）
6. **Backend 部署方案**：`server/index.mjs`（零依赖 Node http）可部署到任意 Node 服务（Railway / Render / 云函数 / 自有服务器）；需设置 `AI_API_KEY` 等环境变量；CORS 已放开
7. **环境变量列表**：`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`、`AI_TIMEOUT_MS`、`AI_DEMO`、`PORT`、`CORS_ORIGIN`（前端只读 `apiBaseUrl`，写于 `app.config.ts` 的 `extra`，由 EAS/env 注入）
8. **Camera 权限配置**：iOS `NSCameraUsageDescription`（已配）；Android `CAMERA` + `expo-camera` 插件（已配）
9. **AI API 配置**：仅后端 `AI_API_KEY`；前端无任何密钥
10. **当前已知问题**：
    - 真机 `localhost` 后端不可达 → 需改 `apiBaseUrl` 为局域网 IP 或公网地址后重新构建；
    - 本机无 git → `expo-doctor` 的 `.expo` 忽略项无法通过（用户机器 `git init` 即解决）；
    - 未配置 AI Key 时识别走「手动添加/搜索」兜底（预期行为，非缺陷）。

> 正式发布未自动执行（按你的要求）。需要我执行 `eas build --profile production` 时请确认账号与配额。
