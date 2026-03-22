import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import MainPage from './pages/MainPage'
import LayoutPage from './pages/LayoutPage'
import LiveTranscribePage from './pages/LiveTranscribePage'
import TestPage from './pages/TestPage'

function App() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LayoutPage />}>
                        <Route index element={<MainPage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route
                            path="liveTranscribe"
                            element={<LiveTranscribePage />}
                        />{' '}
                        <Route path="testPage" element={<TestPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App
