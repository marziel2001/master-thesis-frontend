import { createContext } from 'react'

export type ThemeMode = 'light' | 'dark'

export type ThemeContextValue = {
    theme: ThemeMode
    toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
