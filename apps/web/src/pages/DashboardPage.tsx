import { Loader2 } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  const statItems = [
    { label: 'Guidelines', value: stats?.guidelines },
    { label: 'Sections', value: stats?.sections },
    { label: 'Recommendations', value: stats?.recommendations },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Welcome to OpenGRADE</h2>
        <p className="mt-2 text-muted-foreground">
          A FHIR-native clinical guideline authoring platform built on GRADE methodology
          for creating and maintaining living guidelines.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statItems.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold">
              {isLoading ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                stat.value ?? '--'
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
