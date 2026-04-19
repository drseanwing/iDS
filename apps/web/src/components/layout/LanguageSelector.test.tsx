import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';
import { I18nProvider } from '../../lib/i18n';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

describe('LanguageSelector', () => {
  it('renders a select with an accessible label', () => {
    renderWithI18n(<LanguageSelector />);
    expect(screen.getByLabelText('Select language')).toBeDefined();
  });

  it('renders all three available locale options', () => {
    renderWithI18n(<LanguageSelector />);
    expect(screen.getByRole('option', { name: 'English' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Español' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Français' })).toBeDefined();
  });

  it('defaults to English (en)', () => {
    renderWithI18n(<LanguageSelector />);
    const select = screen.getByLabelText('Select language') as HTMLSelectElement;
    expect(select.value).toBe('en');
  });

  it('updates selected value when changed', () => {
    renderWithI18n(<LanguageSelector />);
    const select = screen.getByLabelText('Select language') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'fr' } });
    expect(select.value).toBe('fr');
  });

  it('persists locale to localStorage on change', () => {
    renderWithI18n(<LanguageSelector />);
    const select = screen.getByLabelText('Select language') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'es' } });
    expect(localStorage.getItem('opengrade-locale')).toBe('es');
  });
});
