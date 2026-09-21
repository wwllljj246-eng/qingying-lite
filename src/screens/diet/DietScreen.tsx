import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ScreenContainer,
  Section,
  Typography,
  Card,
  Button,
  RingProgress,
  Icon,
  ModalSheet,
  EmptyState,
} from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { MEAL_TYPE_LIST, MACRO_META, NUTRITION_TARGETS } from '@/constants';
import { useDietStore } from '@/stores/dietStore';
import { useCycleStore } from '@/stores/cycleStore';
import { useBodyStatusStore } from '@/stores/bodyStatusStore';
import { sumFoodNutrition } from '@/services/ai/foodRecognition';
import { todayISO } from '@/utils/date';
import { getDietAdvice, getCyclePhaseInfo, type CyclePhase } from '@/services/advice';
import type { MealRecord, MealType } from '@/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
function formatDateCN(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日 · 周${WEEKDAYS[d.getDay()]}`;
}

/* ---------------- 添加方式弹层 ---------------- */
function AddMethodSheet({
  visible,
  onClose,
  presetMealType,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  presetMealType?: MealType;
  onSelect: (key: 'ai' | 'search', mealType: MealType) => void;
}) {
  if (!visible) return null;
  const meal = presetMealType ?? suggestMeal();
  const options = [
    { key: 'ai' as const, icon: 'camera' as const, bg: semantic.accentAISoft, color: semantic.accentAI, label: 'AI 拍照识别', hint: '拍一拍，自动记录' },
    { key: 'search' as const, icon: 'search' as const, bg: semantic.primaryBg, color: semantic.primary, label: '搜索食物', hint: '从食物库里选' },
  ];
  return (
    <ModalSheet title="添加饮食" snapPoints={['85%']} scrollable onDismiss={onClose}>
      <View style={{ gap: spacing.md }}>
        {options.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => onSelect(o.key, meal)}
            style={({ pressed }) => [styles.methodRow, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.methodIcon, { backgroundColor: o.bg }]}>
              <Icon name={o.icon} size={20} color={o.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Typography variant="bodyStrong">{o.label}</Typography>
              <Typography variant="caption" color="tertiary" style={{ marginTop: 1 }}>
                {o.hint}
              </Typography>
            </View>
            <Icon name="chevron-right" size={18} color={semantic.textTertiary} />
          </Pressable>
        ))}
      </View>
    </ModalSheet>
  );
}

function suggestMeal(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 17) return 'snack';
  return 'dinner';
}

/* ---------------- 主页面 ---------------- */
export function DietScreen() {
  const navigation = useNavigation();
  const records = useDietStore((s) => s.records);
  const removeMeal = useDietStore((s) => s.removeMeal);
  const [addVisible, setAddVisible] = useState(false);
  const [presetMeal, setPresetMeal] = useState<MealType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealRecord | null>(null);

  const deleteLabel =
    MEAL_TYPE_LIST.find((m) => m.key === deleteTarget?.mealType)?.label ?? '';

  const cycleEnabled = useCycleStore((s) => s.enabled);
  const cycleRecords = useCycleStore((s) => s.records);
  const todayBody = useBodyStatusStore((s) => s.todayStatus());

  const today = todayISO();
  const cyclePhase: CyclePhase | null = cycleEnabled
    ? getCyclePhaseInfo(cycleRecords, today).phase
    : null;
  const todayMeals = useMemo(
    () => records.filter((r) => r.date === today),
    [records, today],
  );
  const totals = useMemo(() => sumFoodNutrition(todayMeals.flatMap((m) => m.items)), [todayMeals]);
  const remaining = Math.max(0, NUTRITION_TARGETS.calories - totals.calories);

  const byMeal = (type: MealType): MealRecord[] => todayMeals.filter((m) => m.mealType === type);
  const dayEmpty = todayMeals.length === 0;
  const showDietAdvice = cycleEnabled || !!todayBody;
  const dietAdvice = getDietAdvice(cyclePhase, todayBody, !dayEmpty);

  return (
    <ScreenContainer scroll>
      {/* 顶部标题 */}
      <View style={styles.titleRow}>
        <View>
          <Typography variant="h2">今日饮食</Typography>
          <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {formatDateCN(today)}
          </Typography>
        </View>
        <Pressable onPress={() => { setPresetMeal(null); setAddVisible(true); }} hitSlop={8}>
          <Typography variant="captionStrong" color="primary">＋ 添加</Typography>
        </Pressable>
      </View>

      {/* 摄入总览 */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <RingProgress
            progress={NUTRITION_TARGETS.calories > 0 ? Math.min(1, totals.calories / NUTRITION_TARGETS.calories) : 0}
            size={132}
            strokeWidth={12}
            color={semantic.accentDiet}
          >
            <Typography variant="numberSmall" color="primary">{totals.calories}</Typography>
            <Typography variant="micro" color="tertiary">/ {NUTRITION_TARGETS.calories} kcal</Typography>
          </RingProgress>
          <View style={styles.summaryRight}>
            <Typography variant="caption" color="secondary">今日摄入</Typography>
            <View style={styles.calRow}>
              <Typography variant="numberSmall" color="primary">{totals.calories}</Typography>
              <Typography variant="caption" color="secondary"> / {NUTRITION_TARGETS.calories} kcal</Typography>
            </View>
            <View style={[styles.remainPill, { backgroundColor: remaining > 0 ? semantic.primaryBg : semantic.accentRewardSoft }]}>
              <Typography variant="captionStrong" color={remaining > 0 ? 'primary' : 'primary'}>
                {remaining > 0 ? `还可摄入 ${remaining} kcal` : `已超出 ${totals.calories - NUTRITION_TARGETS.calories} kcal`}
              </Typography>
            </View>
          </View>
        </View>

        {/* 三大营养素 */}
        <View style={styles.macroSection}>
          {MACRO_META.map((m) => {
            const target = NUTRITION_TARGETS[m.key];
            const value = totals[m.key];
            return (
              <View key={m.key} style={styles.macroCol}>
                <Typography variant="caption" color="secondary">{m.label}</Typography>
                <View style={styles.macroValRow}>
                  <Typography variant="captionStrong" color={m.colorKey === 'diet' ? 'diet' : m.colorKey === 'reward' ? 'reward' : 'primaryAccent'}>
                    {Math.round(value)}
                  </Typography>
                  <Typography variant="micro" color="tertiary"> / {target}g</Typography>
                </View>
                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroFill,
                      {
                        width: `${Math.min(100, (value / target) * 100)}%`,
                        backgroundColor:
                          m.colorKey === 'diet' ? semantic.accentDiet
                          : m.colorKey === 'reward' ? semantic.accentReward
                          : semantic.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      {/* 今日饮食建议（周期 × 身体状态 联动，轻量） */}
      {showDietAdvice ? (
        <Card background={semantic.accentDietSoft} style={{ marginTop: spacing.md }}>
          <View style={styles.rowBetween}>
            <View style={styles.rowBaseline}>
              <Icon name="utensils" size={18} color={palette.pink400} />
              <Typography variant="captionStrong" color="diet" style={{ marginLeft: 6 }}>
                今日饮食建议
              </Typography>
            </View>
          </View>
          <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
            {dietAdvice}
          </Typography>
        </Card>
      ) : null}

      {/* 餐次列表 */}
      {dayEmpty ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="🍽️"
            title="还没有记录今天的饮食"
            description="记录一些数据后，这里会显示你的摄入情况"
            actionLabel="添加饮食"
            onAction={() => { setPresetMeal(null); setAddVisible(true); }}
            compact
          />
        </Card>
      ) : (
        <Section title="餐次记录" gap={spacing.md} style={{ marginTop: spacing.md }}>
          {MEAL_TYPE_LIST.map((m) => {
            const meals = byMeal(m.key);
            const mealTotals = sumFoodNutrition(meals.flatMap((r) => r.items));
            return (
              <Card key={m.key} radius="large" bordered style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Typography variant="bodyStrong">
                    {m.emoji} {m.label}
                  </Typography>
                  {meals.length > 0 ? (
                    <Typography variant="caption" color="secondary">
                      {mealTotals.calories} kcal
                    </Typography>
                  ) : (
                    <Pressable hitSlop={8} onPress={() => { setPresetMeal(m.key); setAddVisible(true); }}>
                      <Typography variant="captionStrong" color="primary">＋ 记录</Typography>
                    </Pressable>
                  )}
                </View>
                {meals.length > 0 ? (
                  <View style={styles.mealBody}>
                    {meals.map((meal) => (
                      <View key={meal.id} style={styles.mealBlock}>
                        <View style={styles.mealBlockHead}>
                          {meal.aiRecognized ? (
                            <View style={styles.aiRow}>
                              <Icon name="sparkles" size={11} color={semantic.accentAI} />
                              <Typography variant="micro" color="aiAccent" style={{ marginLeft: 3 }}>
                                AI 识别记录
                              </Typography>
                            </View>
                          ) : null}
                          <Pressable
                            hitSlop={10}
                            onPress={() => setDeleteTarget(meal)}
                            style={styles.trashBtn}
                            accessibilityRole="button"
                            accessibilityLabel="删除该餐记录"
                          >
                            <Icon name="trash" size={15} color={semantic.textTertiary} />
                          </Pressable>
                        </View>
                        {meal.items.map((it) => (
                          <View key={it.id} style={styles.foodLine}>
                            <Typography variant="body" numberOfLines={1} style={{ flex: 1 }}>
                              {it.name}
                            </Typography>
                            <Typography variant="caption" color="secondary">
                              {it.portion}{it.unit ?? 'g'}
                            </Typography>
                            <Typography variant="captionStrong" style={{ width: 76, textAlign: 'right' }}>
                              {it.calories} kcal
                            </Typography>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.mealEmpty}>
                    <Typography variant="caption" color="tertiary">暂无记录</Typography>
                  </View>
                )}
              </Card>
            );
          })}
        </Section>
      )}

      {/* 底部添加按钮 */}
      <Button
        title="＋ 添加饮食"
        variant="primary"
        fullWidth
        size="lg"
        onPress={() => setAddVisible(true)}
        style={{ marginTop: spacing.lg }}
      />

      <AddMethodSheet
        visible={addVisible}
        presetMealType={presetMeal ?? undefined}
        onClose={() => setAddVisible(false)}
        onSelect={(key, mealType) => {
          setAddVisible(false);
          if (key === 'ai') navigation.navigate('AIFoodRecognition', { mealType });
          else navigation.navigate('FoodSearch', { mealType });
        }}
      />

      {/* 删除记录确认 */}
      <ModalSheet
        title="删除记录"
        visible={!!deleteTarget}
        snapPoints={['46%']}
        onDismiss={() => setDeleteTarget(null)}
      >
        <Typography variant="body" color="primary" style={{ marginBottom: spacing.lg, lineHeight: 23 }}>
          {`确定删除「${deleteLabel}」中的 ${deleteTarget?.items.length ?? 0} 项食物记录吗？删除后无法恢复。`}
        </Typography>
        <Pressable
          onPress={() => {
            if (deleteTarget) removeMeal(deleteTarget.id);
            setDeleteTarget(null);
          }}
          style={styles.deleteConfirmBtn}
        >
          <Typography variant="bodyStrong" style={{ color: palette.surface }}>
            删除
          </Typography>
        </Pressable>
        <Button
          title="取消"
          variant="ghost"
          fullWidth
          onPress={() => setDeleteTarget(null)}
          style={{ marginTop: spacing.sm }}
        />
      </ModalSheet>
    </ScreenContainer>
  );
}

export default DietScreen;

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBaseline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCard: { marginBottom: spacing.md },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  summaryRight: { flex: 1, gap: 4 },
  calRow: { flexDirection: 'row', alignItems: 'baseline' },
  remainPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  macroSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: semantic.divider,
  },
  macroCol: { flex: 1, gap: 4 },
  macroValRow: { flexDirection: 'row', alignItems: 'baseline' },
  macroTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: semantic.surfaceAlt,
    overflow: 'hidden',
    marginTop: 2,
  },
  macroFill: { height: '100%', borderRadius: radii.pill },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.giant,
    marginBottom: spacing.md,
  },
  mealCard: { minHeight: 72 },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealBlockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: semantic.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmBtn: {
    backgroundColor: '#E57373',
    borderRadius: radii.button,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  mealBody: { marginTop: spacing.sm },
  mealBlock: { marginBottom: spacing.sm },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  foodLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 5,
  },
  mealEmpty: { marginTop: spacing.sm },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: semantic.surface,
    borderRadius: radii.smallCard,
    borderWidth: 1,
    borderColor: semantic.border,
    padding: spacing.md,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonTag: {
    backgroundColor: semantic.surfaceAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
