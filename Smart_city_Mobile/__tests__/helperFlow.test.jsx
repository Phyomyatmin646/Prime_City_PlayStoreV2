/* eslint-env jest */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import HelperListScreen from '../src/screens/helpers/HelperListScreen';
import HelperRequestScreen from '../src/screens/helpers/HelperRequestScreen';
import {
  HELPER_CATALOG,
  createHelperRequest,
  fetchHelperCatalog,
  fetchHelperRequests,
  fetchHelpers,
  fetchMyHelperRequests,
} from '../src/api/helpers';
import { showPrimeAlert } from '../src/services/primeAlert';
import {
  buildHelperQuery,
  buildHelperRequestPayload,
  filterMatchingHelpers,
  getHelperServiceIcon,
  normalizeHelperCatalog,
} from '../src/screens/helpers/helperUi';

let mockUserRole = 'Resident';
let mockScreenContainerProps;
let mockAppTheme = {
  mode: 'dark',
  danger: '#EF4444',
  dangerBg: '#3B1118',
  success: '#10B981',
  successBg: '#052E1C',
  warning: '#F59E0B',
  warningBg: '#3B2506',
};

const femaleHelper = {
  _id: 'helper-female',
  fullname: 'Su Su Mon',
  gender: 'Female',
  experience: 8,
  phone: '091111111',
  status: 'Active',
};

const maleHelper = {
  _id: 'helper-male',
  fullname: 'Ko Min',
  gender: 'Male',
  experience: 4,
  status: 'Active',
};

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  return {
    useFocusEffect: callback => {
      ReactModule.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockUserRole } }),
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: mockAppTheme }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return function MockScreenContainer({ children, ...props }) {
    mockScreenContainerProps = props;
    return ReactModule.createElement(View, null, children);
  };
});

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
}));

jest.mock('../src/api/helpers', () => {
  const actual = jest.requireActual('../src/api/helpers');
  return {
    ...actual,
    createHelperRequest: jest.fn(),
    fetchHelperCatalog: jest.fn(),
    fetchHelperRequests: jest.fn(),
    fetchHelpers: jest.fn(),
    fetchMyHelperRequests: jest.fn(),
    submitHelperRequest: jest.fn(),
  };
});

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

function visibleText(root) {
  return root
    .findAll(node => flattenText(node.props.children))
    .map(node => flattenText(node.props.children))
    .join('\n');
}

async function renderList(navigation = { navigate: jest.fn() }) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <HelperListScreen navigation={navigation} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return { navigation, renderer };
}

async function renderRequest(
  params = { category: 'Cleaning', gender: 'Female' },
) {
  const navigation = { goBack: jest.fn() };
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <HelperRequestScreen navigation={navigation} route={{ params }} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return { navigation, renderer };
}

