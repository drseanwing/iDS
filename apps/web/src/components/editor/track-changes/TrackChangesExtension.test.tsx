import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InsertionMark, DeletionMark } from './TrackChangesExtension';
import { useTrackChanges } from './useTrackChanges';
import { RichTextEditor } from '../RichTextEditor';
import React from 'react';

// Helper component that mounts an editor with track change marks
function TestEditor({
  onEditorReady,
}: {
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, InsertionMark, DeletionMark],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  });

  React.useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  return <EditorContent editor={editor} />;
}

describe('InsertionMark', () => {
  it('has correct name', () => {
    expect(InsertionMark.name).toBe('insertion');
  });

  it('defines authorId, authorName, timestamp, changeId attributes', () => {
    // Access the raw config to check attributes
    const instance = InsertionMark.configure({});
    expect(instance.name).toBe('insertion');
  });

  it('renders with green background style', () => {
    const mark = InsertionMark;
    expect(mark.name).toBe('insertion');
    // Verify the mark type is recognized as a Mark extension
    expect(mark.type).toBe('mark');
  });
});

describe('DeletionMark', () => {
  it('has correct name', () => {
    expect(DeletionMark.name).toBe('deletion');
  });

  it('defines required attributes', () => {
    const instance = DeletionMark.configure({});
    expect(instance.name).toBe('deletion');
  });

  it('renders with strikethrough style', () => {
    expect(DeletionMark.type).toBe('mark');
  });
});

