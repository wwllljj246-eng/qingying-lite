import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ScreenContainer,
  Header,
  Typography,
  Card,
  Button,
  Input,
  Icon,
  EmptyState,
  ModalSheet,
} from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { MEAL_TYPE_LIST, MACRO_META } from '@/constants';
import { useFoodDraftStore, draftTotals } from '@/stores/foodDraftStore';
import type { FoodItem } from '@/types';

/** 份量快捷选项（按单位） */
function portionPresets(unit?: string): number[] {
  if (unit && unit !== 'g' && unit !== 'ml') return [0.5, 1, 1.5, 2];
  return [50, 100, 150, 200, 250];
}

const UNIT_OPTIONS = ['g', 'ml', '个', '碗', '份'];

/* ---------------- 编辑单个食物 ---------------- */
function EditFoodSheet({
  visible,
  food,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  food: FoodItem | null;
  onClose: () => void;
  onSave: (name: string, portion: number) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState('');
  const [portion, setPortion] = useState('');

  React.useEffect(() => {
    if (food) {
      setName(food.name);
      setPortion(String(food.portion));
    }
  }, [food]);

  if (!visible || !food) return null;

  const unit = food.unit ?? 'g';
  const num = parseFloat(portion);
  const valid = name.trim().length > 0 && Number.isFinite(num) && num > 0;
  const ratio = valid ? num / food.portion : 0;
  const preview = {
    calories: Math.max(1, Math.round(food.calories * ratio)),
    protein: +(food.protein * ratio).toFixed(1),
    carbs: +(food.carbs * ratio).toFixed(1),
    fat: +(food.fat * ratio).toFixed(1),
  };

  return (
    <ModalSheet title="修改食物" snapPoints={['70%']} onDismiss={onClose}>
      <Input label="食物名称" value={name} onChangeText={setName} />
      <View style={{ gap: spacing.xs }}>
        <Typography variant="captionStrong" color="secondary">份量（{unit}）</Typography>
        <View style={styles.presetRow}>
          {portionPresets(unit).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPortion(String(p))}
              hitSlop={6}
        style={[styles.presetChip, num === p && styles.presetChipOn]}
            >
              <Typography variant="captionStrong" style={{ color: num === p ? semantic.surface : semantic.textSecondary }}>
                {p}
              </Typography>
            </Pressable>
          ))}
        </View>
        <Input
          placeholder={`自定义份量（${unit}）`}
          keyboardType="decimal-pad"
          rightText={unit}
          value={portion}
          onChangeText={setPortion}
        />
      </View>

      {/* 修改后的营养预览 */}
      {valid ? (
        <View style={styles.previewBox}>
          <View style={styles.previewRow}>
            <Typography variant="caption" color="secondary">约</Typography>
            <Typography variant="numberSmall" color="primary" style={{ marginLeft: 6 }}>
              {preview.calories}
            </Typography>
            <Typography variant="caption" color="secondary">kcal</Typography>
          </View>
          <View style={styles.previewMacros}>
            <Typography variant="micro" color="tertiary">蛋白质 {preview.protein}g</Typography>
            <Typography variant="micro" color="tertiary">碳水 {preview.carbs}g</Typography>
            <Typography variant="micro" color="tertiary">脂肪 {preview.fat}g</Typography>
          </View>
        </View>
      ) : null}

      <Button title="保存修改" variant="primary" fullWidth disabled={!valid} onPress={() => onSave(name.trim(), num)} />
      <Button
        title="删除这个食物"
        variant="ghost"
        fullWidth
        onPress={() => {
          onDelete();
          onClose();
        }}
        style={{ marginTop: -4 }}
      />
    </ModalSheet>
  );
}

/* ---------------- 手动添加食物 ---------------- */
function AddFoodSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: Omit<FoodItem, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const reset = () => {
    setName(''); setAmount(''); setUnit('g'); setCalories(''); setProtein(''); setCarbs(''); setFat('');
  };

  if (!visible) return null;

  const numAmount = parseFloat(amount);
  const numCal = parseFloat(calories);
  const valid = name.trim().length > 0 && Number.isFinite(numAmount) && numAmount > 0 && Number.isFinite(numCal) && numCal > 0;

  const save = () => {
    onAdd({
      name: name.trim(),
      portion: numAmount,
      unit,
      calories: Math.round(numCal),
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      source: 'manual',
    });
    reset();
    onClose();
  };

  return (
    <ModalSheet title="添加食物" snapPoints={['85%']} onDismiss={onClose}>
      <Input label="食物名称" placeholder="例如 鸡胸肉" value={name} onChangeText={setName} />
      <Input
        label="份量"
        placeholder="例如 100"
        keyboardType="decimal-pad"
        rightText={unit}
        value={amount}
        onChangeText={setAmount}
      />
      <View style={{ gap: spacing.xs }}>
        <Typography variant="captionStrong" color="secondary">单位</Typography>
        <View style={styles.presetRow}>
          {UNIT_OPTIONS.map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)} hitSlop={6} style={[styles.presetChip, unit === u && styles.presetChipOn]}>
              <Typography variant="captionStrong" style={{ color: unit === u ? semantic.surface : semantic.textSecondary }}>
                {u}
              </Typography>
            </Pressable>
          ))}
        </View>
      </View>
      <Input label="热量 (kcal)" placeholder="例如 120" keyboardType="decimal-pad" rightText="kcal" value={calories} onChangeText={setCalories} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input label="蛋白质 (g)" placeholder="0" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="碳水 (g)" placeholder="0" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="脂肪 (g)" placeholder="0" keyboardType="decimal-pad" value={fat} onChangeText={setFat} />
        </View>
      </View>
      <Button title="添加" variant="primary" fullWidth disabled={!valid} onPress={save} />
    </ModalSheet>
  );
}

