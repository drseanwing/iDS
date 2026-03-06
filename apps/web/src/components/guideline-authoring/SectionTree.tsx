import { ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { Section } from '../../hooks/useSections';

interface SectionTreeItemProps {
  section: Section;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function SectionTreeItem({ section, depth, selectedId, onSelect }: SectionTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = section.children.length > 0;
  const isSelected = selectedId === section.id;

  return (
    <li>
      <div className="flex items-center">
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
            className={cn(
              'flex-shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors',
              isSelected ? 'text-accent-foreground' : '',
            )}
            style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="flex-shrink-0" style={{ paddingLeft: `${0.5 + depth * 1 + 1.375}rem` }} />
        )}
        <button
          onClick={() => onSelect(section.id)}
          className={cn(
            'flex flex-1 min-w-0 items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm transition-colors',
            hasChildren ? 'pl-1' : '',
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
          <span className="truncate">{section.title}</span>
        </button>
      </div>

      {hasChildren && expanded && (
        <ul role="group">
          {section.children.map((child) => (
            <SectionTreeItem
              key={child.id}
              section={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface SectionTreeProps {
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddSection?: () => void;
}

export function SectionTree({ sections, selectedId, onSelect, onAddSection }: SectionTreeProps) {
  // Only show root-level sections (no parentId) since children are nested
  const rootSections = sections.filter((s) => !s.parentId);

  return (
    <nav aria-label="Section tree" className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sections
        </span>
        {onAddSection && (
          <button
            onClick={onAddSection}
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
        {rootSections.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">
            No sections yet.
          </p>
        ) : (
          <ul role="tree" aria-label="Guideline sections" className="space-y-0.5">
            {rootSections.map((section) => (
              <SectionTreeItem
                key={section.id}
                section={section}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
