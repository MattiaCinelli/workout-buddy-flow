/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';

const { state, login, logout, syncAll, resetSyncState } = vi.hoisted(() => {
  const state = {
    connected: false,
    serverUrl: null as string | null,
    email: null as string | null,
    lastSyncedAt: null as string | null,
  };
  return {
    state,
    login: vi.fn(async (url: string, email: string, _password: string) => {
      state.connected = true; state.serverUrl = url.replace(/\/+$/, ''); state.email = email;
    }),
    logout: vi.fn(async () => { state.connected = false; state.serverUrl = null; }),
    syncAll: vi.fn(async (_direction?: string) => { state.lastSyncedAt = '2026-09-01T00:00:00.000Z'; }),
    resetSyncState: vi.fn(),
  };
});

vi.mock('@/lib/syncClient', () => ({
  isConnected: () => state.connected,
  getServerUrl: () => state.serverUrl,
  getLoggedInEmail: () => state.email,
  getLastSyncedAt: () => state.lastSyncedAt,
  getSyncStatus: () => ({ lastOkAt: state.lastSyncedAt, lastError: null, lastErrorAt: null }),
  login, logout, syncAll, resetSyncState,
}));
vi.mock('@/contexts/DataContext', () => ({
  useData: () => Object.fromEntries(
    ['refreshExercises', 'refreshWorkouts', 'refreshScheduledWorkouts', 'refreshCourses',
      'refreshSessions', 'refreshMuscleGroups', 'refreshBodyMetrics'].map(k => [k, vi.fn(async () => {})]),
  ),
}));
vi.mock('./SyncConflicts', () => ({ SyncConflicts: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SyncSettingsPanel } from './SyncSettingsPanel';

beforeEach(() => {
  state.connected = false; state.serverUrl = null; state.email = null; state.lastSyncedAt = null;
  vi.clearAllMocks();
});
afterEach(() => cleanup());

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('SyncSettingsPanel — disconnected', () => {
  it('connects with the entered url/email/password and normalises the url', async () => {
    render(<SyncSettingsPanel />);
    fill('Server URL', 'https://sync.test///');
    fill('Email', 'me@test.dev');
    fill('Password', 'hunter2hunter2');
    fireEvent.click(screen.getByRole('button', { name: 'Connect server' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('https://sync.test///', 'me@test.dev', 'hunter2hunter2'));
  });

  it('warns about an unencrypted non-localhost http url', () => {
    render(<SyncSettingsPanel />);
    fill('Server URL', 'http://192.168.1.9:3000');
    expect(screen.getByText(/unencrypted/i)).toBeInTheDocument();
  });

  it('does not warn for an http localhost url', () => {
    render(<SyncSettingsPanel />);
    fill('Server URL', 'http://localhost:3000');
    expect(screen.queryByText(/unencrypted/i)).not.toBeInTheDocument();
  });
});

describe('SyncSettingsPanel — connected', () => {
  beforeEach(() => { state.connected = true; state.serverUrl = 'https://sync.test'; state.email = 'me@test.dev'; });

  it('shows the connection details and runs a manual sync', async () => {
    render(<SyncSettingsPanel />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('https://sync.test')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    await waitFor(() => expect(syncAll).toHaveBeenCalledWith('both'));
  });

  it('"Full re-sync" resets sync state before syncing', async () => {
    render(<SyncSettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Full re-sync/ }));
    await waitFor(() => expect(syncAll).toHaveBeenCalled());
    expect(resetSyncState).toHaveBeenCalled();
  });

  it('one-way "Push this device to server" asks for confirmation, then syncs with push', async () => {
    render(<SyncSettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'One-way sync' }));
    fireEvent.click(screen.getByRole('button', { name: 'Push this device to server' }));

    // confirm dialog
    const confirm = await screen.findByRole('button', { name: 'Push to server' });
    fireEvent.click(confirm);
    await waitFor(() => expect(syncAll).toHaveBeenCalledWith('push'));
  });

  it('one-way "Replace this device with server" resets then pulls', async () => {
    render(<SyncSettingsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'One-way sync' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace this device with server' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Replace this device' }));

    await waitFor(() => expect(syncAll).toHaveBeenCalledWith('pull'));
    expect(resetSyncState).toHaveBeenCalled();
  });

  it('disconnects', async () => {
    const onConnectionChange = vi.fn();
    render(<SyncSettingsPanel onConnectionChange={onConnectionChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(onConnectionChange).toHaveBeenCalledWith(false);
  });
});
