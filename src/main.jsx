import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios';
axios.defaults.withCredentials = true;
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ViewportProvider } from './context/ViewportContext.jsx'
import { DataProvider } from './context/DataContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <ViewportProvider>
          <AuthProvider>
            <DataProvider>
              <App />
            </DataProvider>
          </AuthProvider>
        </ViewportProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
