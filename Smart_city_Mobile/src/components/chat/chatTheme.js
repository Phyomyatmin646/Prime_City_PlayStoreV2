import { primeLightTheme } from '../../theme/primeTheme';

export const darkChatTheme = {
  mode: 'dark',
  background: '#05080A',
  surface: '#080C0F',
  card: '#0E1316',
  elevated: '#11171A',
  input: '#090E11',
  assistantBubble: '#11161A',
  userBubble: '#D99516',
  primary: '#F5AD27',
  primarySoft: '#FFD166',
  primaryDark: '#B87508',
  primaryBg: '#211706',
  primaryText: '#171005',
  goldBorder: '#5B3C08',
  border: '#30363A',
  text: '#F5F3EF',
  subtext: '#AAA39D',
  inactive: '#716D69',
  icon: '#F5F3EF',
  success: '#45C96B',
  successBg: '#0D2917',
  danger: '#F0524A',
  dangerBg: '#321313',
  warning: '#F5AD27',
  warningBg: '#211706',
  overlay: 'rgba(0, 0, 0, 0.70)',
  shadow: '#000000',
};

export const lightChatTheme = {
  ...primeLightTheme,
  assistantBubble: '#F5F1EA',
  userBubble: '#D99516',
  primarySoft: '#D99516',
};

export function getChatTheme(appTheme) {
  return appTheme?.mode === 'light' ? lightChatTheme : darkChatTheme;
}

export default darkChatTheme;