describe('Helper flow contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRole = 'Resident';
    mockScreenContainerProps = undefined;
    mockAppTheme = {
      mode: 'dark',
      danger: '#EF4444',
      dangerBg: '#3B1118',
      success: '#10B981',
      successBg: '#052E1C',
      warning: '#F59E0B',
      warningBg: '#3B2506',
    };
    fetchHelperCatalog.mockResolvedValue(HELPER_CATALOG);
    fetchHelpers.mockResolvedValue([femaleHelper, maleHelper]);
    fetchMyHelperRequests.mockResolvedValue([]);
    fetchHelperRequests.mockResolvedValue([]);
    createHelperRequest.mockResolvedValue({ _id: 'request-1' });
  });

  test('keeps the supported icon, query, filter, catalog, and payload rules deterministic', () => {
    expect(getHelperServiceIcon('Cleaning')).toBe('sparkles-outline');
    expect(getHelperServiceIcon('Unknown')).toBe('people-outline');
    expect(buildHelperQuery('Female')).toEqual({
      status: 'Active',
      gender: 'Female',
    });
    expect(buildHelperQuery('No Preference')).toEqual({ status: 'Active' });

    expect(
      filterMatchingHelpers(
        [
          femaleHelper,
          maleHelper,
          { ...femaleHelper, _id: 'inactive', status: 'Inactive' },
        ],
        'Female',
      ),
    ).toEqual([femaleHelper]);
    expect(normalizeHelperCatalog([], HELPER_CATALOG)).toEqual(HELPER_CATALOG);
    expect(
      normalizeHelperCatalog([
        { name: 'Cleaning' },
        { name: 'Cleaning' },
        { name: '' },
      ]),
    ).toEqual([{ name: 'Cleaning' }]);

    expect(
      buildHelperRequestPayload({
        category: 'Cleaning',
        gender: 'Female',
        note: '  Morning please  ',
        helper: femaleHelper,
      }),
    ).toEqual({
      helper_id: 'helper-female',
      type: 'Cleaning',
      gender_preferred: 'Female',
      note: 'Morning please',
    });
    expect(
      buildHelperRequestPayload({
        category: 'Laundry',
        gender: 'No Preference',
        note: '',
        helper: null,
      }),
    ).toEqual({
      type: 'Laundry',
      gender_preferred: 'No Preference',
      note: '',
    });
  });

  test('resident Step 1 preserves live calls and passes only serializable preferences to Step 2', async () => {
    const { navigation, renderer } = await renderList();
    const root = renderer.root;

    expect(fetchHelpers).toHaveBeenCalledWith({ status: 'Active' });
    expect(fetchMyHelperRequests).toHaveBeenCalledTimes(1);
    expect(fetchHelperCatalog).toHaveBeenCalledTimes(1);
    expect(fetchHelperRequests).not.toHaveBeenCalled();
    expect(mockScreenContainerProps).toEqual(
      expect.objectContaining({
        topBarVariant: 'stack',
        title: 'Helpers',
        showBottomNav: true,
      }),
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Cleaning').props.onPress();
      findByAccessibilityLabel(root, 'Female').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'View matching helpers').props.onPress();
    });

    expect(navigation.navigate).toHaveBeenCalledWith('HelperRequest', {
      category: 'Cleaning',
      gender: 'Female',
    });
    expect(navigation.navigate.mock.calls[0][1]).not.toHaveProperty('helpers');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('Admin and Staff keep the existing request-management API path', async () => {
    mockUserRole = 'Admin';
    fetchHelperRequests.mockResolvedValue([
      {
        _id: 'admin-request',
        type: 'Cleaning',
        status: 'Pending',
        gender_preferred: 'Female',
        room_id: { room_name: 'A-101' },
        requested_by: { fullname: 'Resident One' },
      },
    ]);

    const { renderer } = await renderList();
    expect(fetchHelperRequests).toHaveBeenCalledTimes(1);
    expect(fetchHelpers).not.toHaveBeenCalled();
    expect(fetchMyHelperRequests).not.toHaveBeenCalled();
    expect(fetchHelperCatalog).not.toHaveBeenCalled();
    expect(visibleText(renderer.root)).toContain('Helper Requests');
    expect(visibleText(renderer.root)).toContain('Submit & notify resident');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('Step 2 refetches active matching helpers and submits the exact existing API payload', async () => {
    fetchHelpers.mockResolvedValue([
      femaleHelper,
      maleHelper,
      { ...femaleHelper, _id: 'inactive', status: 'Inactive' },
    ]);
    const { renderer } = await renderRequest();
    const root = renderer.root;

    expect(fetchHelpers).toHaveBeenCalledWith({
      status: 'Active',
      gender: 'Female',
    });
    expect(visibleText(root)).toContain('1 active helper');
    expect(visibleText(root)).toContain('Su Su Mon');
    expect(visibleText(root)).not.toContain('Ko Min');
    expect(visibleText(root)).not.toContain('rating');
    expect(visibleText(root)).not.toContain('Available today');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Choose Su Su Mon').props.onPress();
      root
        .find(
          node => node.props.placeholder === 'Schedule, tasks or access notes',
        )
        .props.onChangeText('  Please arrive at 9  ');
    });
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Submit helper request').props.onPress();
      await Promise.resolve();
    });

    expect(createHelperRequest).toHaveBeenCalledWith({
      helper_id: 'helper-female',
      type: 'Cleaning',
      gender_preferred: 'Female',
      note: 'Please arrive at 9',
    });
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Request sent',
      'Admin staff will review your helper request.',
      expect.any(Array),
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('renders the same Helper flow with the shared light theme', async () => {
    mockAppTheme = {
      ...mockAppTheme,
      mode: 'light',
      danger: '#ED2933',
      dangerBg: '#FFF0F1',
      success: '#299B42',
      successBg: '#EDF9F0',
      warning: '#B87508',
      warningBg: '#FFF5DE',
    };

    const { renderer } = await renderList();
    expect(mockScreenContainerProps.themeOverride).toEqual(
      expect.objectContaining({
        mode: 'light',
        background: '#FAF9F6',
        card: '#FFFFFF',
        primary: '#B87508',
      }),
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
