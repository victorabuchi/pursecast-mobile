// Sign-in screens: the values of the web's auth styles (auth.module.css).
export const auth = {
  brand: '#0f7a63',
  brandTint: '#e6f4f0',
  ink: '#14181f',
  muted: '#5d6673',
  line: '#e3e7ec',
  danger: '#c92a2a',
  dangerTint: '#fceeee',
  notice: '#fff7e6',
  page: '#050d10',
};

// The app's colours: the variables on .app in app.module.css. The light values
// of soft, line2, warn-*, neg-* and pos-bg are the originals from before the
// web's dark-mode commit (92ab1f8), which left those as self-references.
export type Palette = {
  b: string; bHover: string; bt: string; ink: string; muted: string; line: string; bg: string; sun: string; neg: string; pos: string; card: string; onB: string;
  soft: string; line2: string; glass: string; warnBg: string; warnBg2: string; warnLine: string; negBg: string; negBg2: string; negLine: string; posBg: string;
  violetBg: string; indigoBg: string; indigo: string; ink2: string;
};

export const light: Palette = {
  b: '#0f7a63', bHover: '#0b5c4b', bt: '#e6f2ef', ink: '#14181f', muted: '#6b7380', line: '#e3e7ec', bg: '#f5f7fa', sun: '#f5a524', neg: '#dc2626', pos: '#15803d', card: '#fff', onB: '#fff',
  soft: '#f1f5f9', line2: '#cfd5dc', glass: 'rgba(255, 255, 255, 0.94)', warnBg: '#fffbeb', warnBg2: '#fef3c7', warnLine: '#fde68a', negBg: '#fef2f2', negBg2: '#fee2e2', negLine: '#fecaca', posBg: '#dcfce7',
  violetBg: '#ede9fe', indigoBg: '#e0e7ff', indigo: '#4338ca', ink2: '#334155',
};

export const dark: Palette = {
  b: '#3fbf98', bHover: '#5fd3ae', bt: '#123129', ink: '#e7eaee', muted: '#97a0ab', line: '#262c34', bg: '#0d1015', sun: '#f7b541', neg: '#f87171', pos: '#4ade80', card: '#151a20', onB: '#062a21',
  soft: '#1c222a', line2: '#38414b', glass: 'rgba(21, 26, 32, 0.92)', warnBg: '#251f0e', warnBg2: '#3a2f10', warnLine: '#5c4a14', negBg: '#2a1417', negBg2: '#3a1a1e', negLine: '#5c2229', posBg: '#112a1b',
  violetBg: '#231d3d', indigoBg: '#1d2142', indigo: '#a5b4fc', ink2: '#cbd5e1',
};

// Weather colours, the same in both themes (.sky_* in app.module.css).
export const sky = { sun: '#f59e0b', partly: '#d97706', cloud: '#64748b', storm: '#7c3aed' } as const;
