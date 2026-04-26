import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordExport } from './useWordExport';

// ── Mock api-client ──────────────────────────────────────────────────────

const getMock = vi.fn();
vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// ── Mock browser APIs ────────────────────────────────────────────────────

const createObjectURLMock = vi.fn(() => 'blob:mock-url');
const revokeObjectURLMock = vi.fn();
const appendChildMock = vi.fn();
const removeChildMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  window.URL.createObjectURL = createObjectURLMock;
  window.URL.revokeObjectURL = revokeObjectURLMock;

  const fakeAnchor = {
    href: '',
    download: '',
    click: vi.fn(),
    remove: vi.fn(),
  } as unknown as HTMLAnchorElement;

  vi.spyOn(document, 'createElement').mockReturnValue(fakeAnchor);
  vi.spyOn(document.body, 'appendChild').mockImplementation(appendChildMock);
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('useWordExport', () => {
  it('calls the correct URL for docx export', async () => {
    const blob = new Blob(['docx-content'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    getMock.mockResolvedValue({ data: blob });

    const { result } = renderHook(() => useWordExport('gl-42'));

    await act(async () => {
      await result.current.exportDocx();
    });

    expect(getMock).toHaveBeenCalledWith(
      '/guidelines/gl-42/export/docx',
      { responseType: 'blob' },
    );
  });

  it('sets isExporting to true while the request is pending and false after', async () => {
    let resolveRequest!: (value: { data: Blob }) => void;
    getMock.mockReturnValue(
      new Promise<{ data: Blob }>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() => useWordExport('gl-42'));

    expect(result.current.isExporting).toBe(false);

    let exportPromise: Promise<void>;
    act(() => {
      exportPromise = result.current.exportDocx();
    });

    // isExporting should be true while pending
    await waitForCondition(() => result.current.isExporting === true);
    expect(result.current.isExporting).toBe(true);

    await act(async () => {
      resolveRequest({ data: new Blob([]) });
      await exportPromise;
    });

    expect(result.current.isExporting).toBe(false);
  });

  it('triggers a blob download with the correct filename', async () => {
    const blob = new Blob(['docx-content']);
    getMock.mockResolvedValue({ data: blob });

    const fakeAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(fakeAnchor);

    const { result } = renderHook(() => useWordExport('gl-42'));

    await act(async () => {
      await result.current.exportDocx();
    });

    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(fakeAnchor.href).toBe('blob:mock-url');
    expect(fakeAnchor.download).toBe('guideline-gl-42.docx');
    expect(fakeAnchor.click).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });
});

// ── Utility ──────────────────────────────────────────────────────────────

async function waitForCondition(condition: () => boolean, timeout = 1000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((r) => setTimeout(r, 10));
  }
}
