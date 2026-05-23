import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1a0d',
            color: '#f0fdf0',
            border: '1px solid #1e3a1e',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0d1a0d' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#0d1a0d' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
