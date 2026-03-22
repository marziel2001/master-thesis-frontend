import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function LayoutPage() {
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                <Navbar />
                <main className="rounded-2xl bg-white p-6 shadow-md">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
