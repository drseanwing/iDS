// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MagicAppImportDialog } from './MagicAppImportDialog';

// ── Mock api-client ──────────────────────────────────────────────────────

const postMock = vi.fn();
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: (...args: unknown[]) => postMock(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function makeFile(name = 'export.json') {
  return new File(['{"data": true}'], name, { type: 'application/json' });
}

const defaultProps = {
  guidelineId: 'gl-1',
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

// ── Tests ────────────────────────────────────────────────────────────────

describe('MagicAppImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('is hidden when isOpen is false', () => {
    render(<MagicAppImportDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Import MagicApp')).toBeNull();
  });

  it('renders file input when dialog is open', () => {
    render(<MagicAppImportDialog {...defaultProps} />);
    expect(screen.getByText('Import MagicApp')).toBeDefined();
    expect(screen.getByTestId('file-input')).toBeDefined();
  });

  it('shows the selected filename after a file is chosen', async () => {
    render(<MagicAppImportDialog {...defaultProps} />);

    const input = screen.getByTestId('file-input');
    const file = makeFile('my-export.json');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('my-export.json')).toBeDefined();
    });
  });

  it('calls onClose when Cancel is clicked in preview step', async () => {
    const onClose = vi.fn();
    render(<MagicAppImportDialog {...defaultProps} onClose={onClose} />);

    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows success summary after a successful import', async () => {
    const successResult = {
      created: { sections: 4, recommendations: 3, references: 7 },
      skipped: 2,
    };
    postMock.mockResolvedValue({ data: successResult });

    const onSuccess = vi.fn();
    render(<MagicAppImportDialog {...defaultProps} onSuccess={onSuccess} />);

    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Import' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.getByText('Import complete')).toBeDefined();
    });

    expect(screen.getByText(/4/)).toBeDefined();
    expect(screen.getByText(/3/)).toBeDefined();
    expect(screen.getByText(/7/)).toBeDefined();
    expect(onSuccess).toHaveBeenCalledWith(successResult);
  });
});
