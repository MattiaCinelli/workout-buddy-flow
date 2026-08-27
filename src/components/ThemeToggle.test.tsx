/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';

const toggleTheme = vi.fn();
const themeState = { resolvedTheme: 'light' as 'light' | 'dark' };
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ ...themeState, toggleTheme }) }));

import { ThemeToggle } from './ThemeToggle';

afterEach(() => { cleanup(); vi.clearAllMocks(); themeState.resolvedTheme = 'light'; });

describe('ThemeToggle', () => {
  it('labels itself with the theme it will switch to and calls toggleTheme on click', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    fireEvent.click(button);
    expect(toggleTheme).toHaveBeenCalledOnce();
  });

  it('flips its label when the resolved theme is dark', () => {
    themeState.resolvedTheme = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});
