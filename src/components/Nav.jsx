import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="topnav">
      <Link to="/" className="brand">
        페이지
      </Link>
      <div className="topnav-links">
        <Link to="/watchlist">관심기업</Link>
        {user ? (
          <>
            <span className="nav-user">{user.email}</span>
            <button type="button" className="link-btn" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link to="/login">로그인</Link>
            <Link to="/register">회원가입</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Nav
