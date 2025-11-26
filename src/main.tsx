import React from 'react'
import ReactDOM from 'react-dom/client'
import { ToastLogProvider } from './contexts/ToastLogContext'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastLogProvider>
      <App />
    </ToastLogProvider>
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
