import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function LayoutPage() {
    return (
        <div className="w-full h-full pl-50 pr-50 pt-20 bg-green-500">
            <Navbar />
            <main>
                <Outlet />
            </main>
        </div>
    )
}
