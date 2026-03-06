import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '../../lib/utils';

/** Empty TipTap document (JSON). Used as default content when no content is set. */
export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Returns true if the TipTap JSON document is considered empty (single empty paragraph). */
export function isDocEmpty(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return true;
  const d = doc as { type?: string; content?: unknown[] };
  if (d.type !== 'doc') return true;
  const content = d.content;
  if (!Array.isArray(content) || content.length === 0) return true;
  if (content.length === 1) {
    const first = content[0] as { type?: string; content?: unknown[] };
    if (first.type === 'paragraph' && (!first.content || first.content.length === 0)) return true;
  }
  return false;
}

interface RichTextEditorProps {
  /** TipTap JSON document object. Pass null/undefined for empty doc. */
  content: unknown;
  /** Called with updated TipTap JSON when the editor loses focus. */
  onBlurSave?: (json: unknown) => void;
  /** Whether the editor is editable. Defaults to true. */
  editable?: boolean;
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  className?: string;
}

/**
 * A TipTap-based rich text editor using StarterKit.
 * Persists changes via `onBlurSave` on blur.
 */
export function RichTextEditor({
  content,
  onBlurSave,
  editable = true,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: (content as object | null | undefined) ?? EMPTY_DOC,
    editable,
    onBlur: ({ editor: e }) => {
      if (editable && onBlurSave) {
        onBlurSave(e.getJSON());
      }
    },
  });

  // Sync content from outside (e.g. after refetch)
  useEffect(() => {
    if (!editor) return;
    const incoming = (content as object | null | undefined) ?? EMPTY_DOC;
    const current = editor.getJSON();
    // Avoid resetting cursor position when content hasn't changed
    if (JSON.stringify(incoming) !== JSON.stringify(current)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [content, editor]);

  // Sync editable flag
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  return (
    <div
      className={cn(
        'tiptap-wrapper rounded-md border bg-background text-sm focus-within:ring-2 focus-within:ring-primary',
        !editable && 'bg-muted/30 cursor-default',
        className,
      )}
    >
      {editor && isDocEmpty(editor.getJSON()) && placeholder && !editor.isFocused && (
        <p
          aria-hidden
          className="pointer-events-none absolute px-3 py-2 text-sm text-muted-foreground select-none"
        >
          {placeholder}
        </p>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none px-3 py-2 focus:outline-none',
          '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[2.5rem]',
        )}
      />
    </div>
  );
}
