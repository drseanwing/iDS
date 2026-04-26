import { useState } from 'react';
import { Loader2, Plus, Trash2, Tag as TagIcon } from 'lucide-react';
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  type Tag,
} from '../../hooks/useTags';

interface TagsPanelProps {
  guidelineId: string;
}

const PRESET_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

function ColorSwatchPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex gap-1.5" aria-label="color swatches">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          onClick={() => onChange(color)}
          className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
            selected === color ? 'border-gray-800 scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

interface TagBadgeProps {
  tag: Tag;
  guidelineId: string;
}

function TagBadge({ tag, guidelineId }: TagBadgeProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color ?? PRESET_COLORS[0]);

  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const handleSave = () => {
    if (!editName.trim()) return;
    updateTag.mutate(
      { id: tag.id, guidelineId, name: editName.trim(), color: editColor },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleCancel = () => {
    setEditName(tag.name);
    setEditColor(tag.color ?? PRESET_COLORS[0]);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return;
    deleteTag.mutate({ id: tag.id, guidelineId });
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        <ColorSwatchPicker selected={editColor} onChange={setEditColor} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateTag.isPending || !editName.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateTag.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 group">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Edit tag"
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
        style={{ backgroundColor: tag.color ?? PRESET_COLORS[0] }}
      >
        {tag.name}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteTag.isPending}
        title="Delete tag"
        aria-label={`delete tag ${tag.name}`}
        className="rounded p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddTagForm({ guidelineId, onClose }: { guidelineId: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const createTag = useCreateTag();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createTag.mutate(
      { guidelineId, name: name.trim(), color },
      {
        onSuccess: () => {
          setName('');
          setColor(PRESET_COLORS[0]);
          onClose();
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3 shadow-sm">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tag name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tag name..."
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Color</label>
        <ColorSwatchPicker selected={color} onChange={setColor} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createTag.isPending || !name.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createTag.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Add tag
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function TagsPanel({ guidelineId }: TagsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { data: tags, isLoading, isError } = useTags(guidelineId);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Tags</h2>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add tag
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddTagForm guidelineId={guidelineId} onClose={() => setShowAddForm(false)} />
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load tags. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && tags && tags.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <TagIcon className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No tags yet</p>
          <p className="text-xs text-gray-400">Add tags to organise this guideline</p>
        </div>
      )}

      {/* Tags list */}
      {!isLoading && !isError && tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} guidelineId={guidelineId} />
          ))}
        </div>
      )}
    </div>
  );
}
