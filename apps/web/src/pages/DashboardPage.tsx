import { Loader2 } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { token, login, register, authError } = useAuth();
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
        {authError && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {authError}
          </p>
        )}
        {!token && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => void login()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Log in
            </button>
            <button
              onClick={() => void register()}
              className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Create account
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statItems.map((stat) => (
          <div key={stat.labelKey} className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">{t(stat.labelKey)}</p>
            <p className="mt-1 text-3xl font-bold">
              {isLoading ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                token ? stat.value ?? '--' : '--'
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
