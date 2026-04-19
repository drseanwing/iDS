import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceIndicator } from './PresenceIndicator';
import type { UserPresence } from '../../hooks/usePresence';

function makeUser(overrides: Partial<UserPresence> = {}): UserPresence {
  return {
    userId: 'u-1',
    userName: 'Alice Adams',
    sectionId: undefined,
    lastSeen: '2024-01-01T00:00:00Z',
    color: '#ff0000',
    ...overrides,
  };
}

describe('PresenceIndicator', () => {
  it('renders nothing when there are no users', () => {
    const { container } = render(<PresenceIndicator users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a wrapper with aria-label when users are present', () => {
    render(<PresenceIndicator users={[makeUser()]} />);
    expect(screen.getByLabelText('Active collaborators')).toBeDefined();
  });

  it('shows initials of each user', () => {
    render(
      <PresenceIndicator
        users={[makeUser({ userId: 'u-1', userName: 'Alice Adams' }), makeUser({ userId: 'u-2', userName: 'Bob Brown' })]}
      />,
    );
    expect(screen.getByText('AA')).toBeDefined();
    expect(screen.getByText('BB')).toBeDefined();
  });

  it('truncates initials to 2 characters for long names', () => {
    render(<PresenceIndicator users={[makeUser({ userName: 'Foo Bar Baz Qux' })]} />);
    expect(screen.getByText('FB')).toBeDefined();
  });

  it('uses the user color as background', () => {
    render(<PresenceIndicator users={[makeUser({ color: '#abcdef', userName: 'Carol Cole' })]} />);
    const avatar = screen.getByLabelText('Carol Cole');
    expect(avatar.getAttribute('style')).toContain('rgb(171, 205, 239)');
  });

  it('renders a tooltip with viewing-section line when sectionId is set', () => {
    render(<PresenceIndicator users={[makeUser({ sectionId: 'sec-1' })]} />);
    expect(screen.getByText('Viewing section')).toBeDefined();
  });
});
