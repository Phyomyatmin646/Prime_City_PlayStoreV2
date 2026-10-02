import { primeLightTheme } from '../../theme/primeTheme';

const darkProfileTheme = {
  mode: 'dark',
  background: '#05080A',
  surface: '#080C0F',
  card: '#0E1316',
  raised: '#13181C',
  primary: '#F5AD27',
  primaryBg: '#2B1D06',
  primaryText: '#171006',
  text: '#F5F3EF',
  subtext: '#AAA39D',
  border: '#30363A',
  goldBorder: 'rgba(245, 173, 39, 0.68)',
  iconSurface: 'rgba(245, 173, 39, 0.09)',
  input: '#090E11',
  tabBar: '#080C0F',
  tabBarBorder: '#2A2E31',
  inactive: '#716D69',
  icon: '#DED9D2',
  switchOff: '#3B4044',
  shadow: '#000000',
  statusBar: 'light-content',
};

const lightProfileTheme = primeLightTheme;

export function getProfileTheme(appTheme) {
  const profileTheme =
    appTheme?.mode === 'light' ? lightProfileTheme : darkProfileTheme;

  return {
    ...profileTheme,
    danger: appTheme.danger,
    dangerBg: appTheme.dangerBg,
    success: appTheme.success,
    successBg: appTheme.successBg,
    warning: appTheme.warning,
    warningBg: appTheme.warningBg,
  };
}
