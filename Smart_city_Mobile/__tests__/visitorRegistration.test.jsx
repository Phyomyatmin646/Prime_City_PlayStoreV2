/* eslint-env jest */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { VISITOR_PURPOSES } from '../src/api/visitors';
import {
  buildVisitorRegistrationPayload,
  getVisitDetailsValidation,
  getVisitorIdentityValidation,
} from '../src/screens/visitors/PreRegisterVisitorScreen';
import PreRegisterVisitorScreen from '../src/screens/visitors/PreRegisterVisitorScreen';
import { registerVisitor } from '../src/api/visitors';
import { showPrimeAlert } from '../src/services/primeAlert';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      mode: 'dark',
      danger: '#EF4444',
      dangerBg: '#3B1118',
      success: '#10B981',
      successBg: '#052E1C',
      warning: '#F59E0B',
      warningBg: '#3B2506',
    },
  }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { fullname: 'Resident Host' } }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { TouchableOpacity, View } = require('react-native');

  return function MockScreenContainer({ children, onBackPress }) {
    return ReactModule.createElement(
      View,
      null,
      ReactModule.createElement(TouchableOpacity, {
        accessibilityLabel: 'Mock visible back',
        onPress: onBackPress,
      }),
      children,
    );
  };
});

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
}));

jest.mock('../src/api/visitors', () => {
  const actual = jest.requireActual('../src/api/visitors');
  return {
    ...actual,
    registerVisitor: jest.fn(),
  };
});

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

async function renderScreen(navigationOverrides = {}) {
  const navigation = {
    goBack: jest.fn(),
    replace: jest.fn(),
    ...navigationOverrides,
  };
  let renderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <PreRegisterVisitorScreen navigation={navigation} />,
    );
  });

  return { navigation, renderer };
}

async function fillIdentity(root, values = {}) {
  const identity = {
    name: 'Alex Morgan',
    email: 'visitor@example.com',
    phone: '+95 912345678',
    host: 'Resident Host',
    ...values,
  };

  await ReactTestRenderer.act(async () => {
    findByAccessibilityLabel(root, 'Visitor name').props.onChangeText(
      identity.name,
    );
    findByAccessibilityLabel(root, 'Email').props.onChangeText(identity.email);
    findByAccessibilityLabel(root, 'Phone number').props.onChangeText(
      identity.phone,
    );
    findByAccessibilityLabel(root, 'Host name').props.onChangeText(
      identity.host,
    );
  });

  return identity;
}

describe('visitor registration contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps the established validation messages and exact API payload', () => {
    expect(
      getVisitorIdentityValidation({
        name: '',
        email: '',
        phone: '',
        host: '',
      }),
    ).toEqual({
      title: 'Missing fields',
      message: 'Please fill in visitor name, email, phone, and host.',
    });

    expect(
      getVisitorIdentityValidation({
        name: 'Alex Morgan',
        email: 'invalid',
        phone: '123',
        host: 'Resident Host',
      }),
    ).toEqual({
      title: 'Invalid email',
      message: 'Please enter a valid email address.',
    });

    expect(
      getVisitDetailsValidation({
        agreedToTerms: false,
        visitDate: '2026-08-24',
      }),
    ).toEqual({
      title: 'Terms required',
      message: 'You must agree to the visitor terms before registering.',
    });

    expect(
      buildVisitorRegistrationPayload({
        name: ' Alex Morgan ',
        email: ' visitor@example.com ',
        phone: ' +95 912345678 ',
        host: ' Resident Host ',
        purpose: 'Meeting',
        purposeDetail: ' Lobby ',
        visitDate: '2026-08-24',
      }),
    ).toEqual({
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'visitor@example.com',
      phone: '+95 912345678',
      hostName: 'Resident Host',
      purpose: 'Meeting',
      purposeDetail: 'Lobby',
      visitDate: '2026-08-24',
      agreedToTerms: true,
    });
  });

  test('validates Step 1 without submitting and keeps the host default', async () => {
    const { renderer } = await renderScreen();
    const root = renderer.root;

    expect(findByAccessibilityLabel(root, 'Host name').props.value).toBe(
      'Resident Host',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Continue to visit details',
      ).props.onPress();
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Missing fields',
      'Please fill in visitor name, email, phone, and host.',
    );
    expect(registerVisitor).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain('Step 1 of 2');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves values across both steps and submits the existing payload once', async () => {
    registerVisitor.mockResolvedValue({
      data: {
        id: 'visitor-1',
        visitor_pass: { qr_image_data_url: 'data:image/png;base64,qr' },
      },
    });
    const { navigation, renderer } = await renderScreen();
    const root = renderer.root;
    const identity = await fillIdentity(root);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Continue to visit details',
      ).props.onPress();
    });

    expect(registerVisitor).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain('Step 2 of 2');
    expect(JSON.stringify(renderer.toJSON())).toContain(identity.name);
    expect(JSON.stringify(renderer.toJSON())).toContain(identity.email);
    expect(
      VISITOR_PURPOSES.every(item =>
        Boolean(findByAccessibilityLabel(root, `${item} purpose`)),
      ),
    ).toBe(true);
    expect(() => findByAccessibilityLabel(root, 'Time')).toThrow();

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Meeting purpose').props.onPress();
      findByAccessibilityLabel(root, 'Visit date').props.onChangeText(
        '2026-08-24',
      );
      findByAccessibilityLabel(
        root,
        'Additional details optional',
      ).props.onChangeText('Lobby meeting');
      findByAccessibilityLabel(
        root,
        'Agree to visitor registration terms',
      ).props.onPress();
      findByAccessibilityLabel(root, 'Edit visitor details').props.onPress();
    });

    expect(findByAccessibilityLabel(root, 'Visitor name').props.value).toBe(
      identity.name,
    );
    expect(findByAccessibilityLabel(root, 'Email').props.value).toBe(
      identity.email,
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Continue to visit details',
      ).props.onPress();
    });

    expect(
      findByAccessibilityLabel(root, 'Meeting purpose').props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(findByAccessibilityLabel(root, 'Visit date').props.value).toBe(
      '2026-08-24',
    );
    expect(
      findByAccessibilityLabel(root, 'Additional details optional').props.value,
    ).toBe('Lobby meeting');
    expect(
      findByAccessibilityLabel(root, 'Agree to visitor registration terms')
        .props.accessibilityState,
    ).toEqual({ checked: true });

    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(
        root,
        'Submit visitor registration',
      ).props.onPress();
    });

    expect(registerVisitor).toHaveBeenCalledTimes(1);
    expect(registerVisitor).toHaveBeenCalledWith({
      firstName: 'Alex',
      lastName: 'Morgan',
      email: identity.email,
      phone: identity.phone,
      hostName: identity.host,
      purpose: 'Meeting',
      purposeDetail: 'Lobby meeting',
      visitDate: '2026-08-24',
      agreedToTerms: true,
    });
    expect(navigation.replace).toHaveBeenCalledWith('VisitorPass', {
      initialPass: expect.objectContaining({ id: 'visitor-1' }),
    });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('visible back returns from Step 2 before leaving the screen', async () => {
    const { navigation, renderer } = await renderScreen();
    const root = renderer.root;
    await fillIdentity(root);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Continue to visit details',
      ).props.onPress();
    });

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Mock visible back').props.onPress();
    });

    expect(JSON.stringify(renderer.toJSON())).toContain('Step 1 of 2');
    expect(navigation.goBack).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Mock visible back').props.onPress();
    });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
