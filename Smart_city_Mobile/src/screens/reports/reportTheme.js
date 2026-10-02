import { primeLightTheme } from '../../theme/primeTheme';

export const darkReportTheme = {
  mode: 'dark',
  background: '#05080A',
  surface: '#080C0F',
  card: '#0E1316',
  raised: '#13181C',
  elevated: '#11171A',
  input: '#090E11',
  primary: '#F5AD27',
  primaryBg: '#2B1D06',
  primaryText: '#171006',
  text: '#F5F3EF',
  subtext: '#AAA39D',
  border: '#30363A',
  divider: '#252C30',
  goldBorder: '#5B3C08',
  softGoldBorder: '#3E3527',
  iconSurface: 'rgba(245, 173, 39, 0.09)',
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

export const lightReportTheme = {
  ...primeLightTheme,
  elevated: primeLightTheme.elevated || primeLightTheme.raised,
  softGoldBorder: '#E7D2AB',
};

export function getReportTheme(appTheme) {
  return appTheme?.mode === 'light' ? lightReportTheme : darkReportTheme;
}

export default darkReportTheme;
