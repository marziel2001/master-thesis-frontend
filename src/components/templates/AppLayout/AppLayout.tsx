import { Outlet } from 'react-router-dom'
import Navbar from '../../organisms/Navbar/Navbar'
import styles from './AppLayout.module.css'

/** Shell shared by every route: themed page background, navbar and content. */
export default function AppLayout() {
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <Navbar />
                <div className={styles.content}>
                    <Outlet />
                </div>
            </div>
        </main>
    )
}
