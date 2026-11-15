
import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiMenu,
  FiX,
  FiLogOut,
  FiActivity,
} from 'react-icons/fi'

import { AppContext } from '../App'
import './Navbar.css'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const { user, setUser } = useContext(AppContext)

  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('fixmateToken')
    setUser(null)
    setMenuOpen(false)

    navigate('/login', { replace: true })
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <div className="container navbar-container">

        <Link
          to="/"
          className="logo"
          onClick={closeMenu}
        >
          <span className="logo-icon">🔧</span>
          <span className="logo-text">FixMate</span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <FiX size={24} />
          ) : (
            <FiMenu size={24} />
          )}
        </button>

        <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>

          <li>
            <Link to="/" onClick={closeMenu}>
              Home
            </Link>
          </li>

          <li>
            <Link
              to="/report-problem"
              onClick={closeMenu}
            >
              Report Problem
            </Link>
          </li>

          <li>
            <Link
              to="/system-diagnostics"
              onClick={closeMenu}
            >
              <FiActivity style={{ marginRight: '5px' }} />
              System Diagnostics
            </Link>
          </li>

          <li>
            <Link
              to="/temp-cleanup"
              onClick={closeMenu}
            >
              🧹 Temporary File Cleanup
            </Link>
          </li>

          <li>
            <Link
              to="/network-troubleshooting"
              onClick={closeMenu}
            >
              🌐 Network Troubleshooting
            </Link>
          </li>

          <li>
            <Link
              to="/history"
              onClick={closeMenu}
            >
              History
            </Link>
          </li>

          {user?.role === 'admin' && (
            <li>
              <Link
                to="/admin"
                onClick={closeMenu}
              >
                Admin
              </Link>
            </li>
          )}

          <li>
            {user ? (
              <div className="user-menu">
                <span>{user.name}</span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  <FiLogOut /> Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="login-link"
                onClick={closeMenu}
              >
                Login
              </Link>
            )}
          </li>

        </ul>
      </div>
    </nav>
  )
}

export default Navbar