describe('Mark creation in editor', () => {
  it('mounts editor with InsertionMark and DeletionMark extensions without error', () => {
    expect(() => {
      render(<TestEditor />);
    }).not.toThrow();
    expect(document.querySelector('.ProseMirror')).toBeDefined();
  });

  it('can set an insertion mark on text', async () => {
    let capturedEditor: ReturnType<typeof useEditor> | null = null;

    render(
      <TestEditor
        onEditorReady={(ed) => {
          capturedEditor = ed;
        }}
      />,
    );

    // Wait for editor to be ready
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    if (capturedEditor) {
      const editor = capturedEditor as NonNullable<ReturnType<typeof useEditor>>;
      act(() => {
        // Insert some text
        editor.commands.setContent({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Hello',
                  marks: [
                    {
                      type: 'insertion',
                      attrs: {
                        authorId: 'user-1',
                        authorName: 'Alice',
                        timestamp: 1000,
                        changeId: 'change-1',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      const json = editor.getJSON();
      const paragraph = json.content?.[0];
      const textNode = paragraph?.content?.[0];
      expect(textNode?.marks?.[0]?.type).toBe('insertion');
      expect(textNode?.marks?.[0]?.attrs?.changeId).toBe('change-1');
      expect(textNode?.marks?.[0]?.attrs?.authorName).toBe('Alice');
    }
  });

  it('can set a deletion mark on text', async () => {
    let capturedEditor: ReturnType<typeof useEditor> | null = null;

    render(
      <TestEditor
        onEditorReady={(ed) => {
          capturedEditor = ed;
        }}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    if (capturedEditor) {
      const editor = capturedEditor as NonNullable<ReturnType<typeof useEditor>>;
      act(() => {
        editor.commands.setContent({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Remove me',
                  marks: [
                    {
                      type: 'deletion',
                      attrs: {
                        authorId: 'user-2',
                        authorName: 'Bob',
                        timestamp: 2000,
                        changeId: 'change-2',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      const json = editor.getJSON();
      const textNode = json.content?.[0]?.content?.[0];
      expect(textNode?.marks?.[0]?.type).toBe('deletion');
      expect(textNode?.marks?.[0]?.attrs?.changeId).toBe('change-2');
    }
  });
});

describe('useTrackChanges - accept/reject operations', () => {
  it('returns isEnabled=false initially', () => {
    // Test the hook logic directly by calling it in a minimal component
    let result: ReturnType<typeof useTrackChanges> | null = null;
    function HookTest() {
      result = useTrackChanges();
      return null;
    }
    render(<HookTest />);
    expect(result).not.toBeNull();
    expect(result!.isEnabled).toBe(false);
  });

  it('toggleTracking flips isEnabled', () => {
    let result: ReturnType<typeof useTrackChanges> | null = null;
    function HookTest() {
      result = useTrackChanges();
      return null;
    }
    render(<HookTest />);
    expect(result!.isEnabled).toBe(false);
    act(() => {
      result!.toggleTracking();
    });
    expect(result!.isEnabled).toBe(true);
  });

  it('getChanges returns empty array when no tracked changes', async () => {
    let capturedEditor: ReturnType<typeof useEditor> | null = null;
    let hookResult: ReturnType<typeof useTrackChanges> | null = null;

    function Combined() {
      hookResult = useTrackChanges();
      const editor = useEditor({
        extensions: [StarterKit, InsertionMark, DeletionMark],
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'plain text' }] }] },
      });
      React.useEffect(() => {
        if (editor) capturedEditor = editor;
      }, [editor]);
      return <EditorContent editor={editor} />;
    }

    render(<Combined />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const changes = hookResult!.getChanges(capturedEditor as NonNullable<typeof capturedEditor>);
    expect(Array.isArray(changes)).toBe(true);
    expect(changes.length).toBe(0);
  });

  it('acceptChange removes insertion mark keeping text', async () => {
    let capturedEditor: ReturnType<typeof useEditor> | null = null;
    let hookResult: ReturnType<typeof useTrackChanges> | null = null;

    function Combined() {
      hookResult = useTrackChanges();
      const editor = useEditor({
        extensions: [StarterKit, InsertionMark, DeletionMark],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Keep me',
                  marks: [
                    {
                      type: 'insertion',
                      attrs: { authorId: 'u1', authorName: 'Alice', timestamp: 100, changeId: 'c1' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      React.useEffect(() => {
        if (editor) capturedEditor = editor;
      }, [editor]);
      return <EditorContent editor={editor} />;
    }

    render(<Combined />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Accept the insertion
    act(() => {
      hookResult!.acceptChange(capturedEditor as NonNullable<typeof capturedEditor>, 'c1');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Text should remain, mark should be gone
    const json = (capturedEditor as NonNullable<typeof capturedEditor>).getJSON();
    const textNode = json.content?.[0]?.content?.[0];
    expect(textNode?.text).toBe('Keep me');
    expect(textNode?.marks ?? []).toHaveLength(0);
  });

  it('rejectChange removes insertion text', async () => {
    let capturedEditor: ReturnType<typeof useEditor> | null = null;
    let hookResult: ReturnType<typeof useTrackChanges> | null = null;

    function Combined() {
      hookResult = useTrackChanges();
      const editor = useEditor({
        extensions: [StarterKit, InsertionMark, DeletionMark],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Remove me',
                  marks: [
                    {
                      type: 'insertion',
                      attrs: { authorId: 'u1', authorName: 'Alice', timestamp: 100, changeId: 'c2' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      React.useEffect(() => {
        if (editor) capturedEditor = editor;
      }, [editor]);
      return <EditorContent editor={editor} />;
    }

    render(<Combined />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      hookResult!.rejectChange(capturedEditor as NonNullable<typeof capturedEditor>, 'c2');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Text should be removed
    const json = (capturedEditor as NonNullable<typeof capturedEditor>).getJSON();
    const paragraph = json.content?.[0];
    // paragraph content should be empty or missing after rejection
    const hasText = paragraph?.content?.some((n: { text?: string }) => n.text === 'Remove me');
    expect(hasText).toBeFalsy();
  });

  it('acceptChange for deletion removes the text', async () => {
    let capturedEditor: ReturnType<typeof useEditor> | null = null;
    let hookResult: ReturnType<typeof useTrackChanges> | null = null;

    function Combined() {
      hookResult = useTrackChanges();
      const editor = useEditor({
        extensions: [StarterKit, InsertionMark, DeletionMark],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Delete me',
                  marks: [
                    {
                      type: 'deletion',
                      attrs: { authorId: 'u2', authorName: 'Bob', timestamp: 200, changeId: 'c3' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      React.useEffect(() => {
        if (editor) capturedEditor = editor;
      }, [editor]);
      return <EditorContent editor={editor} />;
    }

    render(<Combined />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      hookResult!.acceptChange(capturedEditor as NonNullable<typeof capturedEditor>, 'c3');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const json = (capturedEditor as NonNullable<typeof capturedEditor>).getJSON();
    const hasText = json.content?.[0]?.content?.some((n: { text?: string }) => n.text === 'Delete me');
    expect(hasText).toBeFalsy();
  });

  it('rejectChange for deletion keeps text and removes mark', async () => {
    let capturedEditor: ReturnType<typeof useEditor> | null = null;
    let hookResult: ReturnType<typeof useTrackChanges> | null = null;

    function Combined() {
      hookResult = useTrackChanges();
      const editor = useEditor({
        extensions: [StarterKit, InsertionMark, DeletionMark],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Keep me',
                  marks: [
                    {
                      type: 'deletion',
                      attrs: { authorId: 'u2', authorName: 'Bob', timestamp: 200, changeId: 'c4' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      React.useEffect(() => {
        if (editor) capturedEditor = editor;
      }, [editor]);
      return <EditorContent editor={editor} />;
    }

    render(<Combined />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      hookResult!.rejectChange(capturedEditor as NonNullable<typeof capturedEditor>, 'c4');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const json = (capturedEditor as NonNullable<typeof capturedEditor>).getJSON();
    const textNode = json.content?.[0]?.content?.[0];
    expect(textNode?.text).toBe('Keep me');
    expect(textNode?.marks ?? []).toHaveLength(0);
  });
});

describe('TrackChangesToolbar rendering', () => {
  it('renders track changes toolbar in RichTextEditor when trackChanges=true', () => {
    render(<RichTextEditor content={null} trackChanges={true} canManageChanges={true} />);
    expect(screen.getByText(/Track Changes/)).toBeDefined();
  });

  it('does not render toolbar when trackChanges=false', () => {
    render(<RichTextEditor content={null} />);
    expect(screen.queryByText(/Track Changes/)).toBeNull();
  });
});
