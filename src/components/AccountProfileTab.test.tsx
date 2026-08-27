/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';

const { updateDisplayName, updateEmail, changePassword, revokeOtherSessions, deleteAccount, getOtherDeviceCount } =
  vi.hoisted(() => ({
    updateDisplayName: vi.fn(async (_name: string) => {}),
    updateEmail: vi.fn(async (_pw: string, _email: string) => {}),
    changePassword: vi.fn(async (_current: string, _next: string) => {}),
    revokeOtherSessions: vi.fn(async () => {}),
    deleteAccount: vi.fn(async (_pw: string) => {}),
    getOtherDeviceCount: vi.fn(async () => 2),
  }));

vi.mock('@/lib/syncClient', () => ({
  getDisplayName: () => 'Tester',
  getLoggedInEmail: () => 'me@test.dev',
  updateDisplayName, updateEmail, changePassword, revokeOtherSessions, deleteAccount, getOtherDeviceCount,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AccountProfileTab } from './AccountProfileTab';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

describe('AccountProfileTab', () => {
  it('saves the display name', async () => {
    render(<AccountProfileTab />);
    type(screen.getByLabelText('Display name'), 'New Name');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateDisplayName).toHaveBeenCalledWith('New Name'));
  });

  it('updates the email with the current password', async () => {
    render(<AccountProfileTab />);
    type(screen.getByLabelText('Email'), 'new@test.dev');
    type(screen.getByPlaceholderText('Current password, to confirm'), 'pw');
    fireEvent.click(screen.getByRole('button', { name: 'Update email' }));
    await waitFor(() => expect(updateEmail).toHaveBeenCalledWith('pw', 'new@test.dev'));
  });

  it('rejects a too-short new password before calling the server', () => {
    render(<AccountProfileTab />);
    type(screen.getByPlaceholderText('Current password'), 'old');
    type(screen.getByPlaceholderText('New password'), 'short');
    type(screen.getByPlaceholderText('Confirm new password'), 'short');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation', () => {
    render(<AccountProfileTab />);
    type(screen.getByPlaceholderText('Current password'), 'old');
    type(screen.getByPlaceholderText('New password'), 'longenough1');
    type(screen.getByPlaceholderText('Confirm new password'), 'longenough2');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes the password when the inputs are valid', async () => {
    render(<AccountProfileTab />);
    type(screen.getByPlaceholderText('Current password'), 'oldpassword');
    type(screen.getByPlaceholderText('New password'), 'brandnewpassword');
    type(screen.getByPlaceholderText('Confirm new password'), 'brandnewpassword');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('oldpassword', 'brandnewpassword'));
  });

  it('shows the other-device count and signs them out', async () => {
    render(<AccountProfileTab />);
    await screen.findByText(/2 other devices/);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out other devices' }));
    await waitFor(() => expect(revokeOtherSessions).toHaveBeenCalled());
  });

  it('deletes the account after password confirmation and signals disconnect', async () => {
    const onDisconnected = vi.fn();
    render(<AccountProfileTab onDisconnected={onDisconnected} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    const dialog = await screen.findByRole('alertdialog');
    type(within(dialog).getByPlaceholderText('Current password'), 'mypassword');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('mypassword'));
    expect(onDisconnected).toHaveBeenCalled();
  });
});
