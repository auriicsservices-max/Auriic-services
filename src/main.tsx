import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress non-fatal performance and locking errors globally
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('DataCloneError') ||
    event.message?.includes("Failed to execute 'measure' on 'Performance'") ||
    event.message?.includes('Should not already be working') ||
    event.message?.includes('AbortError') ||
    event.message?.includes('aborted')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event.reason || '');
  if (
    reason.includes('DataCloneError') ||
    reason.includes("Failed to execute 'measure' on 'Performance'") ||
    reason.includes('Should not already be working') ||
    reason.includes('AbortError') ||
    reason.includes('aborted')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

