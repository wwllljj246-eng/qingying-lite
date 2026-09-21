import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing, Image, Platform, Linking } from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
// expo-camera 仅在原生端真正使用相机；Web 端由上传 / 演示图片兜底
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ScreenContainer,
  Header,
  Typography,
  Card,
  Button,
  Icon,
} from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { MEAL_TYPE_LIST } from '@/constants';
import {
  recognizeFoodFromImage,
  recognizeFoodFromFile,
  FoodRecognitionError,
} from '@/services/ai/foodRecognition';
import { useFoodDraftStore } from '@/stores/foodDraftStore';
import type { RootStackParamList, MealType } from '@/types';

type Phase = 'idle' | 'preview' | 'recognizing' | 'error' | 'permission';

const STEPS = [
  { key: 'detect', label: '识别食物' },
  { key: 'portion', label: '估算份量' },
  { key: 'nutrition', label: '分析营养' },
];

/** 取景框四角 */
function CornerFrame() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[
        { top: 14, left: 14, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 14 },
        { top: 14, right: 14, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 14 },
        { bottom: 14, left: 14, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 14 },
        { bottom: 14, right: 14, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 14 },
      ].map((s, i) => (
        <View key={i} style={[styles.corner, s]} />
      ))}
    </View>
  );
}

