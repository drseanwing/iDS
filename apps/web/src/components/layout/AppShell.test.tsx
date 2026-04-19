import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from './AppShell';
import { I18nProvider } from '../../lib/i18n';
import { useAuth } from '../../hooks/useAuth';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

beforeEach(() => {
  // Reset auth state to a known logged-in user
  useAuth.setState({
    user: { sub: 'u-1', email: 'alice@example.com', name: 'Alice', roles: [] },
    token: 'fake-token',
  });
});

describe('AppShell', () => {
  it('renders OpenGRADE brand', () => {
    renderWithI18n(
      <AppShell activePath="dashboard" onNavigate={() => {}}>
        <div>child content</div>
      </AppShell>,
    );
    expect(screen.getByLabelText('Application brand')).toBeDefined();
  });

  it('renders navigation items', () => {
    renderWithI18n(
      <AppShell activePath="dashboard" onNavigate={() => {}}>
        <div>child content</div>
      </AppShell>,
    );
    // Default i18n returns the key when no matching translation
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(3);
  });

  it('renders children in the main area', () => {
    renderWithI18n(
      <AppShell activePath="dashboard" onNavigate={() => {}}>
        <div>my page content</div>
      </AppShell>,
    );
    expect(screen.getByText('my page content')).toBeDefined();
  });

  it('shows the current user name', () => {
    renderWithI18n(
      <AppShell activePath="dashboard" onNavigate={() => {}}>
        <div>x</div>
      </AppShell>,
    );
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('falls back to "User" when no user is authenticated', () => {
    useAuth.setState({ user: null, token: null });
    renderWithI18n(
      <AppShell activePath="dashboard" onNavigate={() => {}}>
        <div>x</div>
      </AppShell>,
    );
    expect(screen.getByText('User')).toBeDefined();
  });

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn();
    renderWithI18n(
      <AppShell activePath="dashboard" onNavigate={onNavigate}>
        <div>x</div>
      </AppShell>,
    );
    // The first three buttons are nav items
    const navButtons = screen.getAllByRole('button');
    fireEvent.click(navButtons[1]);
    expect(onNavigate).toHaveBeenCalled();
  });

  it('shows the active path in the top bar', () => {
    renderWithI18n(
      <AppShell activePath="references" onNavigate={() => {}}>
        <div>x</div>
      </AppShell>,
    );
    expect(screen.getByText('references')).toBeDefined();
  });
});
