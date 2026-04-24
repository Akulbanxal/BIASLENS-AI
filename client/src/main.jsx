import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './polish.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { NotificationProvider } from './contexts/NotificationContext'
import { LoadingProvider } from './contexts/LoadingContext'
import { ToastContainer } from './components/ToastContainer'
import { GlobalLoadingOverlay } from './components/GlobalLoadingOverlay'
import { useLoading } from './contexts/LoadingContext'

document.documentElement.classList.add('dark')

function RootApp() {
  const { isLoading, loadingMessage } = useLoading()
  return (
    <>
      <GlobalLoadingOverlay isLoading={isLoading} message={loadingMessage} />
      <ToastContainer />
      <App />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <LoadingProvider>
          <RootApp />
        </LoadingProvider>
      </NotificationProvider>
    </ErrorBoundary>
  </StrictMode>,
)
