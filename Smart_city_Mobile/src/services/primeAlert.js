let presenter = null;
let pendingAlerts = [];

export function normalizeAlertRequest(title, message, buttons, options) {
  return {
    title: String(title ?? ''),
    message: message === undefined || message === null ? '' : String(message),
    buttons:
      Array.isArray(buttons) && buttons.length > 0
        ? buttons.map(button => ({
            text: String(button?.text || 'OK'),
            onPress: button?.onPress,
            style: button?.style || 'default',
          }))
        : [{ text: 'OK', style: 'default' }],
    options: options || {},
  };
}

export function showPrimeAlert(title, message, buttons, options) {
  const request = normalizeAlertRequest(title, message, buttons, options);
  if (presenter) {
    presenter(request);
  } else {
    pendingAlerts.push(request);
  }
}

export function registerPrimeAlertPresenter(nextPresenter) {
  presenter = nextPresenter;
  if (presenter && pendingAlerts.length > 0) {
    const queued = pendingAlerts;
    pendingAlerts = [];
    queued.forEach(request => presenter(request));
  }

  return () => {
    if (presenter === nextPresenter) presenter = null;
  };
}

export function resetPrimeAlertsForTests() {
  presenter = null;
  pendingAlerts = [];
}
