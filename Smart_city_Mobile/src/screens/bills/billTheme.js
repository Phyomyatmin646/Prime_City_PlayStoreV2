import { primeLightTheme } from '../../theme/primeTheme';

export const darkBillTheme = {
  mode: 'dark',
  background: '#05080A',
  surface: '#080C0F',
  card: '#0E1316',
  primary: '#F5AD27',
  primaryBg: '#2B1D06',
  primaryText: '#171006',
  text: '#F5F3EF',
  subtext: '#AAA39D',
  border: '#30363A',
  goldBorder: '#5B3C08',
  softGoldBorder: '#3E3527',
  deepBorder: '#252C30',
  input: '#090E11',
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

export const lightBillTheme = {
  ...primeLightTheme,
  goldBorder: 'rgba(184, 117, 8, 0.52)',
  softGoldBorder: '#E7D2AB',
  deepBorder: primeLightTheme.divider,
};

export function getBillTheme(appTheme) {
  return appTheme?.mode === 'light' ? lightBillTheme : darkBillTheme;
}

export default darkBillTheme;
