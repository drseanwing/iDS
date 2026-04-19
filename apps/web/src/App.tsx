import { useState } from 'react';
import { I18nProvider } from './lib/i18n';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { GuidelinesPage } from './pages/GuidelinesPage';
import { ReferencesPage } from './pages/ReferencesPage';
import { GuidelineWorkspacePage } from './pages/GuidelineWorkspacePage';
import { UpdatePrompt } from './components/pwa/UpdatePrompt';
import { InstallPrompt } from './components/pwa/InstallPrompt';

type AppPath = 'dashboard' | 'guidelines' | 'references' | 'workspace';

function App() {
  const [path, setPath] = useState<AppPath>('dashboard');
  const [activeGuidelineId, setActiveGuidelineId] = useState<string | null>(null);

  function handleOpenGuideline(id: string) {
    setActiveGuidelineId(id);
    setPath('workspace');
  }

  function handleBackFromWorkspace() {
    setPath('guidelines');
    setActiveGuidelineId(null);
  }

  function handleNavigate(newPath: string) {
    setPath(newPath as AppPath);
    if (newPath !== 'workspace') {
      setActiveGuidelineId(null);
    }
  }

  if (path === 'workspace' && activeGuidelineId) {
    return (
      <I18nProvider>
        <AppShell activePath="guidelines" onNavigate={handleNavigate} fullHeight>
          <GuidelineWorkspacePage
            guidelineId={activeGuidelineId}
            onBack={handleBackFromWorkspace}
          />
        </AppShell>
        <UpdatePrompt />
        <InstallPrompt />
      </I18nProvider>
    );
  }

  let page: React.ReactNode;
  switch (path) {
    case 'guidelines':
      page = <GuidelinesPage onOpenGuideline={handleOpenGuideline} />;
      break;
    case 'references':
      page = <ReferencesPage />;
      break;
    default:
      page = <DashboardPage />;
  }

  return (
    <I18nProvider>
      <AppShell activePath={path} onNavigate={handleNavigate}>
        {page}
      </AppShell>
      <UpdatePrompt />
      <InstallPrompt />
    </I18nProvider>
  );
}

export default App;
