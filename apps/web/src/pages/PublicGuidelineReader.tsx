import { useQuery } from '@tanstack/react-query';

interface PublicSection {
  id: string;
  title: string;
  text: unknown;
  ordering: number;
}

interface PublicGuideline {
  id: string;
  title: string;
  shortName: string | null;
  status: string;
  sections: PublicSection[];
}

function renderSectionContent(text: unknown): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  // TipTap/ProseMirror JSON stored as Json field — extract plain text
  if (typeof text === 'object') return JSON.stringify(text);
  return String(text);
}

interface Props {
  shortName: string;
}

export function PublicGuidelineReader({ shortName }: Props) {
  const { data, isLoading, error } = useQuery<PublicGuideline>({
    queryKey: ['public-guideline', shortName],
    queryFn: async () => {
      const apiBase = (import.meta as any).env?.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/guidelines/public/${encodeURIComponent(shortName)}`);
      if (!res.ok) throw new Error('Guideline not found');
      return res.json() as Promise<PublicGuideline>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading guideline...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Guideline not found or not published.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8 border-b pb-6">
        <p className="text-sm font-medium text-blue-600 uppercase tracking-wide mb-1">
          Clinical Guideline
        </p>
        <h1 className="text-3xl font-bold text-gray-900">{data.title}</h1>
      </header>
      {data.sections.length === 0 && (
        <p className="text-gray-500">No sections available.</p>
      )}
      {data.sections.map((section) => {
        const content = renderSectionContent(section.text);
        return (
          <section key={section.id} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{section.title}</h2>
            {content && (
              <div
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
