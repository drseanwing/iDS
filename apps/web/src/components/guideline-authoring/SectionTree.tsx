import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, FolderOpen, Folder, GripVertical, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import type { Section } from '../../hooks/useSections';

/**
 * Compute section numbering (e.g. "1", "1.1", "2") for all sections.
 * Sections with excludeFromNumbering=true are skipped in the counter but still appear.
 */
export function computeSectionNumbers(
  sections: Section[],
  prefix = '',
): Map<string, string> {
  const map = new Map<string, string>();
  let counter = 0;
  for (const section of sections) {
    if (!section.excludeFromNumbering) {
      counter++;
      const num = prefix ? `${prefix}.${counter}` : `${counter}`;
      map.set(section.id, num);
      if (section.children.length > 0) {
        const childMap = computeSectionNumbers(section.children, num);
        childMap.forEach((v, k) => map.set(k, v));
      }
    }
  }
  return map;
}

interface SectionTreeItemProps {
  section: Section;
  depth: number;
  selectedId: string | null;
  showNumbers: boolean;
  onSelect: (id: string) => void;
  onChildReorder: (parentId: string, orderedIds: string[]) => void;
  onDeleteSection?: (id: string) => void;
  numberMap: Map<string, string>;
}

function SectionTreeItem({
  section,
  depth,
  selectedId,
  showNumbers,
  onSelect,
  onChildReorder,
  onDeleteSection,
  numberMap,
}: SectionTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasChildren = section.children.length > 0;
  const isSelected = selectedId === section.id;
  const sectionNumber = showNumbers ? numberMap.get(section.id) : undefined;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sensors for the child DndContext — stable since options are constant
  const childSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleChildDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = section.children.map((c) => c.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChildReorder(section.id, arrayMove(ids, oldIndex, newIndex));
    }
  }

  return (
    <li ref={setNodeRef} style={style}>
      <div className="flex items-center group">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="flex-shrink-0 rounded p-1 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors"
          style={{ paddingLeft: `${0.25 + depth * 1}rem` }}
          tabIndex={0}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
            className={cn(
              'flex-shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors',
              isSelected ? 'text-accent-foreground' : '',
            )}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="flex-shrink-0 w-[1.375rem]" />
        )}

        <button
          onClick={() => onSelect(section.id)}
          className={cn(
            'flex flex-1 min-w-0 items-center gap-1.5 rounded-md py-1.5 pr-2 pl-1 text-sm transition-colors',
            isSelected
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
          )}
          aria-current={isSelected ? 'true' : undefined}
        >
          {hasChildren ? (
            expanded ? (
              <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 flex-shrink-0" />
            )
          ) : null}
          {sectionNumber && (
            <span className="flex-shrink-0 tabular-nums text-xs opacity-60">{sectionNumber}</span>
          )}
          <span className="truncate">{section.title}</span>
        </button>

        {/* Delete control */}
        {onDeleteSection && (
          confirmDelete ? (
            <div className="flex flex-shrink-0 items-center gap-0.5 pr-1">
              <button
                onClick={() => { onDeleteSection(section.id); setConfirmDelete(false); }}
                aria-label="Confirm delete section"
                className="rounded px-1 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                aria-label="Cancel delete"
                className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              aria-label={`Delete section: ${section.title}`}
              className="flex-shrink-0 rounded p-1 text-muted-foreground/0 group-hover:text-muted-foreground/50 hover:!text-destructive transition-colors mr-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>

      {hasChildren && expanded && (
        <DndContext
          sensors={childSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChildDragEnd}
        >
          <SortableContext
            items={section.children.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul role="group">
              {section.children.map((child) => (
                <SectionTreeItem
                  key={child.id}
                  section={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  showNumbers={showNumbers}
                  onSelect={onSelect}
                  onChildReorder={onChildReorder}
                  onDeleteSection={onDeleteSection}
                  numberMap={numberMap}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </li>
  );
}

interface SectionTreeProps {
  sections: Section[];
  selectedId: string | null;
  showNumbers?: boolean;
  onSelect: (id: string) => void;
  onAddSection?: (title: string, parentId?: string) => void;
  onDeleteSection?: (id: string) => void;
  onReorder?: (parentId: string | null, orderedIds: string[]) => void;
}

export function SectionTree({
  sections,
  selectedId,
  showNumbers = true,
  onSelect,
  onAddSection,
  onDeleteSection,
  onReorder,
}: SectionTreeProps) {
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Only show root-level sections (no parentId) since children are nested
  const rootSections = sections.filter((s) => !s.parentId);
  const numberMap = computeSectionNumbers(rootSections);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleRootDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = rootSections.map((s) => s.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder?.(null, arrayMove(ids, oldIndex, newIndex));
    }
  }

  function handleChildReorder(parentId: string, orderedIds: string[]) {
    onReorder?.(parentId, orderedIds);
  }

  function handleAddClick() {
    setAddingSection(true);
    setNewSectionTitle('');
    // Focus the input on next tick after render
    setTimeout(() => addInputRef.current?.focus(), 0);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = newSectionTitle.trim();
    if (title && onAddSection) {
      onAddSection(title);
    }
    setAddingSection(false);
    setNewSectionTitle('');
  }

  function handleAddCancel() {
    setAddingSection(false);
    setNewSectionTitle('');
  }

  return (
    <nav aria-label="Section tree" className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sections
        </span>
        {onAddSection && (
          <button
            onClick={handleAddClick}
            aria-label="Add section"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {rootSections.length === 0 && !addingSection ? (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">
            No sections yet.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleRootDragEnd}
          >
            <SortableContext
              items={rootSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul role="tree" aria-label="Guideline sections" className="space-y-0.5">
                {rootSections.map((section) => (
                  <SectionTreeItem
                    key={section.id}
                    section={section}
                    depth={0}
                    selectedId={selectedId}
                    showNumbers={showNumbers}
                    onSelect={onSelect}
                    onChildReorder={handleChildReorder}
                    onDeleteSection={onDeleteSection}
                    numberMap={numberMap}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {/* Inline new-section form */}
        {addingSection && (
          <form
            onSubmit={handleAddSubmit}
            className="mt-1 px-1"
            aria-label="New section form"
          >
            <input
              ref={addInputRef}
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Section title…"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-1 placeholder:text-muted-foreground/60"
              onKeyDown={(e) => { if (e.key === 'Escape') handleAddCancel(); }}
            />
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="submit"
                disabled={!newSectionTitle.trim()}
                className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Add
              </button>
              <button
                type="button"
                onClick={handleAddCancel}
                className="flex-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </nav>
  );
}
