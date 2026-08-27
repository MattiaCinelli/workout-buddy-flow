/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

vi.mock('@/lib/diagnosticLog', () => ({ logDiagnostic: vi.fn() }));

let shouldCrash = true;
const MaybeBoom = () => {
  if (shouldCrash) throw new Error('kaboom');
  return <p>recovered</p>;
};

beforeEach(() => { shouldCrash = true; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    shouldCrash = false;
    render(<ErrorBoundary><p>hello</p></ErrorBoundary>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows the recoverable fallback with the error message when a child throws', () => {
    render(<ErrorBoundary><MaybeBoom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeInTheDocument();
  });

  it('"Try again" clears the error and re-renders the now-healthy children', () => {
    render(<ErrorBoundary><MaybeBoom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();

    shouldCrash = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('recovered')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument();
  });
});