/* ---------------- 主页面 ---------------- */
export function FoodRecognitionResultScreen() {
  const navigation = useNavigation();
  const draft = useFoodDraftStore((s) => s.draft);
  const updateItem = useFoodDraftStore((s) => s.updateItem);
  const updatePortion = useFoodDraftStore((s) => s.updatePortion);
  const removeItem = useFoodDraftStore((s) => s.removeItem);
  const addItem = useFoodDraftStore((s) => s.addItem);
  const setMealType = useFoodDraftStore((s) => s.setMealType);

  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);

  const totals = useMemo(() => draftTotals(draft), [draft]);

  if (!draft) {
    // 草稿丢失（冷启动 / 异常返回）时的兜底空状态
    return (
      <ScreenContainer scroll>
        <Header title="识别完成" subtitle="请确认识别结果" onLeftPress={() => navigation.goBack()} />
        <Card>
          <EmptyState
            icon="🥗"
            title="还没有识别结果"
            description="返回重新拍一张吧"
            actionLabel="返回拍照"
            onAction={() => navigation.goBack()}
            compact
          />
        </Card>
      </ScreenContainer>
    );
  }

  const mealLabel = MEAL_TYPE_LIST.find((m) => m.key === draft.mealType)?.label ?? '';

  return (
    <View style={styles.root}>
      <ScreenContainer scroll>
        <Header title="识别完成" subtitle="请确认识别结果" onLeftPress={() => navigation.goBack()} />

        {/* AI 置信度 */}
        <View style={styles.confRow}>
          <View style={styles.confPill}>
            <Icon name="sparkles" size={13} color={semantic.accentAI} />
            <Typography variant="captionStrong" color="aiAccent" style={{ marginLeft: 4 }}>
              AI 识别成功 · 置信度 {Math.round(draft.confidence * 100)}%
            </Typography>
          </View>
        </View>

        {/* 低置信度提醒：识别结果仅供参考，需用户核对后再保存 */}
        {draft.confidence > 0 && draft.confidence < 0.6 ? (
          <View style={styles.warnBox}>
            <Typography variant="caption" color="secondary">
              ⚠️ 识别置信度较低，结果仅供参考，请仔细核对后再保存
            </Typography>
          </View>
        ) : null}

        {/* 照片预览（真实拍照 / 上传场景才有） */}
        {draft.imageUri && !/^(mock|demo):\/\//.test(draft.imageUri) ? (
          <Card radius="large" padding={0} style={styles.photoPreview}>
            <Image source={{ uri: draft.imageUri }} style={styles.photo} resizeMode="cover" />
            <View style={styles.photoCap}>
              <Icon name="camera" size={13} color={semantic.accentAI} />
              <Typography variant="caption" color="secondary" style={{ marginLeft: 4 }}>
                已记录这张照片
              </Typography>
            </View>
          </Card>
        ) : null}

        {/* 餐次 */}
        <View style={styles.mealRow}>
          {MEAL_TYPE_LIST.map((m) => {
            const active = m.key === draft.mealType;
            return (
              <Pressable key={m.key} onPress={() => setMealType(m.key)} hitSlop={6} style={[styles.mealChip, active && styles.mealChipOn]}>
                <Typography variant="captionStrong" style={{ color: active ? semantic.surface : semantic.textSecondary }}>
                  {m.emoji} {m.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>

        {/* 食物列表 */}
        {draft.items.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md }}>
            <Typography variant="h2">🍽️</Typography>
            <Typography variant="body" color="secondary" align="center">
              {draft.imageUri
                ? '没有识别到明确的食物\n可手动添加，或返回重新拍摄'
                : '还没有添加食物\n手动添加一个吧'}
            </Typography>
            <Button title="＋ 添加食物" variant="secondary" onPress={() => setAdding(true)} />
          </Card>
        ) : (
          <Card radius="large" padding={0} style={styles.listCard}>
            {draft.items.map((it) => (
              <FoodRow
                key={it.id}
                food={it}
                onPress={() => setEditing(it)}
                onDelete={() => removeItem(it.id)}
              />
            ))}
            <Pressable onPress={() => setAdding(true)} style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}>
              <View style={styles.addIcon}>
                <Icon name="plus" size={15} color={semantic.primary} strokeWidth={2.5} />
              </View>
              <Typography variant="captionStrong" color="primary">添加食物</Typography>
            </Pressable>
          </Card>
        )}

        {/* 总计 */}
        <Card style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Typography variant="captionStrong" color="secondary">
              {mealLabel}总计
            </Typography>
            <View style={styles.totalCal}>
              <Typography variant="numberSmall" color="primary">{totals.calories}</Typography>
              <Typography variant="caption" color="secondary" style={{ marginLeft: 4 }}>kcal</Typography>
            </View>
          </View>
          <View style={styles.totalMacros}>
            {MACRO_META.map((m) => (
              <View key={m.key} style={styles.totalMacroItem}>
                <Typography variant="caption" color="secondary">{m.label}</Typography>
                <Typography variant="captionStrong">
                  {Math.round(totals[m.key])}g
                </Typography>
              </View>
            ))}
          </View>
        </Card>
      </ScreenContainer>

      {/* 底部操作条 */}
      <View style={styles.footer}>
        <Button
          title="下一步 · 营养分析"
          variant="primary"
          fullWidth
          iconRight="chevron-right"
          disabled={draft.items.length === 0}
          onPress={() => navigation.navigate('NutritionAnalysis')}
        />
      </View>

      <EditFoodSheet
        visible={editing !== null}
        food={editing}
        onClose={() => setEditing(null)}
        onSave={(name, portion) => {
          if (editing) {
            if (name !== editing.name) updateItem(editing.id, { name });
            if (portion !== editing.portion) updatePortion(editing.id, portion);
          }
          setEditing(null);
        }}
        onDelete={() => editing && removeItem(editing.id)}
      />
      <AddFoodSheet visible={adding} onClose={() => setAdding(false)} onAdd={addItem} />
    </View>
  );
}

