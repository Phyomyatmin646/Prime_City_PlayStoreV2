import {
  normalizeAlertRequest,
  registerPrimeAlertPresenter,
  resetPrimeAlertsForTests,
  showPrimeAlert,
} from '../src/services/primeAlert';
import { inferAlertKind } from '../src/components/PrimeAlertProvider';

describe('Prime alert service', () => {
  afterEach(() => resetPrimeAlertsForTests());

  it('preserves alert actions, styles, and options', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    const request = normalizeAlertRequest(
      'Delete item?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress },
      ],
      { cancelable: true, onDismiss },
    );

    expect(request.title).toBe('Delete item?');
    expect(request.message).toBe('This cannot be undone.');
    expect(request.buttons[1]).toEqual({
      text: 'Delete',
      style: 'destructive',
      onPress,
    });
    expect(request.options).toEqual({ cancelable: true, onDismiss });
  });

  it('supplies the native-compatible default OK action', () => {
    expect(normalizeAlertRequest('Saved').buttons).toEqual([
      { text: 'OK', style: 'default' },
    ]);
  });

  it('queues alerts raised before the provider registers', () => {
    const present = jest.fn();
    showPrimeAlert('First', 'Queued');
    const unregister = registerPrimeAlertPresenter(present);

    expect(present).toHaveBeenCalledTimes(1);
    expect(present.mock.calls[0][0].title).toBe('First');
    unregister();
  });

  it('keeps destructive semantics and recognizes status kinds', () => {
    expect(
      inferAlertKind('Confirm', [{ text: 'Delete', style: 'destructive' }]),
    ).toBe('destructive');
    expect(inferAlertKind('Profile updated')).toBe('success');
    expect(inferAlertKind('Invalid amount')).toBe('warning');
    expect(inferAlertKind('Upload failed')).toBe('error');
  });
});
