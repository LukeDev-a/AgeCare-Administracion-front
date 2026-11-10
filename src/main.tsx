import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { App } from './App';
import { GlobalLoading } from './components/GlobalLoading';
import './index.css';
import './tailwind.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <GlobalLoading />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
