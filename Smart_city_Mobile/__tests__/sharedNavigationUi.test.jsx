/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Image } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import BottomNavBar from '../src/components/BottomNavBar';
import TopBar from '../src/components/TopBar';
import { darkTheme, lightTheme } from '../src/context/ThemeContext';
import {
  primeDarkTheme,
  primeLightTheme,
} from '../src/theme/primeTheme';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('../src/context/ThemeContext', () => {
  const actual = jest.requireActual('../src/context/ThemeContext');
  return {
    ...actual,
    useTheme: () => ({ theme: actual.darkTheme }),
  };
});

jest.mock('../src/context/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 3 }),
}));

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

async function render(element) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer;
}

describe('shared Prime City navigation UI', () => {
  test('keeps the global dark/light fallback on the Prime semantic palette', () => {
    expect(darkTheme).toBe(primeDarkTheme);
    expect(lightTheme).toBe(primeLightTheme);
    expect(darkTheme).toEqual(
      expect.objectContaining({
        background: '#05080A',
        surface: '#080C0F',
        card: '#0E1316',
        primary: '#F5AD27',
        text: '#F5F3EF',
      }),
    );
    expect(lightTheme).toEqual(
      expect.objectContaining({
        background: '#FAF9F6',
        surface: '#FFFFFF',
        primary: '#B87508',
        text: '#151310',
      }),
    );
  });

  test('uses the official logo by default and preserves header actions', async () => {
    const navigation = { navigate: jest.fn() };
    const renderer = await render(<TopBar navigation={navigation} />);
    const root = renderer.root;
    const logo = findByAccessibilityLabel(root, 'Prime City logo');

    expect(logo.type).toBe(Image);
    expect(logo.props.accessibilityIgnoresInvertColors).toBe(true);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Open notifications').props.onPress();
      findByAccessibilityLabel(root, 'Pre-register a visitor').props.onPress();
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(1, 'Notifications');
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, 'PreRegister');

    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/components/TopBar.jsx'),
      'utf8',
    );
    expect(source).toContain("require('../assets/app-icon-master.png')");
    expect(source).not.toContain('name="business"');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps tab presses single, accessible and SOS-specific', async () => {
    const onTabPress = jest.fn();
    const renderer = await render(
      <BottomNavBar activeRoute="Home" onTabPress={onTabPress} />,
    );
    const root = renderer.root;
    const sosTab = findByAccessibilityLabel(root, 'Emergency SOS');

    expect(sosTab.props.accessibilityRole).toBe('tab');
    expect(sosTab.props.accessibilityState).toEqual({ selected: false });
    expect(
      sosTab.find(node => node.type === 'Ionicons').props.name,
    ).toBe('warning-outline');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Home tab').props.onPress();
      sosTab.props.onPress();
    });
    expect(onTabPress.mock.calls).toEqual([['Home'], ['SOS']]);

    await ReactTestRenderer.act(async () => {
      renderer.update(
        <BottomNavBar activeRoute="SOS" onTabPress={onTabPress} />,
      );
    });
    const focusedSos = findByAccessibilityLabel(
      renderer.root,
      'Emergency SOS',
    );
    expect(focusedSos.props.accessibilityState).toEqual({ selected: true });
    expect(
      focusedSos.find(node => node.type === 'Ionicons').props.name,
    ).toBe('warning');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('routes a stack-level shared bar back through the existing Tabs navigator', async () => {
    const navigation = { navigate: jest.fn() };
    const renderer = await render(
      <BottomNavBar navigation={navigation} activeRoute="Home" />,
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(renderer.root, 'Bills tab').props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Bills',
    });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
