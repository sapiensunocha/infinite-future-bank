// Transaction PIN: ask for it before any money leaves the wallet.
//   if (!(await requirePin())) return;   // user cancelled
// The server enforces it too (see migration 20261124): a verified PIN grants ONE money
// action for 2 minutes, so call requirePin() immediately before the money request.
const EVENT = 'ifb:pin';

/** Resolves true once the PIN is verified (setting one up first if needed), false if cancelled. */
export function requirePin(options = {}) {
  return new Promise((resolve) => {
    // No host mounted (should not happen): do not silently skip — the server still enforces it.
    const timer = setTimeout(() => resolve(true), 400);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { ...options, resolve, ack: () => clearTimeout(timer) } }));
  });
}

/** Opens the "change PIN" flow (Settings). Resolves true when the PIN was changed. */
export function changePin() {
  return requirePin({ mode: 'change' });
}

export const isPinRequiredError = (err) => /PIN_REQUIRED/i.test(String(err?.message || err || ''));
export const PIN_EVENT = EVENT;
