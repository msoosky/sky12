import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchCompanies } from '../api/client.js'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      setResults(await searchCompanies(query))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>주식 성공</h1>
        <p className="tagline">기업을 검색해 사업보고서·재무·시세를 한눈에 확인하세요</p>
      </header>

      <form className="search-form" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="기업명을 입력하세요 (예: 삼성전자)"
        />
        <button type="submit" disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>

      {error && <p className="status error">오류: {error}</p>}

      {results.some((c) => c.mock) && (
        <p className="notice">
          DART API 키가 아직 발급되지 않아 샘플 기업 목록을 보여드리고 있습니다. 키가 발급되면 전체 상장사 검색으로
          자동 전환됩니다.
        </p>
      )}

      <ul className="search-results">
        {results.map((c) => (
          <li key={c.corpCode}>
            <button
              className="result-item"
              onClick={() => navigate(`/company/${c.corpCode}?stockCode=${c.stockCode}`)}
            >
              <span className="result-name">{c.corpName}</span>
              <span className="result-code">{c.stockCode}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SearchPage
