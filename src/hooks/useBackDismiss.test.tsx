/** @vitest-environment jsdom */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBackDismiss } from './useBackDismiss';

const Harness = ({ open, onDismiss }: { open: boolean; onDismiss: () => void }) => {
  useBackDismiss(open, onDismiss);
  return null;
};

describe('useBackDismiss', () => {
  afterEach(cleanup);

  it('dismisses an open overlay when Back pops its history entry', async () => {
    const onDismiss = vi.fn();
    window.history.replaceState({}, '', '/exercises');
    render(<Harness open onDismiss={onDismiss} />);

    await waitFor(() => expect(window.history.state.__workoutBuddyOverlay).toBeTruthy());
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/exercises');
  });

  it('closes only the top overlay when dialogs are nested', async () => {
    const dismissParent = vi.fn();
    const dismissChild = vi.fn();
    window.history.replaceState({}, '', '/calendar');
    const view = render(<Harness open onDismiss={dismissParent} />);

    await waitFor(() => expect(window.history.state.__workoutBuddyOverlay).toBeTruthy());
    const parentState = window.history.state;
    view.rerender(<><Harness open onDismiss={dismissParent} /><Harness open onDismiss={dismissChild} /></>);
    await waitFor(() => expect(window.history.state.__workoutBuddyOverlay).not.toBe(parentState.__workoutBuddyOverlay));

    window.dispatchEvent(new PopStateEvent('popstate', { state: parentState }));

    expect(dismissChild).toHaveBeenCalledOnce();
    expect(dismissParent).not.toHaveBeenCalled();
  });
});

