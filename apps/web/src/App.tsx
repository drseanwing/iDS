import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { GuidelinesPage } from './pages/GuidelinesPage';
import { ReferencesPage } from './pages/ReferencesPage';

function App() {
  const [path, setPath] = useState('dashboard');

  let page: React.ReactNode;
  switch (path) {
    case 'guidelines':
      page = <GuidelinesPage />;
      break;
    case 'references':
      page = <ReferencesPage />;
      break;
    default:
      page = <DashboardPage />;
  }

  return (
    <AppShell activePath={path} onNavigate={setPath}>
      {page}
    </AppShell>
  );
}

export default App;
