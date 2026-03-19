import { Loader2 } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useI18n } from '../lib/i18n';

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { t } = useI18n();

  const statItems = [
    { labelKey: 'dashboard.guidelines', value: stats?.guidelines },
    { labelKey: 'dashboard.sections', value: stats?.sections },
    { labelKey: 'dashboard.recommendations', value: stats?.recommendations },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">{t('dashboard.welcome')}</h2>
        <p className="mt-2 text-muted-foreground">
          A FHIR-native clinical guideline authoring platform built on GRADE methodology
          for creating and maintaining living guidelines.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statItems.map((stat) => (
          <div key={stat.labelKey} className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">{t(stat.labelKey)}</p>
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
