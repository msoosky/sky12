import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getWatchlist, removeFromWatchlist } from '../api/client.js'

function WatchlistPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    getWatchlist()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const handleRemove = async (id) => {
    try {
      await removeFromWatchlist(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (authLoading) {
    return (
      <div className="page">
        <p className="status">불러오는 중...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <header className="header">
          <h1>관심기업</h1>
          <p className="tagline">
            관심기업을 저장하고 계속 확인하려면 <Link to="/login">로그인</Link>이 필요합니다.
          </p>
        </header>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="header">
        <h1>관심기업</h1>
        <p className="tagline">저장해 둔 기업을 최신 순으로 바로 확인하세요</p>
      </header>

      {error && <p className="status error">오류: {error}</p>}
      {loading && <p className="status">불러오는 중...</p>}
      {!loading && items.length === 0 && <p className="status">저장된 관심기업이 없습니다.</p>}

      <ul className="search-results">
        {items.map((c) => (
          <li key={c.id} className="watchlist-row">
            <Link
              className="result-item"
              to={`/company/${c.corpCode}?stockCode=${c.stockCode}&corpName=${encodeURIComponent(c.corpName || '')}`}
            >
              <span className="result-name">{c.corpName}</span>
              <span className="result-code">{c.stockCode}</span>
            </Link>
            <button type="button" className="remove-btn" onClick={() => handleRemove(c.id)}>
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default WatchlistPage
