import { primeLightTheme } from '../../theme/primeTheme';

export const darkLoginTheme = {
  mode: 'dark',
  background: '#05080A',
  surface: '#080C0F',
  card: '#0E1316',
  elevated: '#11171A',
  input: 'rgba(8, 12, 15, 0.9)',
  primary: '#F5AD27',
  primaryBg: '#2B1D06',
  primaryText: '#171006',
  text: '#F5F3EF',
  subtext: '#C2BCB5',
  border: 'rgba(245, 173, 39, 0.55)',
  mutedBorder: '#30363A',
  goldBorder: '#7A510C',
  inactive: '#827C75',
  icon: '#E8B84E',
  panel: 'rgba(3, 5, 7, 0.7)',
  panelBorder: 'rgba(245, 173, 39, 0.2)',
  heroOverlay: 'rgba(0, 0, 0, 0.22)',
  logoSurface: '#050505',
  buttonHighlight: 'rgba(255, 230, 163, 0.32)',
  statusBar: 'light-content',
  shadow: '#000000',
};

export const lightLoginTheme = {
  ...primeLightTheme,
  input: 'rgba(255, 255, 255, 0.97)',
  mutedBorder: primeLightTheme.border,
  panel: '#FFFFFF',
  panelBorder: primeLightTheme.border,
  heroOverlay: 'rgba(255, 255, 255, 0.42)',
  logoSurface: '#FFFFFF',
  buttonHighlight: 'rgba(255, 230, 163, 0.48)',
};

export function getLoginTheme(appTheme) {
  return appTheme?.mode === 'light' ? lightLoginTheme : darkLoginTheme;
}

export default darkLoginTheme;
