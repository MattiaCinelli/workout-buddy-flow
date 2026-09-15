/** @vitest-environment jsdom */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { toastMock, dismissMock, updateServiceWorker } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  dismissMock: vi.fn(),
  updateServiceWorker: vi.fn(),
}));

toastMock.mockReturnValue('update-toast');
vi.mock('sonner', () => ({ toast: Object.assign(toastMock, { dismiss: dismissMock }) }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, vi.fn()],
    updateServiceWorker,
  }),
}));

import { PwaUpdatePrompt } from './PwaUpdatePrompt';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  toastMock.mockReturnValue('update-toast');
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('PwaUpdatePrompt', () => {
  it('reloads when the update action is chosen', () => {
    render(<PwaUpdatePrompt />);
    const options = toastMock.mock.calls[0][1];

    options.action.onClick();

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('shows the update again after a dismissed reminder is snoozed', () => {
    render(<PwaUpdatePrompt />);
    const options = toastMock.mock.calls[0][1];

    act(() => options.onDismiss());
    expect(toastMock).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(30 * 60 * 1000));
    expect(toastMock).toHaveBeenCalledTimes(2);
  });

  it('shows a dismissed update again when the app returns to the foreground', () => {
    render(<PwaUpdatePrompt />);
    const options = toastMock.mock.calls[0][1];
    act(() => options.onDismiss());

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(toastMock).toHaveBeenCalledTimes(2);
  });
});
