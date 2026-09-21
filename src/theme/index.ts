import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import radii from './radii';
import shadows from './shadows';

export { colors, typography, spacing, radii, shadows };

export { palette, semantic } from './colors';
export type { PaletteKey } from './colors';
export type { TypographyKey } from './typography';
export type { SpacingKey } from './spacing';
export type { RadiusKey } from './radii';
export type { ShadowKey } from './shadows';

import { layout } from './spacing';
export { layout };

const theme = { colors, typography, spacing, radii, shadows, layout };
export default theme;