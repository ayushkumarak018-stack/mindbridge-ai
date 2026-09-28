import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { ToastContainer } from './components/Toast.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <LanguageProvider>
            <App />
            <ToastContainer />
          </LanguageProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);

