import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text as NativeText } from 'react-native';
import { AppText, textFromChildren } from '../src/components/AppText';
import { myanmarFontFamilies } from '../src/theme/typography';

describe('AppText Myanmar coverage', () => {
  it('extracts mixed nested visible text', () => {
    expect(
      textFromChildren(['Prime City ', <NativeText key="nested">မြန်မာ</NativeText>]),
    ).toBe('Prime City မြန်မာ');
  });

  it('applies Walone and a clipping-safe line height only to Myanmar text', async () => {
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppText style={{ fontSize: 16, fontWeight: '700' }}>
          အသိပေးချက်
        </AppText>,
      );
    });

    const style = StyleSheet.flatten(renderer.root.findByType(NativeText).props.style);
    expect(style.fontFamily).toBe(myanmarFontFamilies.bold);
    expect(style.fontWeight).toBe('normal');
    expect(style.lineHeight).toBeGreaterThanOrEqual(25);
  });

  it('leaves English-only typography unchanged', async () => {
    let renderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppText style={{ fontSize: 16, fontWeight: '700' }}>Settings</AppText>,
      );
    });

    const style = StyleSheet.flatten(renderer.root.findByType(NativeText).props.style);
    expect(style.fontFamily).toBeUndefined();
    expect(style.fontWeight).toBe('700');
  });
});
