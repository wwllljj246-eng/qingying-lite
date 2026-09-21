import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ScreenContainer,
  Header,
  Typography,
  Card,
  Button,
  RingProgress,
  Icon,
  EmptyState,
} from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { MACRO_META, MEAL_TYPE_LIST, NUTRITION_TARGETS } from '@/constants';
import { useFoodDraftStore, draftTotals } from '@/stores/foodDraftStore';
import { useDietStore } from '@/stores/dietStore';
import { useHomeSummary } from '@/hooks';
import { navigationRef } from '@/navigation';
import { useTabStore } from '@/stores/tabStore';
import { todayISO } from '@/utils/date';
import { getNutritionAnalysis, type NutritionAnalysisResult } from '@/services/nutritionService';

export function NutritionAnalysisScreen() {
  const navigation = useNavigation();
  const draft = useFoodDraftStore((s) => s.draft);
  const clearDraft = useFoodDraftStore((s) => s.clearDraft);
  const addMeal = useDietStore((s) => s.addMeal);
  const setActive = useTabStore((s) => s.setActive);
  const home = useHomeSummary();

  const [saved, setSaved] = useState(false);

  const totals = useMemo(() => draftTotals(draft), [draft]);
  const mealLabel = MEAL_TYPE_LIST.find((m) => m.key === (draft?.mealType ?? 'lunch'))?.label ?? '';

  /** 今日剩余热量（不含本餐） */
  const remaining = Math.max(0, home.calTarget - home.calories);

  /* ===== 真实 AI 营养分析（失败回退本地） ===== */
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const [analysis, setAnalysis] = useState<{
    status: 'loading' | 'done';
    result?: NutritionAnalysisResult;
  }>({ status: 'loading' });

  useEffect(() => {
    if (!draft) return;
    mountedRef.current = true;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAnalysis({ status: 'loading' });
    getNutritionAnalysis(draft.items, draft.mealType, remaining, ctrl.signal)
      .then((result) => {
        if (!mountedRef.current || ctrl.signal.aborted) return;
        setAnalysis({ status: 'done', result });
      })
      .catch(() => {
        /* CANCELLED：忽略 */
      });
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [draft, remaining]);

  if (!draft) {
    return (
      <ScreenContainer scroll>
        <Header title="营养分析" onLeftPress={() => navigation.goBack()} />
        <Card>
          <EmptyState
            icon="📊"
            title="还没有可分析的数据"
            description="返回重新识别一下吧"
            actionLabel="返回"
            onAction={() => navigation.goBack()}
            compact
          />
        </Card>
      </ScreenContainer>
    );
  }

  const save = () => {
    const isSearch = draft?.source === 'search';
    addMeal({
      date: todayISO(),
      mealType: draft.mealType,
      items: draft.items,
      imageUri: draft.imageUri,
      aiRecognized: draft?.source === 'camera',
      source: isSearch ? 'search' : draft?.source === 'camera' ? 'camera' : undefined,
    });
    setSaved(true);
    // 展示成功反馈后回到饮食页
    setTimeout(() => {
      clearDraft();
      setActive('Diet');
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }, 950);
  };

  return (
    <View style={styles.root}>
      <ScreenContainer scroll>
        <Header title="营养分析" subtitle="确认后记录到今日饮食" onLeftPress={() => navigation.goBack()} />

        {/* 本餐热量圆环 */}
        <Card style={styles.heroCard}>
          <View style={styles.ringWrap}>
            <RingProgress
              progress={home.calTarget > 0 ? Math.min(1, totals.calories / home.calTarget) : 0}
              size={148}
              strokeWidth={13}
              color={semantic.accentDiet}
            >
              <Typography variant="caption" color="secondary">本餐约</Typography>
              <Typography variant="number" color="primary">{totals.calories}</Typography>
              <Typography variant="micro" color="tertiary">kcal</Typography>
            </RingProgress>
          </View>
          <View style={styles.macroBars}>
            {MACRO_META.map((m) => (
              <MacroBar key={m.key} label={m.label} value={totals[m.key]} />
            ))}
          </View>
          <Typography variant="caption" color="tertiary" align="center" style={{ marginTop: spacing.md }}>
            将记录到{mealLabel} · 共 {draft.items.length} 种食物
          </Typography>
        </Card>

        {/* AI 分析卡片（真实 AI / 本地回退） */}
        {analysis.status === 'loading' || !analysis.result ? (
          <Card style={[styles.aiCard, { backgroundColor: semantic.accentAISoft }]}>
            <View style={styles.aiHeader}>
              <Icon name="sparkles" size={16} color={semantic.accentAI} />
              <Typography variant="captionStrong" color="aiAccent" style={{ marginLeft: 6 }}>
                AI 分析
              </Typography>
            </View>
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={semantic.accentAI} />
              <Typography variant="body" style={{ marginLeft: spacing.sm, lineHeight: 23 }}>
                AI 正在分析…
              </Typography>
            </View>
          </Card>
        ) : (
          <Card
            style={[
              styles.aiCard,
              { backgroundColor: analysis.result.source === 'ai' ? semantic.accentAISoft : semantic.surface },
            ]}
          >
            <View style={styles.aiHeader}>
              <Icon name="sparkles" size={16} color={semantic.accentAI} />
              <Typography variant="captionStrong" color="aiAccent" style={{ marginLeft: 6 }}>
                {analysis.result.source === 'ai' ? 'AI 分析' : '当前使用基础分析'}
              </Typography>
            </View>
            {analysis.result.source === 'local' ? (
              <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.sm, lineHeight: 20 }}>
                暂时无法连接 AI，已为你使用本地基础分析。
              </Typography>
            ) : null}
            <Typography variant="body" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
              {analysis.result.summary}
            </Typography>
            {analysis.result.source === 'ai' && analysis.result.suggestions.length > 0 ? (
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                {analysis.result.suggestions.map((s, i) => (
                  <View key={i} style={styles.suggestionItem}>
                    <Icon name="check" size={14} color={semantic.accentAI} />
                    <Typography variant="body" color="primary" style={{ flex: 1, lineHeight: 22 }}>
                      {s}
                    </Typography>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        )}

        {/* 今日饮食建议 */}
        <Card style={styles.suggestCard}>
          <View style={styles.aiHeader}>
            <Icon name="sun" size={16} color={semantic.primary} />
            <Typography variant="captionStrong" color="primary" style={{ marginLeft: 6 }}>
              今日饮食建议
            </Typography>
          </View>
          <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
            今天还剩约 {remaining} kcal，{'\n'}
            {remaining < totals.calories
              ? '这餐之后余额不多，接下来可以优先选择蔬菜和优质蛋白质。'
              : '接下来可以优先选择蔬菜 + 优质蛋白质，主食适当控量。'}
          </Typography>
        </Card>
      </ScreenContainer>

      {/* 底部操作 */}
      <View style={styles.footer}>
        <Button
          title="确认并记录"
          variant="primary"
          fullWidth
          iconLeft="check"
          disabled={draft.items.length === 0 || saved}
          loading={false}
          onPress={save}
        />
        <Button
          title="返回修改"
          variant="ghost"
          fullWidth
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      {/* 保存成功反馈 */}
      <Modal visible={saved} transparent animationType="fade" onRequestClose={() => setSaved(false)}>
        <View style={styles.successMask}>
          <Card style={styles.successCard}>
            <View style={styles.successIcon}>
              <Icon name="check" size={26} color={semantic.surface} strokeWidth={3} />
            </View>
            <Typography variant="h3" align="center" style={{ marginTop: spacing.md }}>
              已记录到今日饮食 ✓
            </Typography>
            <Typography variant="caption" color="secondary" align="center" style={{ marginTop: spacing.xs }}>
              本餐 {totals.calories} kcal · 正在前往饮食页…
            </Typography>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function MacroBar({ label, value }: { label: string; value: number }) {
  const target =
    label === '蛋白质' ? NUTRITION_TARGETS.protein
    : label === '碳水' ? NUTRITION_TARGETS.carbs
    : NUTRITION_TARGETS.fat;
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHead}>
        <Typography variant="caption" color="secondary">{label}</Typography>
        <Typography variant="captionStrong">{Math.round(value)}g</Typography>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${Math.min(100, (value / target) * 100)}%` }]} />
      </View>
    </View>
  );
}

export default NutritionAnalysisScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  heroCard: { alignItems: 'center' },
  ringWrap: { marginTop: spacing.sm },
  macroBars: { alignSelf: 'stretch', marginTop: spacing.lg, gap: spacing.md },
  macroItem: { gap: 6 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  macroTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: semantic.surfaceAlt,
    overflow: 'hidden',
  },
  macroFill: { height: '100%', borderRadius: radii.pill, backgroundColor: semantic.primary },
  aiCard: { marginTop: spacing.md },
  aiHeader: { flexDirection: 'row', alignItems: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  suggestionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  suggestCard: { marginTop: spacing.md },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: semantic.divider,
    backgroundColor: semantic.background,
  },
  successMask: {
    flex: 1,
    backgroundColor: palette.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
