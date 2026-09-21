/**
 * AI 助手（Task 12：接入真实 AI）
 *
 * 数据流：Screen → assistantService → aiApi（真实后端 /api/ai/assistant）→ LLM
 *                                        ↘ 失败回退 aiAssistantService（本地规则）
 *
 * 行为：
 * - 进入页面自动请求真实 AI，展示「AI 正在分析你的近期状态…」
 * - 成功：今日总结 + 个性化建议（来源标记「AI 分析」）
 * - 失败 / 无 Key / 超时 / 格式错误：回退本地规则，标记「当前使用基础分析」，不白屏
 * - 快速提问 / 自由输入同样走真实 AI，失败回退本地
 * - 页面离开时取消未完成请求（AbortController + mountedRef）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ScreenContainer,
  Header,
  Section,
  Card,
  Typography,
  Icon,
  EmptyState,
} from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';
import { typography } from '@/theme/typography';
import { useQuickAddStore } from '@/stores/quickAddStore';
import { useAssistantSnapshot } from '@/hooks';
import { ENERGY_LABEL, MOOD_LABEL } from '@/services/advice';
import {
  hasAnySnapshotData,
  phaseDisplayText,
  QUICK_QUESTIONS,
} from '@/services/aiAssistantService';
import {
  getAssistantAdvice,
  getQuickAnswer,
  type AssistantResult,
  type AdviceSource,
} from '@/services/assistantService';
import type { AssistantSuggestionType } from '@/types/ai';

interface QA {
  id: number;
  q: string;
  a: string;
  loading?: boolean;
  source?: AdviceSource;
}

type Tint = 'ai' | 'diet' | 'primary' | 'neutral';

function suggestionStyle(type: AssistantSuggestionType): { icon: string; tint: Tint } {
  switch (type) {
    case 'diet':
      return { icon: 'utensils', tint: 'diet' };
    case 'exercise':
      return { icon: 'footprints', tint: 'primary' };
    case 'body':
      return { icon: 'heart', tint: 'neutral' };
    case 'cycle':
      return { icon: 'moon', tint: 'diet' };
    case 'weight':
      return { icon: 'scale', tint: 'primary' };
    default:
      return { icon: 'sparkles', tint: 'ai' };
  }
}

export function AIAssistantScreen() {
  const navigation = useNavigation<any>();

  /** 从 5 个真实 Store 聚合快照（与首页 AI 卡共用，全守卫） */
  const snapshot = useAssistantSnapshot();
  const hasData = hasAnySnapshotData(snapshot);

  const mountedRef = useRef(true);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const qaAbortRef = useRef<AbortController | null>(null);

  const [analysis, setAnalysis] = useState<{ status: 'loading' | 'done'; result?: AssistantResult }>(
    { status: 'loading' },
  );
  const [qaList, setQaList] = useState<QA[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [input, setInput] = useState('');

  const openQuickAdd = () => useQuickAddStore.getState().openMain();

  /** 主分析：真实 AI（失败回退本地） */
  const runAnalysis = useCallback(
    async (question?: string) => {
      analysisAbortRef.current?.abort();
      const ctrl = new AbortController();
      analysisAbortRef.current = ctrl;
      setAnalysis({ status: 'loading' });
      try {
        const result = await getAssistantAdvice(snapshot, question, ctrl.signal);
        if (!mountedRef.current || ctrl.signal.aborted) return;
        setAnalysis({ status: 'done', result });
      } catch {
        /* CANCELLED：忽略 */
      }
    },
    [snapshot],
  );

  useEffect(() => {
    mountedRef.current = true;
    runAnalysis();
    return () => {
      mountedRef.current = false;
      analysisAbortRef.current?.abort();
      qaAbortRef.current?.abort();
    };
  }, [runAnalysis]);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || qaLoading) return;
    qaAbortRef.current?.abort();
    const ctrl = new AbortController();
    qaAbortRef.current = ctrl;
    const id = Date.now();
    setQaList((list) => [...list.slice(-2), { id, q: text, a: '', loading: true }]);
    setQaLoading(true);
    try {
      const { text: answer, source } = await getQuickAnswer(snapshot, text, ctrl.signal);
      if (!mountedRef.current || ctrl.signal.aborted) return;
      setQaList((list) =>
        list.map((it) => (it.id === id ? { ...it, a: answer, loading: false, source } : it)),
      );
    } catch {
      // 被新的请求取消（AbortController abort）：从列表移除这条 pending QA，
      // 避免残留永远停留在「AI 正在思考…」的旧条目
      if (mountedRef.current && ctrl.signal.aborted) {
        setQaList((list) => list.filter((it) => it.id !== id));
      }
    } finally {
      if (mountedRef.current) setQaLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Header title="AI 助手" onLeftPress={() => navigation.goBack()} />

      {!hasData ? (
        /* ===== 整页空状态 ===== */
        <Section gap={spacing.md}>
          <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.xs }}>
            根据你的近期状态，为你提供个性化建议
          </Typography>
          <Card>
            <EmptyState
              icon="🌱"
              title="还没有可用的记录"
              description="记录体重、饮食、运动或身体状态后，我可以根据你的真实情况给出更有针对性的建议"
              actionLabel="去记录"
              onAction={openQuickAdd}
            />
          </Card>
        </Section>
      ) : (
        <Section gap={spacing.md}>
          <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.xs }}>
            根据你的近期状态，为你提供个性化建议
          </Typography>

          {/* ===== 今日状态摘要（真实数据） ===== */}
          <Card>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="secondary">今日状态摘要</Typography>
              <Icon name="calendar" size={18} color={semantic.primary} />
            </View>
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              {snapshot.cycleEnabled ? (
                <SummaryRow icon="moon" text={phaseDisplayText(snapshot) ?? ''} />
              ) : null}
              <SummaryRow
                icon="scale"
                text={
                  snapshot.weightToday != null
                    ? `今天体重 ${snapshot.weightToday.toFixed(1)} kg`
                    : '今天还没有体重记录'
                }
              />
              <SummaryRow
                icon="utensils"
                text={
                  snapshot.mealCountToday > 0
                    ? `已记录 ${snapshot.mealCountToday} 餐 · 约 ${Math.round(snapshot.kcalToday)} kcal`
                    : '还没有饮食记录，记得好好吃饭'
                }
              />
              <SummaryRow
                icon="footprints"
                text={
                  snapshot.exerciseTodayCount > 0
                    ? `已运动 ${snapshot.exerciseTodayCount} 次 · ${snapshot.exerciseTodayMinutes} 分钟`
                    : '今天还没有运动记录'
                }
              />
              <SummaryRow
                icon="heart"
                text={
                  snapshot.statusToday
                    ? [
                        snapshot.statusToday.energy != null
                          ? `精力${ENERGY_LABEL[snapshot.statusToday.energy - 1]}`
                          : null,
                        snapshot.statusToday.sleepHours != null
                          ? `睡眠 ${snapshot.statusToday.sleepHours.toFixed(1)}h`
                          : null,
                        snapshot.statusToday.mood != null
                          ? `心情${MOOD_LABEL[snapshot.statusToday.mood - 1]}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '今天已记录身体状态'
                    : '今天还没有记录身体状态'
                }
              />
            </View>
          </Card>

          {/* ===== AI 分析（真实 AI / 本地回退） ===== */}
          <AIAnalysisCard analysis={analysis} onRegenerate={() => runAnalysis()} />

          {/* ===== 快速提问 ===== */}
          <Card>
            <View style={styles.cardHeader}>
              <Typography variant="captionStrong" color="secondary">你还想了解什么？</Typography>
              <Icon name="sparkles" size={18} color={semantic.accentAI} />
            </View>

            <View style={styles.chipWrap}>
              {QUICK_QUESTIONS.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => ask(q)}
                  disabled={qaLoading}
                  style={({ pressed }) => [styles.chip, pressed ? { opacity: 0.7 } : null]}
                >
                  <Typography variant="caption" color="primary">{q}</Typography>
                </Pressable>
              ))}
            </View>

            {/* 问答记录 */}
            {qaList.map((item) => (
              <View key={item.id} style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <View style={styles.qBubble}>
                  <Typography variant="body" color="inverse">{item.q}</Typography>
                </View>
                {item.loading ? (
                  <View style={styles.aBubble}>
                    <Typography variant="body" color="primary" style={{ lineHeight: 23 }}>
                      AI 正在思考…
                    </Typography>
                  </View>
                ) : (
                  <View style={styles.aBubble}>
                    <Typography variant="body" color="primary" style={{ lineHeight: 23 }}>
                      {item.a}
                    </Typography>
                    {item.source === 'local' ? (
                      <Typography variant="micro" color="tertiary" style={{ marginTop: 6 }}>
                        基础分析
                      </Typography>
                    ) : null}
                  </View>
                )}
              </View>
            ))}

            {/* 自由输入 */}
            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="问问饮食、运动、体重或状态…"
                placeholderTextColor={semantic.textTertiary}
                style={styles.input}
                multiline
                editable={!qaLoading}
                onSubmitEditing={() => {
                  ask(input);
                  setInput('');
                }}
              />
              <Pressable
                onPress={() => {
                  ask(input);
                  setInput('');
                }}
                disabled={!input.trim() || qaLoading}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { opacity: input.trim() && !qaLoading ? 1 : 0.5 },
                  pressed ? { transform: [{ scale: 0.95 }] } : null,
                ]}
              >
                <Icon name="sparkles" size={18} color={semantic.surface} />
              </Pressable>
            </View>
          </Card>

          <Typography variant="micro" color="tertiary" align="center">
            {analysis.result?.source === 'local'
              ? '当前使用基础分析（本地规则），不影响正常使用 🌿'
              : '建议由 AI 结合你的真实记录生成，不构成医疗建议 🌿'}
          </Typography>
        </Section>
      )}
    </ScreenContainer>
  );
}

/* ---------------- 子组件 ---------------- */

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.summaryRow}>
      <Icon name={icon as any} size={16} color={semantic.primary} />
      <Typography variant="body" color="secondary" style={{ flex: 1 }}>
        {text}
      </Typography>
    </View>
  );
}

function AIAnalysisCard({
  analysis,
  onRegenerate,
}: {
  analysis: { status: 'loading' | 'done'; result?: AssistantResult };
  onRegenerate: () => void;
}) {
  if (analysis.status === 'loading' || !analysis.result) {
    return (
      <Card background={semantic.accentAISoft}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={semantic.accentAI} />
          <Typography variant="body" color="primary" style={{ marginLeft: spacing.sm }}>
            AI 正在分析你的近期状态…
          </Typography>
        </View>
      </Card>
    );
  }

  const { summary, suggestions, source } = analysis.result;

  return (
    <Card background={source === 'ai' ? semantic.accentAISoft : semantic.surface}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="sparkles" size={16} color={semantic.accentAI} />
          <Typography variant="captionStrong" color="aiAccent">
            {source === 'ai' ? 'AI 分析' : '当前使用基础分析'}
          </Typography>
        </View>
        <Pressable
          onPress={onRegenerate}
          hitSlop={6}
          style={({ pressed }) => [styles.regenBtn, pressed ? { opacity: 0.7 } : null]}
        >
          <Icon name="refresh" size={14} color={semantic.accentAI} />
          <Typography variant="micro" color="aiAccent">重新生成</Typography>
        </Pressable>
      </View>

      {source === 'local' ? (
        <Typography variant="caption" color="tertiary" style={{ marginTop: spacing.sm, lineHeight: 20 }}>
          暂时无法连接 AI，已为你使用本地基础分析。
        </Typography>
      ) : null}

      {summary ? (
        <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
          {summary}
        </Typography>
      ) : null}

      <View style={{ marginTop: spacing.md, gap: spacing.md }}>
        {suggestions.map((s, i) => {
          const st = suggestionStyle(s.type);
          return <SuggestionCard key={`${s.type}-${i}`} title={s.title} content={s.content} icon={st.icon} tint={st.tint} />;
        })}
      </View>
    </Card>
  );
}

function SuggestionCard({
  title,
  content,
  icon,
  tint,
}: {
  title: string;
  content: string;
  icon: string;
  tint: Tint;
}) {
  const bg =
    tint === 'ai'
      ? semantic.accentAISoft
      : tint === 'diet'
        ? semantic.accentDietSoft
        : tint === 'primary'
          ? semantic.primaryBg
          : semantic.surface;
  const accent =
    tint === 'ai' ? semantic.accentAI : tint === 'diet' ? semantic.accentDiet : semantic.primary;

  return (
    <Card background={bg}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={icon as any} size={16} color={accent} />
          <Typography variant="captionStrong" color={tint === 'neutral' ? 'secondary' : tint === 'ai' ? 'aiAccent' : tint}>
            AI 建议 · {title}
          </Typography>
        </View>
      </View>
      <Typography variant="body" color="primary" style={{ marginTop: spacing.sm, lineHeight: 23 }}>
        {content}
      </Typography>
    </Card>
  );
}

const styles = {
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  loadingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  regenBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipWrap: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: semantic.primaryBg,
  },
  qBubble: {
    alignSelf: 'flex-end' as const,
    backgroundColor: semantic.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.smallCard,
    borderBottomRightRadius: radii.xs,
    maxWidth: '85%' as const,
  },
  aBubble: {
    alignSelf: 'flex-start' as const,
    backgroundColor: semantic.accentAISoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.smallCard,
    borderBottomLeftRadius: radii.xs,
    maxWidth: '92%' as const,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: semantic.surface,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: semantic.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: semantic.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: semantic.accentAI,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

export default AIAssistantScreen;
