import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ModalSheet, Typography, Button, Input, Icon } from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { useWeightStore } from '@/stores/weightStore';
import { useWaterStore } from '@/stores/waterStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useCycleStore } from '@/stores/cycleStore';
import { EXERCISE_TYPE_LIST, EXERCISE_INTENSITY_LIST, getExerciseTypeInfo, MEAL_TYPE_LIST } from '@/constants';
import { todayISO } from '@/utils/date';
import { navigate } from '@/navigation';
import type {
  MealType,
  ExerciseType,
  ExerciseIntensity,
  Level3,
  Severity,
  Appetite,
  PeriodFlow,
  Rating,
} from '@/types';

export interface PlaceholderSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  hint?: string;
}

/* ---------------- 身体状态 · 选项与通用选择控件 ---------------- */

/** 精力：😴很低 / 😐一般 / 🙂不错 / 😊很好 / ⚡充沛 */
const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: '很低' },
  { value: 2, emoji: '😐', label: '一般' },
  { value: 3, emoji: '🙂', label: '不错' },
  { value: 4, emoji: '😊', label: '很好' },
  { value: 5, emoji: '⚡', label: '充沛' },
] as const;

/** 心情：😞 / 😐 / 🙂 / 😊 / 🥰 */
const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: '差' },
  { value: 2, emoji: '😐', label: '一般' },
  { value: 3, emoji: '🙂', label: '还行' },
  { value: 4, emoji: '😊', label: '不错' },
  { value: 5, emoji: '🥰', label: '超好' },
] as const;

const FATIGUE_OPTIONS = [
  { key: 'low', label: '低' },
  { key: 'medium', label: '中' },
  { key: 'high', label: '高' },
] as const;

const SORENESS_OPTIONS = [
  { key: 'none', label: '无' },
  { key: 'mild', label: '轻微' },
  { key: 'obvious', label: '明显' },
] as const;

const APPETITE_OPTIONS = [
  { key: 'low', label: '低' },
  { key: 'normal', label: '正常' },
  { key: 'strong', label: '较强' },
] as const;

const PERIOD_OPTIONS = [
  { key: undefined, label: '无' },
  { key: 'light', label: '量少' },
  { key: 'medium', label: '量中' },
  { key: 'heavy', label: '量多' },
] as const;

