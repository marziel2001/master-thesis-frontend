import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import styles from '../styles/theme.module.css'

type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'

const getInitialTheme = (): ThemeMode => {
    if (typeof window === 'undefined') {
        return 'light'
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
        return stored
    }

    if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
        return 'dark'
    }

    return 'light'
}

export default function Navbar() {
    const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    }

    const baseLinkStyle = `rounded-md px-3 py-2 text-sm font-medium transition-colors ${styles.navLink}`

    const getLinkStyle = ({ isActive }: { isActive: boolean }) =>
        `${baseLinkStyle} ${isActive ? styles.navLinkActive : ''}`

    return (
        <nav className={`rounded-2xl p-3 shadow-md ${styles.nav}`}>
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2">
                    <NavLink className={getLinkStyle} to="/">
                        Transkrypcja Pliku
                    </NavLink>
                    {/* <NavLink className={getLinkStyle} to="/liveTranscribe">
                        Transkrypcja na żywo
                    </NavLink> */}
                    <NavLink className={getLinkStyle} to="/compare">
                        Results reader
                    </NavLink>
                    <NavLink className={getLinkStyle} to="/about">
                        About
                    </NavLink>
                    {/* <NavLink className={getLinkStyle} to="/contact">
                        Contact
                    </NavLink> */}
                </div>
                <button
                    className={`ml-auto inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${styles.toggleButton}`}
                    type="button"
                    onClick={toggleTheme}
                    aria-pressed={theme === 'dark'}
                    title={
                        theme === 'dark'
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'
                    }
                >
                    {theme === 'dark' ? (
                        <Sun aria-hidden="true" className="h-4 w-4" />
                    ) : (
                        <Moon aria-hidden="true" className="h-4 w-4" />
                    )}
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
            </div>
        </nav>
    )
}
