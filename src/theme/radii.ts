/**
 * 圆角
 *  sm 8 / md 12 / smallCard 16 / largeCard 24 / button 16 / pill 999
 */
export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  smallCard: 16,
  largeCard: 24,
  button: 16,
  fab: 28,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radii;
export default radii;