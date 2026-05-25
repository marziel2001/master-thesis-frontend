import { NavLink } from 'react-router-dom'

export default function Navbar() {
    const baseLinkStyle =
        'rounded-md px-3 py-2 text-sm font-medium transition-colors'

    const getLinkStyle = ({ isActive }: { isActive: boolean }) =>
        `${baseLinkStyle} ${
            isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`

    return (
        <nav className="rounded-2xl bg-white p-3 shadow-md">
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
        </nav>
    )
}
