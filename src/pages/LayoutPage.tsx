import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import styles from '../styles/theme.module.css'

export default function LayoutPage() {
    return (
        <main className={`min-h-screen p-6 ${styles.page}`}>
            <div className="mx-auto flex w-full max-w-6xl flex-col">
                <Navbar />
                <div className="mt-6 space-y-6">
                    <Outlet />
                </div>
            </div>
        </main>
    )
}
