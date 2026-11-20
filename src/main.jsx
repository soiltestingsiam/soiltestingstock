import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { useSpectacleStore } from './store/useSpectacleStore'
import { useThemeStore } from './store/useThemeStore'
import { wireSounds } from './lib/sfx'

// how much show (and whether there is sound) — applied before the first paint
useSpectacleStore.getState().init()
// the user's own theme + skin, before the first paint (no flash of the wrong colours)
document.documentElement.setAttribute('data-theme', useThemeStore.getState().theme)
document.documentElement.setAttribute('data-skin', useThemeStore.getState().skin)
wireSounds()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
