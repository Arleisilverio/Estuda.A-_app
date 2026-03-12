import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Forçar tema escuro imediatamente
document.documentElement.classList.add('dark');
document.body.style.backgroundColor = 'hsl(232, 93%, 8%)';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
