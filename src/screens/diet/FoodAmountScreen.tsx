import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  ScreenContainer,
  Header,
  Typography,
  Card,
  Button,
  Input,
  EmptyState,
} from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { MEAL_TYPE_LIST } from '@/constants';
import {
  findFoodByName,
  portionPresets,
  defaultPortion,
  computeNutrition,
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

function perUnitLabel(unit: string): string {
  if (unit === 'ml') return '100ml';
  if (unit === 'g') return '100g';
  return '100g';
}

export function FoodAmountScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'FoodAmount'>>();
  const navigation = useNavigation();
  const initDraft = useFoodDraftStore((s) => s.initDraft);

  const manual = route.params?.manual;
  const entry: FoodEntry | undefined = manual ? undefined : findFoodByName(route.params?.foodName ?? '');

  const [mealType, setMealType] = useState<MealType>(route.params?.mealType ?? suggestMeal());
  const [amount, setAmount] = useState<string>(
    manual ? String(manual.portion) : String(defaultPortion(entry?.unit ?? 'g')),
  );

  if (!entry && !manual) {
    return (
      <ScreenContainer scroll>
        <Header title="记录份量" onLeftPress={() => navigation.goBack()} />
        <Card>
          <EmptyState
            icon="🍽️"
            title="没有找到该食物"
            description="返回重新搜索一下吧"
            actionLabel="返回"
            onAction={() => navigation.goBack()}
            compact
          />
        </Card>
      </ScreenContainer>
    );
  }

  const unit = manual?.unit ?? entry!.unit;
  const name = manual?.name ?? entry!.name;
  const num = parseFloat(amount);
  const valid = Number.isFinite(num) && num > 0;

  // 手动添加：营养为填写值（不随份量重算）；搜索：基于每 100g 实时计算
  const nutrition = manual
    ? { calories: manual.calories, protein: manual.protein, carbs: manual.carbs, fat: manual.fat }
    : computeNutrition(entry!, num);

  const save = () => {
    if (!valid) return;
    const item: FoodItem = manual
      ? { ...manual, id: genId('food'), portion: num }
      : {
          id: genId('food'),
          name: entry!.name,
          portion: num,
          unit,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          source: 'search',
        };
    initDraft({ mealType, items: [item], confidence: 0, source: 'search' });
    navigation.navigate('NutritionAnalysis');
  };

  return (
    <ScreenContainer scroll>
      <Header title="记录份量" subtitle={name} onLeftPress={() => navigation.goBack()} />

      {/* 食物信息 / 营养参考 */}
      <Card>
        <Typography variant="h3">{name}</Typography>
        {manual ? (
          <Typography variant="caption" color="secondary" style={{ marginTop: 4 }}>
            份量 {manual.portion}
            {manual.unit}（手动填写）
          </Typography>
        ) : (
          <Typography variant="caption" color="secondary" style={{ marginTop: 4 }}>
            每{perUnitLabel(unit)} 营养参考
          </Typography>
        )}
        <View style={styles.refRow}>
          <RefItem label="热量" value={entry?.per100.calories ?? manual!.calories} unit="kcal" />
          <RefItem label="蛋白质" value={entry?.per100.protein ?? manual!.protein} unit="g" />
          <RefItem label="碳水" value={entry?.per100.carbs ?? manual!.carbs} unit="g" />
          <RefItem label="脂肪" value={entry?.per100.fat ?? manual!.fat} unit="g" />
        </View>
      </Card>

      {/* 份量（仅数据库食物可编辑并实时重算） */}
      {!manual ? (
        <Card>
          <Typography variant="captionStrong" color="secondary">
            份量（{unit}）
          </Typography>
          <View style={styles.presetRow}>
            {portionPresets(unit).map((p) => (
              <Pressable
                key={p}
                onPress={() => setAmount(String(p))}
                hitSlop={6}
                style={[styles.presetChip, num === p && styles.presetChipOn]}
              >
                <Typography
                  variant="captionStrong"
                  style={{ color: num === p ? semantic.surface : semantic.textSecondary }}
                >
                  {p}
                </Typography>
              </Pressable>
            ))}
          </View>
          <Input
            placeholder={`自定义份量（${unit}）`}
            keyboardType="decimal-pad"
            rightText={unit}
            value={amount}
            onChangeText={setAmount}
          />
        </Card>
      ) : null}

      {/* 本份营养 */}
      <Card>
        <Typography variant="captionStrong" color="secondary">
          本份营养
        </Typography>
        <View style={styles.refRow}>
          <RefItem label="热量" value={nutrition.calories} unit="kcal" highlight />
          <RefItem label="蛋白质" value={nutrition.protein} unit="g" />
          <RefItem label="碳水" value={nutrition.carbs} unit="g" />
          <RefItem label="脂肪" value={nutrition.fat} unit="g" />
        </View>
        {manual ? (
          <Typography variant="micro" color="tertiary" style={{ marginTop: spacing.sm }}>
            营养为手动填写值，修改份量不会自动重算
          </Typography>
        ) : null}
      </Card>

      {/* 餐次 */}
      <View style={styles.mealRow}>
        {MEAL_TYPE_LIST.map((m) => {
          const active = m.key === mealType;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMealType(m.key)}
              hitSlop={6}
              style={[styles.mealChip, active && styles.mealChipOn]}
            >
              <Typography
                variant="captionStrong"
                style={{ color: active ? semantic.surface : semantic.textSecondary }}
              >
                {m.emoji} {m.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="添加到今日饮食"
        variant="primary"
        fullWidth
        iconRight="chevron-right"
        disabled={!valid}
        onPress={save}
        style={{ marginTop: spacing.md }}
      />
    </ScreenContainer>
  );
}

function RefItem({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.refItem}>
      <Typography variant="caption" color="secondary">
        {label}
      </Typography>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
        <Typography
          variant={highlight ? 'numberSmall' : 'bodyStrong'}
          color={highlight ? 'primary' : 'primary'}
        >
          {Math.round(value * 10) / 10}
        </Typography>
        <Typography variant="micro" color="tertiary" style={{ marginLeft: 2 }}>
          {unit}
        </Typography>
      </View>
    </View>
  );
}

export default FoodAmountScreen;

const styles = StyleSheet.create({
  refRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: semantic.surfaceAlt,
    borderRadius: radii.smallCard,
    padding: spacing.md,
  },
  refItem: { flex: 1, gap: 2 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  presetChip: {
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: semantic.border,
    backgroundColor: semantic.surface,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
  },
  presetChipOn: { backgroundColor: semantic.primary, borderColor: semantic.primary },
  mealRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
});
