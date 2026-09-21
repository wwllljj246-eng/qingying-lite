import type { Rating } from '@/types';

export const MOOD_LIST: Array<{ value: Rating; emoji: string; label: string }> = [
  { value: 1, emoji: '😔', label: '低落' },
  { value: 2, emoji: '😐', label: '一般' },
  { value: 3, emoji: '🙂', label: '还行' },
  { value: 4, emoji: '😊', label: '开心' },
  { value: 5, emoji: '🥰', label: '超棒' },
];

export const ENERGY_LIST: Array<{ value: Rating; emoji: string; label: string }> = [
  { value: 1, emoji: '🪫', label: '疲惫' },
  { value: 2, emoji: '😪', label: '疲倦' },
  { value: 3, emoji: '🙂', label: '还行' },
  { value: 4, emoji: '💪', label: '有劲' },
  { value: 5, emoji: '⚡', label: '满电' },
];

export const SYMPTOM_OPTIONS = [
  '腹胀',
  '头痛',
  '疲劳',
  '失眠',
  '食欲不振',
  '情绪波动',
  '痛经',
  '水肿',
];

export const CYCLE_SYMPTOM_OPTIONS = [
  '痛经',
  '腹胀',
  '头痛',
  '情绪波动',
  '疲劳',
  '乳房胀痛',
  '水肿',
  '食欲变化',
];