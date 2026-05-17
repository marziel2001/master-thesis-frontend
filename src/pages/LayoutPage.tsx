import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function LayoutPage() {
    return (
        <main className="min-h-screen bg-gray-100 p-6">
            <div className="mx-auto flex w-full max-w-6xl flex-col">
                <Navbar />
                <div className="mt-6 space-y-6">
                    <Outlet />
                </div>
            </div>
        </main>
    )
}
