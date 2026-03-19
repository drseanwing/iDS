# ADR-003: TipTap Rich Text Editor

## Status

Accepted

## Context

OpenGRADE needs to support rich text content with the following requirements:

- **Track changes** - ability to see who changed what and when
- **Collaborative editing** - multiple users working on the same document
- **Structured content** - semantic markup (headings, lists, links, citations)
- **Browser-based** - accessible without native app installation
- **Extensible** - ability to add domain-specific elements (recommendation references, PICO codes)

Traditional WYSIWYG editors (CKEditor, Quill) work well for simple rich text but don't provide good track changes or collaborative editing support out of the box.

## Decision

We use **TipTap 3**, a headless editor framework built on ProseMirror, for all rich text content in OpenGRADE.

### Why TipTap?

1. **ProseMirror Foundation** - ProseMirror provides a solid operational transformation engine for collaborative editing
2. **Track Changes Plugin** - Excellent track changes support via the `@tiptap/extension-collaboration-track-changes` extension
3. **Collaborative Cursors** - See where other users are editing in real-time
4. **Structured JSON** - Documents are stored as structured JSON (AST), not HTML, enabling semantic analysis
5. **Extensible Schema** - Custom extensions allow domain-specific content (recommendations, PICO codes, footnotes)
6. **TypeScript Support** - Type-safe schema and extension development
7. **Headless** - Complete separation between editor logic and UI, allowing custom rendering

### Storage Model

Rich text content is stored as **structured JSON** in JSONB columns:

```sql
-- In recommendation table
rationale JSONB,  -- TipTap document
practical_info JSONB,  -- TipTap document

-- In section table
narrative_content JSONB  -- TipTap document
```

### Example Document

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "This is a strong recommendation"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Supporting evidence: ",
          "marks": [
            { "type": "bold" }
          ]
        },
        {
          "type": "text",
          "text": "see reference",
          "marks": [
            {
              "type": "recommendation-link",
              "attrs": {
                "recommendationId": "rec-123"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Custom Extensions

OpenGRADE extends TipTap with domain-specific elements:

- **RecommendationLink** - Links to other recommendations
- **PicoReference** - Inline PICO code references
- **CitationFootnote** - Numbered citation references
- **GradeBox** - GRADE evidence boxes
- **EtdFactor** - EtD framework factor annotations

## Consequences

### Positive

1. **Track Changes Built-In** - Collaborators can see who made which edits and when
2. **Collaborative Editing** - Multiple users can edit simultaneously with live cursor positions
3. **Semantic Content** - Structured JSON allows server-side analysis (e.g., extract all PICO references automatically)
4. **Version Comparison** - Easy to diff JSON between versions and show what changed
5. **Migration-Friendly** - JSON format is easier to transform/migrate than HTML
6. **Rich Extensibility** - Custom marks and nodes for domain concepts
7. **Standards-Based** - ProseMirror is well-documented and battle-tested

### Negative

1. **Learning Curve** - ProseMirror and TipTap have a learning curve; not as simple as CKEditor
2. **Bundle Size** - TipTap + ProseMirror adds ~50-60KB gzipped to the frontend bundle
3. **Migration Effort** - Existing content in HTML format requires conversion to TipTap JSON
4. **Y.js Complexity** - Collaborative editing requires Y.js (CRDT library), adding complexity
5. **Custom Extension Maintenance** - Domain-specific extensions require ongoing maintenance
6. **JSON Serialization** - Storing JSON requires careful handling of escaping and validation

## Implementation Details

### Frontend Usage

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

const editor = useEditor({
  extensions: [
    StarterKit,
    Collaboration.configure({
      document: ydoc,
    }),
    CollaborationCursor.configure({
      provider,
      user: { name: currentUser.name, color: userColor },
    }),
    // Custom extensions
    RecommendationLink,
    PicoReference,
  ],
  content: documentJson,
});
```

### Backend Storage

```typescript
// In recommendation.service.ts
async updateRationale(recommendationId: string, content: Record<string, any>) {
  // Validate JSON against schema
  const validation = this.validateTipTapSchema(content);
  if (!validation.valid) {
    throw new BadRequestException(validation.errors);
  }

  return this.prisma.recommendation.update({
    where: { id: recommendationId },
    data: {
      rationale: content,
      updatedAt: new Date(),
    },
  });
}
```

### Track Changes

Track changes are managed at the client level with Y.js:

```typescript
// Changes are automatically captured by Y.js
const awareness = provider.awareness;
awareness.setLocalState({
  user: { name, color },
  lastUpdate: Date.now(),
});

// Server persists the result after collaboration is complete
```

## Related ADRs

- [ADR-002: NestJS Module Boundaries](./002-nestjs-module-boundaries.md) - Services that manage rich text content
- [ADR-001: FHIR-Native Schema](./001-fhir-native-schema.md) - JSONB columns for TipTap documents

## Further Reading

- [TipTap Documentation](https://tiptap.dev/)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Y.js Documentation](https://docs.yjs.dev/)
- [Collaborative Editing in TipTap](https://tiptap.dev/guide/collaborative-editing)
