import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { recarregarPorNovaVersao } from './utils/carregarTela'

// Vite avisa quando não consegue baixar um pedaço do site (versão nova publicada)
window.addEventListener('vite:preloadError', (event) => {
  if (recarregarPorNovaVersao()) event.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <App />,
)
