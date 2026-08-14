import { NavLink } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Button, Panel } from '../../atoms'
import { useTheme } from '../../../hooks/useTheme'
import styles from './Navbar.module.css'

type NavItem = {
    to: string
    label: string
}

/**
 * Linked destinations, in order.
 *
 * `/contact` is routed but deliberately unlinked, as it was before: the page
 * is still a placeholder.
 */
const NAV_ITEMS: readonly NavItem[] = [
    { to: '/', label: 'Transkrypcja Pliku' },
    { to: '/liveTranscribe', label: 'Live transcription' },
    { to: '/compare', label: 'Results reader' },
    { to: '/about', label: 'About' },
]

export default function Navbar() {
    const { theme, toggleTheme } = useTheme()
    const isDark = theme === 'dark'

    const getLinkClassName = ({ isActive }: { isActive: boolean }) =>
        [styles.link, isActive ? styles.linkActive : ''].filter(Boolean).join(' ')

    return (
        <Panel as="nav" radius="2xl" padding="sm" elevation="md">
            <div className={styles.bar}>
                <div className={styles.links}>
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={getLinkClassName}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>
                <Button
                    variant="surfaceMuted"
                    className={styles.themeToggle}
                    onClick={toggleTheme}
                    aria-pressed={isDark}
                    title={
                        isDark ? 'Switch to light mode' : 'Switch to dark mode'
                    }
                >
                    {isDark ? (
                        <Sun aria-hidden="true" size={16} />
                    ) : (
                        <Moon aria-hidden="true" size={16} />
                    )}
                    {isDark ? 'Light mode' : 'Dark mode'}
                </Button>
            </div>
        </Panel>
    )
}