export function AIFoodRecognitionScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AIFoodRecognition'>>();
  const navigation = useNavigation();
  const initDraft = useFoodDraftStore((s) => s.initDraft);

  const [mealType, setMealType] = useState<MealType>(route.params?.mealType ?? 'lunch');
  const [phase, setPhase] = useState<Phase>('idle');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [stepIndex, setStepIndex] = useState(-1);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const camRef = useRef<any>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 原生端：首次进入若未决定，自动请求相机权限
  useEffect(() => {
    if (Platform.OS !== 'web' && cameraPermission?.status === 'undetermined') {
      requestCameraPermission();
    }
  }, [cameraPermission?.status, requestCameraPermission]);

  // 识别中的柔和脉冲
  useEffect(() => {
    if (phase !== 'recognizing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  // 识别中的扫描线
  useEffect(() => {
    if (phase !== 'recognizing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, scanY]);

  /** 统一发起识别（原生相机 / 上传文件 / 演示图片共用） */
  const runRecognition = useCallback(
    async (source: { uri?: string; file?: unknown }) => {
      if (phase === 'recognizing') return;
      setPhase('recognizing');
      setStepIndex(0);
      const timers: Array<ReturnType<typeof setTimeout>> = [];
      timers.push(setTimeout(() => mounted.current && setStepIndex(1), 600));
      timers.push(setTimeout(() => mounted.current && setStepIndex(2), 1100));
      try {
        const result =
          source.file != null
            ? await recognizeFoodFromFile(source.file, mealType)
            : await recognizeFoodFromImage(source.uri as string, mealType);
        timers.forEach(clearTimeout);
        if (!mounted.current) return;
        setStepIndex(STEPS.length);
        // 预览图：文件场景用 objectURL；uri 场景直接用原 uri
        let previewUri = source.uri ?? '';
        if (source.file != null) {
          const g = globalThis as any;
          previewUri = g.URL?.createObjectURL ? g.URL.createObjectURL(source.file as Blob) : '';
        }
        await new Promise((r) => setTimeout(r, 280));
        if (!mounted.current) return;
        initDraft({
          mealType,
          items: result.items,
          imageUri: previewUri || source.uri,
          confidence: result.confidence,
          source: 'camera',
        });
        navigation.navigate('FoodRecognitionResult');
        setPhase('idle');
        setPhotoUri(null);
        setStepIndex(-1);
      } catch (e) {
        timers.forEach(clearTimeout);
        if (!mounted.current) return;
        setPhase('error');
        setErrorMsg(
          e instanceof FoodRecognitionError
            ? e.message
            : '暂时无法识别，请检查照片或手动添加',
        );
      }
    },
    [mealType, initDraft, navigation, phase],
  );

  /** 原生：拍照 */
  const takePicture = useCallback(async () => {
    if (!camRef.current) return;
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.7, base64: false });
      if (!mounted.current || !photo?.uri) return;
      setPhotoUri(photo.uri);
      setPhase('preview');
    } catch {
      setPhase('error');
      setErrorMsg('拍照失败，请重试');
    }
  }, []);

  /** 原生：重拍 */
  const retake = useCallback(() => {
    setPhotoUri(null);
    setPhase('idle');
  }, []);

  /** Web：打开文件选择器（上传照片 / 相册） */
  const openFilePicker = useCallback(() => {
    const g = globalThis as any;
    const doc = g.document;
    if (!doc) return;
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev: any) => {
      const file = ev?.target?.files?.[0];
      if (file) runRecognition({ file });
    };
    input.click();
  }, [runRecognition]);

  /** 演示图片（无设备相机 / 无 Key 时也能体验完整流程） */
  const runDemo = useCallback(() => {
    runRecognition({ uri: 'demo://demo' });
  }, [runRecognition]);

  /** 手动添加（权限拒绝 / 相册不可用时兜底） */
  const startManual = useCallback(() => {
    initDraft({ mealType, items: [], imageUri: undefined, confidence: 0 });
    navigation.navigate('FoodRecognitionResult');
  }, [initDraft, mealType, navigation]);

  /** 手动搜索食物（识别失败后的兜底路径，进入搜索流程） */
  const startManualSearch = useCallback(() => {
    navigation.navigate('FoodSearch', { mealType });
  }, [mealType, navigation]);

  /** 跳转系统设置（权限被拒绝时） */
  const openSettings = useCallback(() => {
    if (Linking.openSettings) Linking.openSettings();
    else Linking.openURL('app-settings:');
  }, []);

  const retry = useCallback(() => {
    setPhase('idle');
    setStepIndex(-1);
    setErrorMsg('');
  }, []);

  // Web 端：始终使用上传 / 演示图片兜底
  const viewMode: 'webFallback' | 'camera' | 'permission' =
    Platform.OS === 'web'
      ? 'webFallback'
      : cameraPermission?.status === 'granted'
        ? 'camera'
        : 'permission';

  // 权限被拒绝时的提示文案（区分 web / native）
  const permissionDenied = viewMode === 'permission' && cameraPermission?.status === 'denied';

  return (
    <ScreenContainer scroll>
      <Header
        title="AI 识别饮食"
        subtitle="拍下你的餐食，轻盈帮你快速分析"
        onLeftPress={() => navigation.goBack()}
      />

      {/* 餐次选择 */}
      <View style={styles.mealRow}>
        {MEAL_TYPE_LIST.map((m) => {
          const active = m.key === mealType;
          return (
            <Pressable
              key={m.key}
              onPress={() => viewMode !== 'camera' && setMealType(m.key)}
              hitSlop={6}
              style={[styles.mealChip, active && styles.mealChipOn]}
            >
              <Typography variant="captionStrong" style={{ color: active ? semantic.surface : semantic.textSecondary }}>
                {m.emoji} {m.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {/* 拍照区域 */}
      <Card radius="large" padding={0} style={styles.cameraCard}>
        <View style={styles.viewfinder}>
          {/* 原生相机实时预览 */}
          {viewMode === 'camera' ? (
            <CameraView ref={camRef as any} style={styles.camera} facing="back" />
          ) : null}

          {/* 预览刚拍的照片 */}
          {viewMode === 'camera' && phase === 'preview' && photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.camera} resizeMode="cover" />
          ) : null}

          <CornerFrame />

          {/* Web 兜底：上传 / 演示图片 */}
          {viewMode === 'webFallback' ? (
            <View style={styles.fallbackWrap}>
              <View style={[styles.aiBadge, { backgroundColor: semantic.accentAISoft }]}>
                <Icon name="camera" size={24} color={semantic.accentAI} strokeWidth={2.2} />
              </View>
              <Typography variant="bodyStrong" style={styles.fallbackTitle}>
                网页预览 · 暂不支持真实相机
              </Typography>
              <Typography variant="caption" color="secondary" align="center" style={styles.fallbackHint}>
                当前为网页预览环境，暂不支持调用真实摄像头。你可以上传一张餐食照片，或使用演示图片体验完整识别流程
              </Typography>
              <View style={styles.fallbackBtns}>
                <Button title="上传照片" variant="primary" iconLeft="upload" onPress={openFilePicker} />
                <Button title="使用演示图片" variant="secondary" iconLeft="sparkles" onPress={runDemo} />
              </View>
              <Button title="手动添加食物" variant="ghost" onPress={startManual} style={{ marginTop: spacing.sm }} />
            </View>
          ) : null}

          {/* 权限未授予（原生） */}
          {viewMode === 'permission' ? (
            <View style={styles.fallbackWrap}>
              <View style={[styles.aiBadge, { backgroundColor: semantic.accentAISoft }]}>
                <Icon name="camera" size={24} color={semantic.accentAI} strokeWidth={2.2} />
              </View>
              <Typography variant="bodyStrong" style={styles.fallbackTitle}>
                {permissionDenied ? '需要相机权限才能识别食物' : '开启相机以拍摄饮食'}
              </Typography>
              <Typography variant="caption" color="secondary" align="center" style={styles.fallbackHint}>
                {permissionDenied
                  ? '需要相机权限才能识别食物，请在系统设置中开启后重试'
                  : '允许相机后，即可拍摄餐食进行 AI 识别'}
              </Typography>
              {permissionDenied ? (
                <View style={styles.fallbackBtns}>
                  <Button title="去设置" variant="primary" iconLeft="settings" onPress={openSettings} />
                  <Button title="返回" variant="secondary" onPress={() => navigation.goBack()} />
                </View>
              ) : (
                <Button
                  title="开启相机权限"
                  variant="primary"
                  iconLeft="camera"
                  onPress={() => requestCameraPermission()}
                  style={{ marginTop: spacing.md }}
                />
              )}
              <Typography variant="micro" color="tertiary" align="center" style={{ marginTop: spacing.md }}>
                Web 端可使用「上传照片 / 演示图片」
              </Typography>
            </View>
          ) : null}

          {/* 识别中：Loading 覆盖层（原生相机 / 上传 / 演示共用） */}
          {phase === 'recognizing' ? (
            <View style={styles.loadingOverlay}>
              <Animated.View style={[styles.aiBadge, { transform: [{ scale: pulse }] }]}>
                <Icon name="sparkles" size={22} color={semantic.accentAI} strokeWidth={2.2} />
              </Animated.View>
              <Typography variant="bodyStrong" style={styles.loadingTitle}>
                正在识别食物…
              </Typography>
              <View style={styles.stepList}>
                {STEPS.map((s, i) => {
                  const done = stepIndex > i;
                  const current = stepIndex === i;
                  return (
                    <View key={s.key} style={styles.stepRow}>
                      <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                        {done ? <Icon name="check" size={11} color={semantic.surface} strokeWidth={3} /> : null}
                      </View>
                      <Typography
                        variant="caption"
                        color={done || current ? 'primary' : 'tertiary'}
                        weight={current ? '600' : '400'}
                      >
                        {s.label}
                      </Typography>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* 预览态：确认 / 重拍（原生相机） */}
          {viewMode === 'camera' && phase === 'preview' ? (
            <View style={styles.previewActions}>
              <Button title="重拍" variant="secondary" iconLeft="camera" onPress={retake} />
              <Button title="确认照片" variant="primary" iconLeft="check" onPress={() => runRecognition({ uri: photoUri as string })} />
            </View>
          ) : null}

          {/* 错误态 */}
          {phase === 'error' ? (
            <View style={styles.loadingOverlay}>
              <View style={[styles.aiBadge, { backgroundColor: semantic.accentDietSoft }]}>
                <Icon name="camera" size={22} color={palette.pink400} strokeWidth={2.2} />
              </View>
              <Typography variant="bodyStrong" style={styles.loadingTitle}>
                {errorMsg}
              </Typography>
              <Typography variant="caption" color="secondary" align="center" style={styles.errHint}>
                光线充足、餐盘居中时识别效果更好
              </Typography>
              <Button title="重新拍摄 / 重选" variant="primary" iconLeft="camera" onPress={retry} style={{ marginTop: spacing.md }} />
              <Button title="使用演示数据继续" variant="secondary" iconLeft="sparkles" onPress={runDemo} style={{ marginTop: spacing.sm }} />
              <Button title="手动搜索食物" variant="ghost" iconLeft="search" onPress={startManualSearch} style={{ marginTop: spacing.sm }} />
              <Button title="手动添加食物" variant="ghost" onPress={startManual} style={{ marginTop: spacing.sm }} />
            </View>
          ) : null}

          {/* 原生相机：快门按钮（idle） */}
          {viewMode === 'camera' && phase === 'idle' ? (
            <View style={styles.shutterWrap}>
              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <Pressable onPress={takePicture} style={({ pressed }) => [styles.shutter, pressed && { opacity: 0.85 }]}>
                  <Icon name="camera" size={30} color={semantic.surface} strokeWidth={2.2} />
                </Pressable>
              </Animated.View>
              <Typography variant="caption" style={styles.shutterHint}>
                点击拍照识别
              </Typography>
            </View>
          ) : null}
        </View>
      </Card>

      {/* 底部说明 */}
      <View style={styles.tips}>
        <View style={styles.tipRow}>
          <Icon name="sparkles" size={14} color={semantic.accentAI} />
          <Typography variant="caption" color="secondary" style={{ marginLeft: 6 }}>
            AI 会自动识别食物并估算份量，识别结果可随时修改
          </Typography>
        </View>
      </View>
    </ScreenContainer>
  );
}

export default AIFoodRecognitionScreen;

const styles = StyleSheet.create({
  mealRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mealChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.button,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  mealChipOn: {
    backgroundColor: semantic.primary,
    borderColor: semantic.primary,
  },
  cameraCard: {
    overflow: 'hidden',
  },
  viewfinder: {
    height: 380,
    backgroundColor: palette.purple50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: semantic.accentAI,
  },
  fallbackWrap: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  fallbackTitle: {
    marginTop: spacing.md,
    color: semantic.textPrimary,
  },
  fallbackHint: {
    marginTop: spacing.xs,
  },
  fallbackBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  shutterWrap: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: radii.pill,
    backgroundColor: semantic.accentAI,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
    borderWidth: 4,
    borderColor: semantic.surface,
  },
  shutterHint: {
    marginTop: spacing.sm,
    color: semantic.surface,
  },
  previewActions: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(254,255,250,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  aiBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: semantic.accentAISoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  loadingTitle: {
    marginTop: spacing.md,
    color: semantic.textPrimary,
  },
  stepList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: semantic.border,
    backgroundColor: semantic.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: semantic.primary,
    borderColor: semantic.primary,
  },
  stepDotCurrent: {
    borderColor: semantic.accentAI,
  },
  errHint: {
    marginTop: spacing.xs,
  },
  tips: {
    marginTop: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