/** 表情单选（精力 / 心情） */
function EmojiChoice<T extends number>({
  options,
  value,
  onSelect,
}: {
  options: ReadonlyArray<{ value: T; emoji: string; label: string }>;
  value: T | undefined;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.choiceRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onSelect(o.value)}
            style={[styles.choiceChip, active && styles.choiceChipOn]}
          >
            <Typography variant="h3" style={{ marginBottom: 2 }}>
              {o.emoji}
            </Typography>
            <Typography
              variant="captionStrong"
              style={{ color: active ? semantic.surface : semantic.textSecondary }}
            >
              {o.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 三档 / 多档段选择（疲劳 / 肌肉酸痛 / 食欲 / 身体不适 / 周期） */
function SegmentChoice<T extends string | undefined>({
  options,
  value,
  onSelect,
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T | undefined;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.segRow}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            onPress={() => onSelect(o.key)}
            style={[styles.segChip, active && styles.segChipOn]}
          >
            <Typography
              variant="captionStrong"
              style={{ color: active ? semantic.surface : semantic.textSecondary }}
            >
              {o.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="captionStrong" color="secondary" style={{ marginBottom: spacing.md }}>
      {children}
    </Typography>
  );
}

/** 拍照饮食 — 选择餐次后进入 AI 拍照识别页 */
export function TakePhotoDietSheet({ visible, onDismiss }: PlaceholderSheetProps) {
  const [mealType, setMealType] = useState<MealType>(() => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 17) return 'snack';
    return 'dinner';
  });
  if (!visible) return null;

  const go = () => {
    onDismiss();
    // 稍等弹层收起后再压栈，避免转场重叠
    setTimeout(() => navigate('AIFoodRecognition', { mealType }), 120);
  };

  return (
    <ModalSheet title="拍照识别食物" onDismiss={onDismiss} snapPoints={['48%']}>
      <Typography variant="caption" color="secondary">
        这顿是哪一餐？
      </Typography>
      <View style={styles.mealGrid}>
        {MEAL_TYPE_LIST.map((m) => {
          const active = m.key === mealType;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMealType(m.key)}
              style={[styles.mealItem, active && styles.mealItemOn]}
            >
              <Typography variant="h2">{m.emoji}</Typography>
              <Typography
                variant="captionStrong"
                style={{ marginTop: 4, color: active ? semantic.primary : semantic.textSecondary }}
              >
                {m.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      <Button title="开始拍照识别" variant="ai" iconLeft="camera" fullWidth onPress={go} />
      <Typography variant="micro" color="tertiary" align="center">
        拍照后由 AI 识别食物；网页预览可上传照片或用演示图片体验
      </Typography>
    </ModalSheet>
  );
}

/** 记录体重 */
export function RecordWeightSheet({ visible, onDismiss }: PlaceholderSheetProps) {
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const add = useWeightStore((s) => s.add);
  if (!visible) return null;

  const save = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    add({ weight: w, note: note || undefined });
    setWeight('');
    setNote('');
    onDismiss();
  };

  return (
    <ModalSheet title="记录体重" onDismiss={onDismiss} snapPoints={['45%']}>
      <View style={{ gap: 16 }}>
        <Input label="体重 (kg)" placeholder="例如 52.4" keyboardType="decimal-pad" rightText="kg" value={weight} onChangeText={setWeight} />
        <Input label="备注（可选）" placeholder="睡前 / 饭后 / 空腹…" value={note} onChangeText={setNote} />
        <Button title="保存" variant="primary" fullWidth disabled={!weight} onPress={save} />
      </View>
    </ModalSheet>
  );
}

/** 记录饮水 */
export function RecordWaterSheet({ visible, onDismiss }: PlaceholderSheetProps) {
  const [amount, setAmount] = useState('');
  const addWater = useWaterStore((s) => s.addWater);
  if (!visible) return null;

  const save = () => {
    const a = parseInt(amount, 10);
    if (!a || a <= 0) return;
    addWater(a);
    setAmount('');
    onDismiss();
  };

  return (
    <ModalSheet title="记录饮水" onDismiss={onDismiss} snapPoints={['40%']}>
      <View style={{ gap: 16 }}>
        <Input label="饮水量 (ml)" placeholder="例如 250" keyboardType="number-pad" rightText="ml" value={amount} onChangeText={setAmount} />
        <Button title="保存" variant="primary" fullWidth disabled={!amount} onPress={save} />
      </View>
    </ModalSheet>
  );
}

/** 记录身体状态 */
export function RecordBodyStatusSheet({ visible, onDismiss }: PlaceholderSheetProps) {
  const [energy, setEnergy] = useState<Rating | undefined>(undefined);
  const [mood, setMood] = useState<Rating | undefined>(undefined);
  const [sleep, setSleep] = useState('');
  const [fatigue, setFatigue] = useState<Level3 | undefined>(undefined);
  const [muscleSoreness, setMuscleSoreness] = useState<Severity | undefined>(undefined);
  const [appetite, setAppetite] = useState<Appetite | undefined>(undefined);
  const [discomfort, setDiscomfort] = useState<Severity | undefined>(undefined);
  const [periodFlow, setPeriodFlow] = useState<PeriodFlow | undefined>(undefined);
  const [note, setNote] = useState('');

  const setForDate = useBodyStatusStore((s) => s.setForDate);
  const cycleEnabled = useCycleStore((s) => s.enabled);

  // 打开时回填当天已有记录，避免重复录入
  const todayRec = useBodyStatusStore((s) => s.records.find((r) => r.date === todayISO()));
  useEffect(() => {
    if (!visible) return;
    setEnergy(todayRec?.energy);
    setMood(todayRec?.mood);
    setSleep(todayRec?.sleepHours != null ? String(todayRec.sleepHours) : '');
    setFatigue(todayRec?.fatigue);
    setMuscleSoreness(todayRec?.muscleSoreness);
    setAppetite(todayRec?.appetite);
    setDiscomfort(todayRec?.discomfort);
    setPeriodFlow(todayRec?.periodFlow);
    setNote(todayRec?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  // 至少填写一项核心信息才可保存
  const canSave =
    sleep.trim() !== '' || energy != null || mood != null || note.trim() !== '';

  const save = () => {
    const s = parseFloat(sleep);
    setForDate({
      energy,
      mood,
      sleepHours: s > 0 ? s : undefined,
      fatigue,
      muscleSoreness,
      appetite,
      discomfort,
      periodFlow: cycleEnabled ? periodFlow : undefined,
      note: note || undefined,
    });
    onDismiss();
  };

  return (
    <ModalSheet
      title="记录身体状态"
      onDismiss={onDismiss}
      snapPoints={['94%']}
      scrollable
      footer={
        <Button title="保存" variant="primary" fullWidth disabled={!canSave} onPress={save} />
      }
    >
      <View style={styles.bodyForm}>
        {/* 精力 */}
        <View style={styles.fieldBlock}>
          <FieldLabel>精力</FieldLabel>
          <EmojiChoice options={ENERGY_OPTIONS} value={energy} onSelect={setEnergy} />
        </View>

        {/* 睡眠 */}
        <View style={styles.fieldBlock}>
          <Input
            label="睡眠时长 (h)"
            placeholder="例如 7.5"
            keyboardType="decimal-pad"
            rightText="h"
            value={sleep}
            onChangeText={setSleep}
            style={{ height: 60 }}
          />
        </View>

        {/* 心情 */}
        <View style={styles.fieldBlock}>
          <FieldLabel>心情</FieldLabel>
          <EmojiChoice options={MOOD_OPTIONS} value={mood} onSelect={setMood} />
        </View>

        {/* 疲劳 */}
        <View style={styles.fieldBlock}>
          <FieldLabel>疲劳</FieldLabel>
          <SegmentChoice options={FATIGUE_OPTIONS} value={fatigue} onSelect={setFatigue} />
        </View>

        {/* 肌肉酸痛 */}
        <View style={styles.fieldBlock}>
          <FieldLabel>肌肉酸痛</FieldLabel>
          <SegmentChoice options={SORENESS_OPTIONS} value={muscleSoreness} onSelect={setMuscleSoreness} />
        </View>

        {/* 食欲 */}
        <View style={styles.fieldBlock}>
          <FieldLabel>食欲</FieldLabel>
          <SegmentChoice options={APPETITE_OPTIONS} value={appetite} onSelect={setAppetite} />
        </View>

        {/* 身体不适 */}
        <View style={styles.fieldBlock}>
          <FieldLabel>身体不适</FieldLabel>
          <SegmentChoice options={SORENESS_OPTIONS} value={discomfort} onSelect={setDiscomfort} />
        </View>

        {/* 周期相关（仅开启周期管理时显示） */}
        {cycleEnabled ? (
          <View style={styles.fieldBlock}>
            <FieldLabel>经期状态</FieldLabel>
            <SegmentChoice options={PERIOD_OPTIONS} value={periodFlow} onSelect={setPeriodFlow} />
          </View>
        ) : null}

        {/* 备注 */}
        <View style={styles.fieldBlock}>
          <Input
            label="备注（可选）"
            placeholder="今天有什么特别的感受？（选填）"
            multiline
            numberOfLines={2}
            value={note}
            onChangeText={setNote}
            style={{ height: 84, textAlignVertical: 'top' }}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

/** 记录运动 */
export function RecordExerciseSheet({ visible, onDismiss }: PlaceholderSheetProps) {
  const [duration, setDuration] = useState('');
  const [type, setType] = useState<ExerciseType>('walking');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('medium');
  const [typeOpen, setTypeOpen] = useState(false);
  const addExercise = useExerciseStore((s) => s.addExercise);
  if (!visible) return null;

  const typeInfo = getExerciseTypeInfo(type);

  const save = () => {
    const d = parseInt(duration, 10);
    if (!d || d <= 0) return;
    // 按所选运动类型的 MET × 强度系数 估算热量
    const met = typeInfo.metValue;
    const mult = EXERCISE_INTENSITY_LIST.find((i) => i.key === intensity)?.multiplier ?? 1;
    const calories = Math.round((d * met * 3.5 * 60 * mult) / 200);
    addExercise({ type, duration: d, intensity, caloriesBurned: calories });
    setDuration('');
    setType('walking');
    setIntensity('medium');
    setTypeOpen(false);
    onDismiss();
  };

  return (
    <ModalSheet title="记录运动" onDismiss={onDismiss} snapPoints={['70%']}>
      <View style={{ gap: 16 }}>
        {/* 运动类型：点击在同页内展开选择器，避免嵌套 BottomSheet 在 Web 下的不稳定 */}
        <Pressable onPress={() => setTypeOpen((v) => !v)}>
          <View style={styles.typeField}>
            <Typography variant="captionStrong" color="secondary">运动类型</Typography>
            <View style={[styles.typeValue, { marginTop: spacing.xs }]}>
              <Typography variant="h3" style={{ marginRight: spacing.sm }}>{typeInfo.emoji}</Typography>
              <Typography variant="body" style={{ color: semantic.textPrimary }}>{typeInfo.label}</Typography>
              <View style={{ marginLeft: 'auto' }}>
                <Icon name={typeOpen ? 'chevron-up' : 'chevron-down'} size={18} color={semantic.textTertiary} />
              </View>
            </View>
          </View>
        </Pressable>

        {typeOpen ? (
          <View style={styles.typeGrid}>
            {EXERCISE_TYPE_LIST.map((t) => {
              const active = t.key === type;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    setType(t.key);
                    setTypeOpen(false);
                  }}
                  style={[styles.mealItem, { flexBasis: '31%', flexGrow: 0 }, active && styles.mealItemOn]}
                >
                  <Typography variant="h2">{t.emoji}</Typography>
                  <Typography
                    variant="captionStrong"
                    style={{ marginTop: 4, color: active ? semantic.primary : semantic.textSecondary }}
                  >
                    {t.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View>
          <Typography variant="captionStrong" color="secondary" style={{ marginBottom: spacing.xs }}>
            运动强度
          </Typography>
          <View style={styles.intensityRow}>
            {EXERCISE_INTENSITY_LIST.map((it) => {
              const active = it.key === intensity;
              return (
                <Pressable
                  key={it.key}
                  onPress={() => setIntensity(it.key)}
                  hitSlop={6}
          style={[styles.intensityChip, active && styles.intensityChipOn]}
                >
                  <Typography variant="captionStrong" style={{ color: active ? semantic.surface : semantic.textSecondary }}>
                    {it.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Input label="时长 (分钟)" placeholder="例如 30" keyboardType="number-pad" rightText="min" value={duration} onChangeText={setDuration} />
        <Button title="保存" variant="primary" fullWidth disabled={!duration} onPress={save} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  mealGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.smallCard,
    backgroundColor: semantic.surface,
    borderWidth: 1.5,
    borderColor: semantic.border,
  },
  mealItemOn: {
    borderColor: semantic.accentAI,
    backgroundColor: semantic.accentAISoft,
  },
  typeField: {},
  typeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.surface,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: semantic.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  intensityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  intensityChipOn: {
    backgroundColor: semantic.primary,
    borderColor: semantic.primary,
  },
  fieldBlock: {
    width: '100%',
  },
  bodyForm: {
    width: '100%',
    gap: spacing.xl,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  choiceChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: spacing.xs,
    borderRadius: radii.button,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  choiceChipOn: {
    backgroundColor: semantic.primary,
    borderColor: semantic.primary,
  },
  segRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  segChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  segChipOn: {
    backgroundColor: semantic.primary,
    borderColor: semantic.primary,
  },
});
