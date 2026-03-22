import { NavLink } from 'react-router-dom'

export default function Navbar() {
    return (
        <nav>
            <ul
                style={{
                    display: 'flex',
                    gap: '1rem',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                }}
            >
                <li>
                    <NavLink to="/">Main</NavLink>
                </li>
                <li>
                    <NavLink to="/about">About</NavLink>
                </li>
                <li>
                    <NavLink to="/contact">Contact</NavLink>
                </li>
            </ul>
        </nav>
    )
}
