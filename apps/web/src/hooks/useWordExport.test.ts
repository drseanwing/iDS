// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// ── Tests ────────────────────────────────────────────────────────────────

describe('useWordExport', () => {
  const createObjectURLMock = vi.fn(() => 'blob:mock-url');
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
  });

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
    const pendingPromise = new Promise<{ data: Blob }>((resolve) => {
      resolveRequest = resolve;
    });
    getMock.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useWordExport('gl-42'));

    expect(result.current.isExporting).toBe(false);

    // Start the export (don't await)
    let exportPromise!: Promise<void>;
    act(() => {
      exportPromise = result.current.exportDocx();
    });

    // isExporting should become true while pending
    await act(async () => {
      await Promise.resolve(); // flush microtasks
    });
    expect(result.current.isExporting).toBe(true);

    // Resolve the request
    await act(async () => {
      resolveRequest({ data: new Blob([]) });
      await exportPromise;
    });

    expect(result.current.isExporting).toBe(false);
  });

  it('triggers a blob download with the correct filename', async () => {
    const blob = new Blob(['docx-content']);
    getMock.mockResolvedValue({ data: blob });

    // Track anchor interactions
    let capturedAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> } | null = null;
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        capturedAnchor = {
          href: '',
          download: '',
          click: vi.fn(),
          remove: vi.fn(),
        };
        return capturedAnchor as unknown as HTMLElement;
      }
      return originalCreateElement(tag);
    });

    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    const { result } = renderHook(() => useWordExport('gl-42'));

    await act(async () => {
      await result.current.exportDocx();
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();

    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.href).toBe('blob:mock-url');
    expect(capturedAnchor!.download).toBe('guideline-gl-42.docx');
    expect(capturedAnchor!.click).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });
});
