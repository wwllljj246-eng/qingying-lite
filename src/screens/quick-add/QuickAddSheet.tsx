import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ModalSheet, Typography, Icon, IconName } from '@/components';
import { semantic, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

export interface QuickAddItem {
  key: string;
  label: string;
  icon: IconName;
  color: 'primary' | 'pink' | 'purple' | 'yellow';
  onPress: () => void;
}

export interface QuickAddSheetProps {
  visible: boolean;
  onDismiss: () => void;
  items: QuickAddItem[];
}

const COLOR_MAP = {
  primary: { bg: semantic.primaryBg, icon: semantic.primary },
  pink: { bg: semantic.accentDietSoft, icon: palette.pink400 },
  purple: { bg: semantic.accentAISoft, icon: semantic.accentAI },
  yellow: { bg: semantic.accentRewardSoft, icon: palette.yellow400 },
};

export function QuickAddSheet({ visible, onDismiss, items }: QuickAddSheetProps) {
  if (!visible) return null;
  return (
    <ModalSheet title="快速记录" snapPoints={['60%']} onDismiss={onDismiss}>
      <View style={styles.grid}>
        {items.map((it) => {
          const c = COLOR_MAP[it.color];
          return (
            <Pressable
              key={it.key}
              onPress={() => {
                onDismiss();
                it.onPress();
              }}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
                <Icon name={it.icon} size={22} color={c.icon} strokeWidth={2.2} />
              </View>
              <Typography variant="captionStrong" style={{ marginTop: 6 }}>
                {it.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      <Typography variant="micro" color="tertiary" align="center" style={{ marginTop: spacing.sm }}>
        长按 ＋ 按钮也可快速记录
      </Typography>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  item: {
    width: '31%',
    backgroundColor: semantic.surface,
    borderRadius: radii.largeCard,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuickAddSheet;