import { BrowserRouter, Route, Routes } from 'react-router'
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import MainPage from './pages/MainPage'
import LayoutPage from './pages/LayoutPage'

function App() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LayoutPage />}>
                        <Route index element={<MainPage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="contact" element={<ContactPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App
