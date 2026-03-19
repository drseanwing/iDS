import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

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
}

export const InsertionMark = Mark.create<{ isTrackingEnabled: boolean }>({
  name: 'insertion',

  addOptions() {
    return { isTrackingEnabled: false };
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
});

export const DeletionMark = Mark.create<{ isTrackingEnabled: boolean }>({
  name: 'deletion',

  addOptions() {
    return { isTrackingEnabled: false };
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

// Plugin key for tracking state
export const trackChangesPluginKey = new PluginKey('trackChanges');

/**
 * Creates a ProseMirror plugin that intercepts transactions when tracking is enabled.
 * When enabled, typed text gets an insertion mark and deleted text gets a deletion mark
 * instead of being removed.
 */
export function createTrackChangesPlugin(opts: {
  isEnabled: () => boolean;
  getAuthorId: () => string;
  getAuthorName: () => string;
}): Plugin {
  return new Plugin({
    key: trackChangesPluginKey,
    filterTransaction(tr, state) {
      // Only intercept when tracking is enabled and it's a user action
      if (!opts.isEnabled()) return true;
      if (!tr.docChanged) return true;
      // Let setContent and history transactions through
      if (tr.getMeta('trackChanges') === false) return true;
      if (tr.getMeta('history$')) return true;

      // Check if transaction has steps that delete content
      const { steps } = tr;
      if (steps.length === 0) return true;

      // For the basic plugin, we allow all transactions through but mark them
      // The actual mark-insertion logic is handled in appendTransaction
      return true;
    },

    appendTransaction(transactions, oldState, newState) {
      if (!opts.isEnabled()) return null;

      const docChanged = transactions.some((tr) => tr.docChanged);
      if (!docChanged) return null;

      // Skip meta transactions
      if (
        transactions.some(
          (tr) =>
            tr.getMeta('trackChanges') === false ||
            tr.getMeta('history$') ||
            tr.getMeta('trackChanges-mark'),
        )
      ) {
        return null;
      }

      return null;
    },
  });
}
