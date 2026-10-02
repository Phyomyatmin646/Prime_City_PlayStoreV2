import { Platform } from 'react-native';

const MYANMAR_UNICODE_PATTERN = /[\u1000-\u109F\uA9E0-\uA9FF\uAA60-\uAA7F]/;

const selectFontFamily = ({ android, ios }) =>
  Platform.select({ android, ios, default: ios });

export const myanmarFontFamilies = {
  thin: selectFontFamily({
    android: 'Z06-Walone Thin',
    ios: 'Z06Walone-Thin',
  }),
  regular: selectFontFamily({
    android: 'Z06-Walone Regular',
    ios: 'Z06Walone',
  }),
  bold: selectFontFamily({
    android: 'Z06-Walone Bold',
    ios: 'Z06Walone-Bold',
  }),
};

const myanmarTextStyles = {
  thin: { fontFamily: myanmarFontFamilies.thin, fontWeight: 'normal' },
  regular: { fontFamily: myanmarFontFamilies.regular, fontWeight: 'normal' },
  bold: { fontFamily: myanmarFontFamilies.bold, fontWeight: 'normal' },
};

export function containsMyanmarText(value) {
  return MYANMAR_UNICODE_PATTERN.test(String(value ?? ''));
}

export function getMyanmarTextStyle(value, variant = 'regular') {
  if (!containsMyanmarText(value)) return null;
  return myanmarTextStyles[variant] || myanmarTextStyles.regular;
}
