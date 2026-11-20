import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { useSpectacleStore } from './store/useSpectacleStore'
import { wireSounds } from './lib/sfx'

// how much show (and whether there is sound) — applied before the first paint
useSpectacleStore.getState().init()
wireSounds()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
