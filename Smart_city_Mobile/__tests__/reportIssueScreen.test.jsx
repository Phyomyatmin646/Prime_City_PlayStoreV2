/* eslint-env jest */

import React from 'react';
import { ActivityIndicator } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ReportIssueScreen from '../src/screens/reports/ReportIssueScreen';
import { getReportTheme } from '../src/screens/reports/reportTheme';
import { submitReport } from '../src/api/reports';
import { showPrimeAlert } from '../src/services/primeAlert';

let mockScreenContainerProps;

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { mode: 'dark' } }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { room_id: 'B-P32' } }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return function MockScreenContainer({ children, ...props }) {
    mockScreenContainerProps = props;
    return ReactModule.createElement(View, null, children);
  };
});

jest.mock('../src/api/reports', () => ({
  REPORT_TYPES: ['Maintenance', 'Security', 'Other'],
  submitReport: jest.fn(),
}));

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
}));

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

function flattenText(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(flattenText).join('');
  return '';
}

function renderedText(root) {
  return root
    .findAll(node => flattenText(node.props.children))
    .map(node => flattenText(node.props.children))
    .join('\n');
}

async function renderScreen(navigation = { goBack: jest.fn() }) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ReportIssueScreen navigation={navigation} />,
    );
  });
  return renderer;
}

async function fillRequiredFields(root) {
  await ReactTestRenderer.act(async () => {
    findByAccessibilityLabel(root, 'Report title').props.onChangeText(
      '  Lift noise  ',
    );
    findByAccessibilityLabel(root, 'Report location').props.onChangeText(
      '  Block B lobby  ',
    );
    findByAccessibilityLabel(root, 'Report details').props.onChangeText(
      '  Loud noise from the lift.  ',
    );
  });
}

describe('Resident report issue screen contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScreenContainerProps = undefined;
    submitReport.mockResolvedValue({ _id: 'report-1' });
  });

  test('keeps the report theme scoped and light-mode compatible', () => {
    expect(getReportTheme({ mode: 'dark' })).toEqual(
      expect.objectContaining({
        mode: 'dark',
        background: '#05080A',
        card: '#0E1316',
        primary: '#F5AD27',
      }),
    );
    expect(getReportTheme({ mode: 'light' })).toEqual(
      expect.objectContaining({
        mode: 'light',
        background: '#FAF9F6',
        card: '#FFFFFF',
      }),
    );
  });

  test('preserves shared mobile chrome, exact fields, default type and room location', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = renderedText(root);

    expect(mockScreenContainerProps).toEqual(
      expect.objectContaining({
        topBarVariant: 'stack',
        title: 'Report Issue',
        showBottomNav: true,
      }),
    );
    expect(mockScreenContainerProps.themeOverride.background).toBe('#05080A');
    expect(rendered).toContain('Type');
    expect(rendered).toContain('Title');
    expect(rendered).toContain('Location');
    expect(rendered).toContain('Details');
    expect(rendered).toContain('Submit report');
    expect(
      findByAccessibilityLabel(root, 'Maintenance report type').props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(
      findByAccessibilityLabel(root, 'Security report type').props
        .accessibilityState,
    ).toEqual({ selected: false });
    expect(findByAccessibilityLabel(root, 'Report location').props.value).toBe(
      'Unit B-P32',
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves required-field validation without calling the API', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Submit report').props.onPress();
    });

    expect(submitReport).not.toHaveBeenCalled();
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Missing fields',
      'Please enter title, location, and details.',
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('submits the same trimmed payload and preserves the success go-back flow', async () => {
    const navigation = { goBack: jest.fn() };
    const renderer = await renderScreen(navigation);
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Security report type').props.onPress();
    });
    await fillRequiredFields(root);

    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(root, 'Submit report').props.onPress();
    });

    expect(submitReport).toHaveBeenCalledWith({
      title: 'Lift noise',
      location: 'Block B lobby',
      message: 'Loud noise from the lift.',
      type: 'Security',
    });
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Report submitted',
      'Admin staff will review your report.',
      [expect.objectContaining({ text: 'OK', onPress: expect.any(Function) })],
    );
    expect(findByAccessibilityLabel(root, 'Report title').props.value).toBe('');
    expect(findByAccessibilityLabel(root, 'Report details').props.value).toBe(
      '',
    );
    expect(findByAccessibilityLabel(root, 'Report location').props.value).toBe(
      '  Block B lobby  ',
    );

    const successButtons = showPrimeAlert.mock.calls[0][2];
    successButtons[0].onPress();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps submitting disabled while pending and preserves API error handling', async () => {
    let rejectRequest;
    submitReport.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    const renderer = await renderScreen();
    const root = renderer.root;
    await fillRequiredFields(root);

    let request;
    await ReactTestRenderer.act(async () => {
      request = findByAccessibilityLabel(root, 'Submit report').props.onPress();
      await Promise.resolve();
    });

    expect(findByAccessibilityLabel(root, 'Submit report').props.disabled).toBe(
      true,
    );
    expect(root.findAllByType(ActivityIndicator)).toHaveLength(1);

    await ReactTestRenderer.act(async () => {
      rejectRequest(new Error('Report service unavailable'));
      await request;
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Submit failed',
      'Report service unavailable',
    );
    expect(findByAccessibilityLabel(root, 'Submit report').props.disabled).toBe(
      false,
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves the session-expired alert guard', async () => {
    submitReport.mockRejectedValue({ sessionExpired: true });
    const renderer = await renderScreen();
    const root = renderer.root;
    await fillRequiredFields(root);

    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(root, 'Submit report').props.onPress();
    });

    expect(showPrimeAlert).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
