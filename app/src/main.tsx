import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { StudyProvider, ErrorBoundary } from './state/provider';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <StudyProvider>
        <App />
      </StudyProvider>
    </ErrorBoundary>
  </StrictMode>,
);
