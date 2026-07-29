import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/templates/AppLayout/AppLayout'
import AboutPage from './pages/AboutPage/AboutPage'
import ComparePage from './pages/ComparePage/ComparePage'
import ContactPage from './pages/ContactPage/ContactPage'
import LiveTranscribePage from './pages/LiveTranscribePage/LiveTranscribePage'
import MainPage from './pages/MainPage/MainPage'
import ThemeProvider from './theme/ThemeProvider'

export default function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<AppLayout />}>
                        <Route index element={<MainPage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route
                            path="liveTranscribe"
                            element={<LiveTranscribePage />}
                        />
                        <Route path="compare" element={<ComparePage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    )
}