/* ---------------- 食物行 ---------------- */
function FoodRow({
  food,
  onPress,
  onDelete,
}: {
  food: FoodItem;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.foodRow, pressed && { opacity: 0.75 }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.foodNameRow}>
          <Typography variant="bodyStrong">{food.name}</Typography>
          {food.source === 'ai' ? (
            <View style={styles.aiTag}>
              <Typography variant="micro" color="aiAccent">AI</Typography>
            </View>
          ) : null}
        </View>
        <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {food.portion}{food.unit ?? 'g'} · 蛋白质 {food.protein}g · 碳水 {food.carbs}g · 脂肪 {food.fat}g
        </Typography>
      </View>
      <View style={styles.foodRight}>
        <Typography variant="numberSmall" color="primary">{food.calories}</Typography>
        <Typography variant="micro" color="tertiary">kcal</Typography>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.delBtn}>
        <Icon name="trash" size={16} color={semantic.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

export default FoodRecognitionResultScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  confRow: { marginBottom: spacing.md },
  warnBox: {
    marginBottom: spacing.md,
    backgroundColor: semantic.surfaceAlt,
    borderRadius: radii.smallCard,
    borderLeftWidth: 3,
    borderLeftColor: semantic.textTertiary,
    padding: spacing.md,
  },
  photoPreview: { overflow: 'hidden', marginBottom: spacing.md },
  photo: { width: '100%', height: 200 },
  photoCap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  confPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: semantic.accentAISoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  mealRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  mealChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  mealChipOn: { backgroundColor: semantic.primary, borderColor: semantic.primary },
  listCard: { paddingHorizontal: spacing.lg },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: semantic.divider,
    gap: spacing.sm,
  },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiTag: {
    backgroundColor: semantic.accentAISoft,
    borderRadius: radii.xs,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  foodRight: { alignItems: 'flex-end' },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: semantic.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  addIcon: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: semantic.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalCard: { marginTop: spacing.md },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCal: { flexDirection: 'row', alignItems: 'baseline' },
  totalMacros: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: semantic.surfaceAlt,
    borderRadius: radii.smallCard,
    padding: spacing.md,
  },
  totalMacroItem: { flex: 1, alignItems: 'center', gap: 2 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: semantic.border,
    backgroundColor: semantic.surface,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
  },
  presetChipOn: { backgroundColor: semantic.primary, borderColor: semantic.primary },
  previewBox: {
    backgroundColor: semantic.primaryBg,
    borderRadius: radii.smallCard,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewRow: { flexDirection: 'row', alignItems: 'baseline' },
  previewMacros: { flexDirection: 'row', gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: semantic.divider,
    backgroundColor: semantic.background,
  },
});
