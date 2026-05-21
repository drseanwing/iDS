import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { PublicGuidelineReader } from './pages/PublicGuidelineReader';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  },
});

// Detect /g/:shortName public reader route before mounting the authenticated app
const publicGuidelineMatch = window.location.pathname.match(/^\/g\/([^/]+)\/?$/);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {publicGuidelineMatch ? (
        <PublicGuidelineReader shortName={decodeURIComponent(publicGuidelineMatch[1]!)} />
      ) : (
        <App />
      )}
    </QueryClientProvider>
  </React.StrictMode>,
);
