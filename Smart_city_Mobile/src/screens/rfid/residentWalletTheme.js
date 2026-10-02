import { primeLightTheme } from '../../theme/primeTheme';

export const darkResidentWalletTheme = {
  mode: 'dark',
  background: '#05080A',
  surface: '#080C0F',
  card: '#0E1316',
  raised: '#13191D',
  input: '#090E11',
  primary: '#F5AD27',
  primaryBg: '#2B1D06',
  primaryText: '#171006',
  text: '#F5F3EF',
  subtext: '#AAA39D',
  border: '#30363A',
  goldBorder: 'rgba(245, 173, 39, 0.56)',
  divider: '#252C30',
  tabBar: '#080C0F',
  tabBarBorder: '#2A2E31',
  inactive: '#716D69',
  icon: '#DED9D2',
  danger: '#F0524A',
  dangerBg: '#321313',
  success: '#45C96B',
  successBg: '#0A2B18',
  warning: '#F5AD27',
  warningBg: '#2B1D06',
  statusBar: 'light-content',
  shadow: '#000000',
};

export const lightResidentWalletTheme = {
  ...primeLightTheme,
  raised: primeLightTheme.raised || primeLightTheme.surface,
  goldBorder: 'rgba(184, 117, 8, 0.5)',
  divider: primeLightTheme.divider || primeLightTheme.border,
};

export function getResidentWalletTheme(appTheme) {
  if (appTheme?.mode !== 'light') return darkResidentWalletTheme;

  return {
    ...lightResidentWalletTheme,
    ...appTheme,
    raised:
      appTheme.raised || appTheme.surface || lightResidentWalletTheme.raised,
    goldBorder: lightResidentWalletTheme.goldBorder,
    divider:
      appTheme.divider || appTheme.border || lightResidentWalletTheme.divider,
  };
}

export default darkResidentWalletTheme;
