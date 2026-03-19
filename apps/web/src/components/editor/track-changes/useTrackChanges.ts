import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/core';

export interface TrackedChange {
  changeId: string;
  type: 'insertion' | 'deletion';
  authorId: string;
  authorName: string;
  timestamp: number;
  text: string;
  from: number;
  to: number;
}

export interface UseTrackChangesReturn {
  isEnabled: boolean;
  toggleTracking: () => void;
  getChanges: (editor: Editor | null) => TrackedChange[];
  acceptChange: (editor: Editor | null, changeId: string) => void;
  rejectChange: (editor: Editor | null, changeId: string) => void;
  acceptAll: (editor: Editor | null) => void;
  rejectAll: (editor: Editor | null) => void;
}

/**
 * Scans the document for all tracked change marks (insertion/deletion) and
 * returns a list of TrackedChange objects with their positions.
 */
function collectChanges(editor: Editor): TrackedChange[] {
  const changes: TrackedChange[] = [];
  const seen = new Set<string>();

  editor.state.doc.descendants((node, pos) => {
    for (const mark of node.marks) {
      if (mark.type.name !== 'insertion' && mark.type.name !== 'deletion') {
        continue;
      }
      const { changeId, authorId, authorName, timestamp } =
        mark.attrs as {
          changeId: string;
          authorId: string;
          authorName: string;
          timestamp: number;
        };
      if (!changeId || seen.has(changeId)) continue;
      seen.add(changeId);
      changes.push({
        changeId,
        type: mark.type.name as 'insertion' | 'deletion',
        authorId,
        authorName,
        timestamp,
        text: node.isText ? (node.text ?? '') : '',
        from: pos,
        to: pos + node.nodeSize,
      });
    }
  });

  return changes;
}

/**
 * Finds all ranges in the document that have a given mark with the given changeId.
 */
function findMarkRanges(
  editor: Editor,
  markName: 'insertion' | 'deletion',
  changeId: string,
): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    const hasMark = node.marks.some(
      (m) =>
        m.type.name === markName &&
        (m.attrs as { changeId: string }).changeId === changeId,
    );
    if (hasMark) {
      const nodeEnd = pos + node.nodeSize;
      if (rangeStart === null) {
        rangeStart = pos;
        rangeEnd = nodeEnd;
      } else if (rangeEnd === pos) {
        rangeEnd = nodeEnd;
      } else {
        ranges.push({ from: rangeStart, to: rangeEnd });
        rangeStart = pos;
        rangeEnd = nodeEnd;
      }
    }
  });

  if (rangeStart !== null && rangeEnd !== null) {
    ranges.push({ from: rangeStart, to: rangeEnd });
  }

  return ranges;
}

