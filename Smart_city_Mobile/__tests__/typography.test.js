import {
  containsMyanmarText,
  getMyanmarTextStyle,
  myanmarFontFamilies,
} from '../src/theme/typography';

describe('Myanmar typography', () => {
  it('detects Myanmar and mixed-script text', () => {
    expect(containsMyanmarText('မြန်မာစာ စမ်းသပ်ခြင်း')).toBe(true);
    expect(containsMyanmarText('Prime City အကောင့် 123')).toBe(true);
    expect(containsMyanmarText('Prime City 123')).toBe(false);
  });

  it('uses an explicit Walone variant only for Myanmar text', () => {
    expect(getMyanmarTextStyle('ရန်ကုန်မြို့', 'bold')).toEqual({
      fontFamily: myanmarFontFamilies.bold,
      fontWeight: 'normal',
    });
    expect(getMyanmarTextStyle('Prime City', 'bold')).toBeNull();
  });

  it('exposes every supplied font variant', () => {
    expect(myanmarFontFamilies.thin).toBeTruthy();
    expect(myanmarFontFamilies.regular).toBeTruthy();
    expect(myanmarFontFamilies.bold).toBeTruthy();
  });
});
