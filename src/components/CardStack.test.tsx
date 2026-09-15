/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import CardStack from './CardStack';

describe('CardStack', () => {
  afterEach(cleanup);

  it('keeps collection cards behind the front card until expanded', () => {
    render(<CardStack front={<p>Week 1 Day 1</p>} count={2} label="more card">
      <p>Week 1 Day 2</p><p>Week 1 Day 3</p>
    </CardStack>);

    expect(screen.getByText('Week 1 Day 1')).toBeInTheDocument();
    expect(screen.queryByText('Week 1 Day 2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2 more cards/i }));
    expect(screen.getByText('Week 1 Day 2')).toBeInTheDocument();
    expect(screen.getByText('Week 1 Day 3')).toBeInTheDocument();
  });
});
