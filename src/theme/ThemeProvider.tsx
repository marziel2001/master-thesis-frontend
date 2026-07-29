import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeMode } from './themeContext'

const THEME_STORAGE_KEY = 'theme'

function readInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'light'
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
        return stored
    }

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark'
    }

    return 'light'
}

/**
 * Owns the light/dark mode for the whole app.
 *
 * Lives above the router so that anything reading design tokens at runtime -
 * the Chart.js canvases in particular, which cannot use CSS - re-renders when
 * the theme flips.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeMode>(readInitialTheme)

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }, [theme])

    const toggleTheme = useCallback(() => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    }, [])

    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

    return <ThemeContext value={value}>{children}</ThemeContext>
}