export function useTrackChanges(): UseTrackChangesReturn {
  const [isEnabled, setIsEnabled] = useState(false);

  const toggleTracking = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const getChanges = useCallback((editor: Editor | null): TrackedChange[] => {
    if (!editor) return [];
    return collectChanges(editor);
  }, []);

  /**
   * Accept an insertion: remove the mark, keep the text.
   * Accept a deletion: remove the marked text entirely.
   */
  const acceptChange = useCallback(
    (editor: Editor | null, changeId: string) => {
      if (!editor) return;

      // Find which type this changeId belongs to
      const changes = collectChanges(editor);
      const change = changes.find((c) => c.changeId === changeId);
      if (!change) return;

      if (change.type === 'insertion') {
        // Accept insertion: unmark the text (keep it, remove insertion mark)
        const ranges = findMarkRanges(editor, 'insertion', changeId);
        const { tr } = editor.state;
        const insertionMarkType = editor.state.schema.marks['insertion'];
        if (!insertionMarkType) return;
        for (const range of ranges) {
          tr.removeMark(range.from, range.to, insertionMarkType);
        }
        tr.setMeta('trackChanges', false);
        editor.view.dispatch(tr);
      } else {
        // Accept deletion: remove the text
        const ranges = findMarkRanges(editor, 'deletion', changeId);
        const { tr } = editor.state;
        // Delete in reverse order to preserve positions
        const sorted = [...ranges].sort((a, b) => b.from - a.from);
        for (const range of sorted) {
          tr.delete(range.from, range.to);
        }
        tr.setMeta('trackChanges', false);
        editor.view.dispatch(tr);
      }
    },
    [],
  );

  /**
   * Reject an insertion: remove the marked text.
   * Reject a deletion: remove the mark, keep the text.
   */
  const rejectChange = useCallback(
    (editor: Editor | null, changeId: string) => {
      if (!editor) return;

      const changes = collectChanges(editor);
      const change = changes.find((c) => c.changeId === changeId);
      if (!change) return;

      if (change.type === 'insertion') {
        // Reject insertion: remove the text
        const ranges = findMarkRanges(editor, 'insertion', changeId);
        const { tr } = editor.state;
        const sorted = [...ranges].sort((a, b) => b.from - a.from);
        for (const range of sorted) {
          tr.delete(range.from, range.to);
        }
        tr.setMeta('trackChanges', false);
        editor.view.dispatch(tr);
      } else {
        // Reject deletion: unmark (keep text, remove deletion mark)
        const ranges = findMarkRanges(editor, 'deletion', changeId);
        const { tr } = editor.state;
        const deletionMarkType = editor.state.schema.marks['deletion'];
        if (!deletionMarkType) return;
        for (const range of ranges) {
          tr.removeMark(range.from, range.to, deletionMarkType);
        }
        tr.setMeta('trackChanges', false);
        editor.view.dispatch(tr);
      }
    },
    [],
  );

  const acceptAll = useCallback((editor: Editor | null) => {
    if (!editor) return;
    const changes = collectChanges(editor);
    // Process deletions first (they remove text), then insertions
    // to avoid position drift issues — do them in a single transaction
    const { tr } = editor.state;
    const insertionMarkType = editor.state.schema.marks['insertion'];
    const deletionMarkType = editor.state.schema.marks['deletion'];

    // Collect all ranges to delete (accepted deletions) sorted descending
    const toDelete: Array<{ from: number; to: number }> = [];
    for (const change of changes) {
      if (change.type === 'deletion') {
        const ranges = findMarkRanges(editor, 'deletion', change.changeId);
        toDelete.push(...ranges);
      }
    }
    const sortedDeletes = toDelete.sort((a, b) => b.from - a.from);

    // Remove insertion marks
    if (insertionMarkType) {
      for (const change of changes) {
        if (change.type === 'insertion') {
          const ranges = findMarkRanges(editor, 'insertion', change.changeId);
          for (const range of ranges) {
            tr.removeMark(range.from, range.to, insertionMarkType);
          }
        }
      }
    }

    // Dispatch insertion unmark first
    tr.setMeta('trackChanges', false);
    editor.view.dispatch(tr);

    // Then delete deletion-marked content in a separate transaction
    if (sortedDeletes.length > 0 && deletionMarkType) {
      const tr2 = editor.state.tr;
      const freshSorted = sortedDeletes.sort((a, b) => b.from - a.from);
      for (const range of freshSorted) {
        tr2.delete(range.from, range.to);
      }
      tr2.setMeta('trackChanges', false);
      editor.view.dispatch(tr2);
    }
  }, []);

  const rejectAll = useCallback((editor: Editor | null) => {
    if (!editor) return;
    const changes = collectChanges(editor);
    const insertionMarkType = editor.state.schema.marks['insertion'];
    const deletionMarkType = editor.state.schema.marks['deletion'];

    // Collect insertions to delete (rejected insertions)
    const toDelete: Array<{ from: number; to: number }> = [];
    for (const change of changes) {
      if (change.type === 'insertion') {
        const ranges = findMarkRanges(editor, 'insertion', change.changeId);
        toDelete.push(...ranges);
      }
    }

    // Remove deletion marks first
    const tr = editor.state.tr;
    if (deletionMarkType) {
      for (const change of changes) {
        if (change.type === 'deletion') {
          const ranges = findMarkRanges(editor, 'deletion', change.changeId);
          for (const range of ranges) {
            tr.removeMark(range.from, range.to, deletionMarkType);
          }
        }
      }
    }
    tr.setMeta('trackChanges', false);
    editor.view.dispatch(tr);

    // Then delete insertion-marked content
    if (toDelete.length > 0 && insertionMarkType) {
      const tr2 = editor.state.tr;
      const sortedDeletes = toDelete.sort((a, b) => b.from - a.from);
      for (const range of sortedDeletes) {
        tr2.delete(range.from, range.to);
      }
      tr2.setMeta('trackChanges', false);
      editor.view.dispatch(tr2);
    }
  }, []);

  return {
    isEnabled,
    toggleTracking,
    getChanges,
    acceptChange,
    rejectChange,
    acceptAll,
    rejectAll,
  };
}
