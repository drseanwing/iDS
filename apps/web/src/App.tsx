import { useState } from 'react';
import { I18nProvider } from './lib/i18n';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { GuidelinesPage } from './pages/GuidelinesPage';
import { ReferencesPage } from './pages/ReferencesPage';
import { GuidelineWorkspacePage } from './pages/GuidelineWorkspacePage';
import { PublicViewerPage } from './pages/PublicViewerPage';
import { UpdatePrompt } from './components/pwa/UpdatePrompt';
import { InstallPrompt } from './components/pwa/InstallPrompt';

type AppPath = 'dashboard' | 'guidelines' | 'references' | 'workspace' | 'public-viewer';

function App() {
  const [path, setPath] = useState<AppPath>('dashboard');
  const [activeGuidelineId, setActiveGuidelineId] = useState<string | null>(null);
  const [publicShortName, setPublicShortName] = useState<string | null>(null);

  function handleOpenGuideline(id: string) {
    setActiveGuidelineId(id);
    setPath('workspace');
  }

  function handleBackFromWorkspace() {
    setPath('guidelines');
    setActiveGuidelineId(null);
  }

  function handleViewPublic(shortName: string) {
    setPublicShortName(shortName);
    setPath('public-viewer');
  }

  function handleBackFromPublicViewer() {
    setPath('guidelines');
    setPublicShortName(null);
  }

  function handleNavigate(newPath: string) {
    setPath(newPath as AppPath);
    if (newPath !== 'workspace') {
      setActiveGuidelineId(null);
    }
    if (newPath !== 'public-viewer') {
      setPublicShortName(null);
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

  if (path === 'public-viewer' && publicShortName) {
    return (
      <I18nProvider>
        <AppShell activePath="guidelines" onNavigate={handleNavigate} fullHeight>
          <PublicViewerPage
            shortName={publicShortName}
            onBack={handleBackFromPublicViewer}
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
      page = (
        <GuidelinesPage
          onOpenGuideline={handleOpenGuideline}
          onViewPublic={handleViewPublic}
        />
      );
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
