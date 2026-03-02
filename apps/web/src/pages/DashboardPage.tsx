const stats = [
  { label: 'Guidelines', value: '--' },
  { label: 'Sections', value: '--' },
  { label: 'Recommendations', value: '--' },
];

export function DashboardPage() {
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
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
