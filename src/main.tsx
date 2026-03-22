import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LayoutPage from './pages/LayoutPage'
import MainPage from './pages/MainPage'
import AboutPage from './pages/AboutPage.tsx'
import ContactPage from './pages/ContactPage'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
)
