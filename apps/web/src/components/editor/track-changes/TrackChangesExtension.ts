import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Mark as PMMark, Node as PMNode } from '@tiptap/pm/model';

export interface TrackChangesAttributes {
  authorId: string;
  authorName: string;
  timestamp: number;
  changeId: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertion: {
      setInsertion: (attrs: TrackChangesAttributes) => ReturnType;
      unsetInsertion: () => ReturnType;
    };
    deletion: {
      setDeletion: (attrs: TrackChangesAttributes) => ReturnType;
      unsetDeletion: () => ReturnType;
    };
  }

  interface Storage {
    insertion: TrackChangesStorage;
    deletion: TrackChangesStorage;
  }
}

export interface TrackChangesStorage {
  isEnabled: boolean;
  authorId: string;
  authorName: string;
}

export const trackChangesPluginKey = new PluginKey('trackChanges');

const META_KEY = 'trackChanges';
/** Set on transactions produced by appendTransaction or accept/reject ops so we don't recurse. */
const META_INTERNAL = 'trackChanges-internal';

function generateChangeId(): string {
  // Short, sortable, collision-safe enough for editor sessions.
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function newAttrs(storage: TrackChangesStorage): TrackChangesAttributes {
  return {
    authorId: storage.authorId || 'anonymous',
    authorName: storage.authorName || 'Anonymous',
    timestamp: Date.now(),
    changeId: generateChangeId(),
  };
}

export const InsertionMark = Mark.create<{ isTrackingEnabled: boolean }, TrackChangesStorage>({
  name: 'insertion',

  addOptions() {
    return { isTrackingEnabled: false };
  },

  addStorage() {
    return {
      isEnabled: false,
      authorId: '',
      authorName: '',
    };
  },

  addAttributes() {
    return {
      authorId: { default: '' },
      authorName: { default: '' },
      timestamp: { default: 0 },
      changeId: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-track-insertion]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-track-insertion': '',
        style: 'background-color: #bbf7d0; border-bottom: 2px solid #16a34a;',
        title: `Inserted by ${HTMLAttributes.authorName as string}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setInsertion:
        (attrs: TrackChangesAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      unsetInsertion:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addProseMirrorPlugins() {
    const insertionStorage = this.storage;
    return [createTrackChangesPlugin(() => insertionStorage)];
  },
});

export const DeletionMark = Mark.create<{ isTrackingEnabled: boolean }, TrackChangesStorage>({
  name: 'deletion',

  addOptions() {
    return { isTrackingEnabled: false };
  },

  addStorage() {
    return {
      isEnabled: false,
      authorId: '',
      authorName: '',
    };
  },

  addAttributes() {
    return {
      authorId: { default: '' },
      authorName: { default: '' },
      timestamp: { default: 0 },
      changeId: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-track-deletion]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-track-deletion': '',
        style:
          'background-color: #fecaca; text-decoration: line-through; color: #dc2626;',
        title: `Deleted by ${HTMLAttributes.authorName as string}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDeletion:
        (attrs: TrackChangesAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      unsetDeletion:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

/**
 * Creates the ProseMirror plugin that intercepts ReplaceStep transactions.
 * When tracking is enabled:
 *   - text inserted by the user receives an `insertion` mark
 *   - text removed by the user is restored and given a `deletion` mark, so
 *     the original content is preserved until the change is accepted
 *
 * The plugin reads tracking state lazily from the InsertionMark storage so
 * callers can toggle it at runtime via `editor.storage.insertion.isEnabled`.
 */
export function createTrackChangesPlugin(
  getStorage: () => TrackChangesStorage,
): Plugin {
  return new Plugin({
    key: trackChangesPluginKey,

    appendTransaction(transactions, oldState, newState) {
      const storage = getStorage();
      if (!storage.isEnabled) return null;

      const docChanged = transactions.some((tr) => tr.docChanged);
      if (!docChanged) return null;

      // Skip our own follow-up transactions and ops that explicitly opt out.
      if (
        transactions.some(
          (tr) =>
            tr.getMeta(META_INTERNAL) === true ||
            tr.getMeta(META_KEY) === false ||
            tr.getMeta('history$'),
        )
      ) {
        return null;
      }

      const insertionMarkType = newState.schema.marks['insertion'];
      const deletionMarkType = newState.schema.marks['deletion'];
      if (!insertionMarkType || !deletionMarkType) return null;

      const tr = newState.tr;
      let modified = false;

      for (const transaction of transactions) {
        if (!transaction.docChanged) continue;

        transaction.steps.forEach((step, index) => {
          if (!(step instanceof ReplaceStep)) return;

          const stepBefore = transaction.docs[index];
          const stepMap = step.getMap();

          // Original range removed by this step (in the pre-step doc coords)
          const removedFrom = step.from;
          const removedTo = step.to;
          const removed: Slice | null =
            removedTo > removedFrom
              ? stepBefore.slice(removedFrom, removedTo)
              : null;

          // Map removed-range start through this and subsequent steps so we
          // know where to operate in the post-transaction doc.
          let mappedFrom = stepMap.map(removedFrom, -1);
          let mappedInsertEnd = mappedFrom + step.slice.size;
          for (let j = index + 1; j < transaction.steps.length; j++) {
            const laterMap = transaction.steps[j].getMap();
            mappedFrom = laterMap.map(mappedFrom, -1);
            mappedInsertEnd = laterMap.map(mappedInsertEnd, 1);
          }

          // ── 1. Mark newly inserted content with the insertion mark ──
          if (step.slice.size > 0 && mappedInsertEnd > mappedFrom) {
            const attrs = newAttrs(storage);
            tr.addMark(
              mappedFrom,
              mappedInsertEnd,
              insertionMarkType.create(attrs),
            );
            modified = true;
          }

          // ── 2. Restore removed content with the deletion mark ──
          if (removed && removed.size > 0) {
            // If every removed text node was itself an insertion mark, the
            // user is undoing their own pending insertion — just drop it.
            const allInsertion = sliceIsAllInsertion(removed);
            if (!allInsertion) {
              const attrs = newAttrs(storage);
              // Build a slice where each text node carries the deletion mark.
              const markedSlice = addMarkToSlice(
                removed,
                deletionMarkType.create(attrs),
              );
              tr.replace(mappedFrom, mappedFrom, markedSlice);
              // After re-inserting, advance the insertion end pointer so
              // subsequent steps in this transaction stay aligned.
              modified = true;
            }
          }
        });
      }

      if (!modified) return null;
      tr.setMeta(META_INTERNAL, true);
      return tr;
    },
  });
}

/**
 * Returns true when every text node in the slice already carries an
 * `insertion` mark. Used to detect the case where the user backspaces over
 * text they themselves just typed in tracking mode — in that case we should
 * really delete it, not turn the insertion into a deletion.
 */
function sliceIsAllInsertion(slice: Slice): boolean {
  let textCount = 0;
  let insertionCount = 0;
  slice.content.descendants((node) => {
    if (node.isText) {
      textCount += 1;
      if (node.marks.some((m) => m.type.name === 'insertion')) {
        insertionCount += 1;
      }
    }
    return true;
  });
  return textCount > 0 && textCount === insertionCount;
}

/**
 * Returns a new Slice in which every text node has the given mark added.
 */
function addMarkToSlice(slice: Slice, mark: PMMark): Slice {
  const mapped = mapFragment(slice.content, mark);
  // Slice constructor preserves openStart/openEnd so partial selections
  // (e.g. deleting across paragraph boundaries) re-insert correctly.
  return new Slice(mapped, slice.openStart, slice.openEnd);
}

function mapFragment(fragment: Fragment, mark: PMMark): Fragment {
  const children: PMNode[] = [];
  fragment.forEach((child) => {
    if (child.isText) {
      children.push(child.mark(mark.addToSet(child.marks)));
    } else if (child.content.size > 0) {
      children.push(child.copy(mapFragment(child.content, mark)));
    } else {
      children.push(child);
    }
  });
  return Fragment.from(children);
}
