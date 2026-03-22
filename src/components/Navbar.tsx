import { NavLink } from 'react-router-dom'

export default function Navbar() {
    const linkStyle =
        '  text-2xl bg-amber-50 text-black p-2 m-2 border-black border-2 rounded-lg'

    return (
        <nav>
            <div className="flex">
                <NavLink className={linkStyle} to="/">
                    Transkrypcja Pliku
                </NavLink>
                <NavLink className={linkStyle} to="/liveTranscribe">
                    Transkrypcja na żywo
                </NavLink>
            </div>
        </nav>
    )
}
