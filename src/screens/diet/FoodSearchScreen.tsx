import React, { useState } from 'react';
import { View, Pressable, TextInput, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  ScreenContainer,
  Header,
  Typography,
  Card,
  Icon,
  Button,
  EmptyState,
  Input,
  ModalSheet,
} from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import {
  FOOD_CATEGORY_META,
  searchFoods,
  type FoodEntry,
} from '@/constants/foodDatabase';
import { useFoodDraftStore } from '@/stores/foodDraftStore';
import { genId } from '@/utils/format';
import type { MealType, FoodItem, RootStackParamList } from '@/types';

/** 根据当前时间推断默认餐次 */
function suggestMeal(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 17) return 'snack';
  return 'dinner';
}

/** 每 100 单位文案：g/ml 用原单位，其它单位（个/碗/份）统一按「每 100g」 */
function perUnitLabel(unit: string): string {
  if (unit === 'ml') return '100ml';
  if (unit === 'g') return '100g';
  return '100g';
}

export function FoodSearchScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'FoodSearch'>>();
  const navigation = useNavigation();
  const initDraft = useFoodDraftStore((s) => s.initDraft);

  const [query, setQuery] = useState('');
  const [manualVisible, setManualVisible] = useState(false);

  const q = query.trim();
  const results: FoodEntry[] = q ? searchFoods(q) : [];

  const pick = (entry: FoodEntry) => {
    navigation.navigate('FoodAmount', { foodName: entry.name, mealType: route.params?.mealType });
  };

  const saveManual = (item: Omit<FoodItem, 'id'>) => {
    initDraft({
      mealType: route.params?.mealType ?? suggestMeal(),
      items: [{ ...item, id: genId('food') }],
      confidence: 0,
      source: undefined,
    });
    setManualVisible(false);
    navigation.navigate('NutritionAnalysis');
  };

  return (
    <ScreenContainer scroll>
      <Header title="搜索食物" onLeftPress={() => navigation.goBack()} />

      {/* 搜索框 */}
      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={semantic.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索食物名称，如 鸡胸肉、米饭"
          placeholderTextColor={semantic.textTertiary}
          style={styles.searchInput}
          autoFocus
          returnKeyType="search"
        />
        {q ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Icon name="x" size={16} color={semantic.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* 结果为空：提示 / 无结果 */}
      {!q ? (
        <Card style={styles.hintCard}>
          <Typography variant="body" color="secondary" align="center">
            搜索你吃的食物
          </Typography>
          <Typography variant="caption" color="tertiary" align="center" style={{ marginTop: 4 }}>
            输入名称即可模糊匹配，如「鸡」「牛」「米饭」
          </Typography>
        </Card>
      ) : results.length === 0 ? (
        <Card style={styles.hintCard}>
          <EmptyState
            icon="🔍"
            title="没有找到相关食物"
            description="换个关键词，或手动添加"
            compact
          />
          <Button
            title="手动添加"
            variant="primary"
            fullWidth
            iconLeft="plus"
            onPress={() => setManualVisible(true)}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {results.map((f) => {
            const meta = FOOD_CATEGORY_META[f.category];
            return (
              <Pressable
                key={f.name}
                onPress={() => pick(f)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
                  <Typography variant="h3">{meta.emoji}</Typography>
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="bodyStrong">{f.name}</Typography>
                  <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    每{perUnitLabel(f.unit)} · {f.per100.calories} kcal
                  </Typography>
                </View>
                <View style={styles.macros}>
                  <MacroMini label="蛋白" value={f.per100.protein} />
                  <MacroMini label="碳水" value={f.per100.carbs} />
                  <MacroMini label="脂肪" value={f.per100.fat} />
                </View>
                <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
              </Pressable>
            );
          })}
        </View>
      )}

      <ManualFoodSheet
        visible={manualVisible}
        onClose={() => setManualVisible(false)}
        onSave={saveManual}
      />
    </ScreenContainer>
  );
}

function MacroMini({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macroMini}>
      <Typography variant="micro" color="tertiary">
        {label} {value}g
      </Typography>
    </View>
  );
}

/* ---------------- 手动添加食物（无搜索结果时的兜底） ---------------- */
function ManualFoodSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (item: Omit<FoodItem, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const reset = () => {
    setName('');
    setAmount('');
    setUnit('g');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  if (!visible) return null;

  const numAmount = parseFloat(amount);
  const numCal = parseFloat(calories);
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(numAmount) &&
    numAmount > 0 &&
    Number.isFinite(numCal) &&
    numCal > 0;

  const UNIT_OPTIONS = ['g', 'ml', '个', '碗', '份'];

  const save = () => {
    onSave({
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
    <ModalSheet title="手动添加食物" snapPoints={['88%']} scrollable onDismiss={onClose}>
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
            <Pressable
              key={u}
              onPress={() => setUnit(u)}
              hitSlop={6}
              style={[styles.presetChip, unit === u && styles.presetChipOn]}
            >
              <Typography
                variant="captionStrong"
                style={{ color: unit === u ? semantic.surface : semantic.textSecondary }}
              >
                {u}
              </Typography>
            </Pressable>
          ))}
        </View>
      </View>
      <Input
        label="热量 (kcal)"
        placeholder="例如 120"
        keyboardType="decimal-pad"
        rightText="kcal"
        value={calories}
        onChangeText={setCalories}
      />
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

export default FoodSearchScreen;

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: semantic.surface,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: semantic.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: semantic.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  hintCard: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: semantic.surface,
    borderRadius: radii.smallCard,
    borderWidth: 1,
    borderColor: semantic.border,
    padding: spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.smallCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macros: { gap: 4, alignItems: 'flex-end' },
  macroMini: {},
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
});
