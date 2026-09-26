import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { StudyProvider, ErrorBoundary } from './state/provider';
import { I18nProvider } from './i18n';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <StudyProvider>
          <App />
        </StudyProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);
