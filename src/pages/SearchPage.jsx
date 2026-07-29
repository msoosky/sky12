import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchCompanies } from '../api/client.js'

const DEBOUNCE_MS = 200
const MAX_SUGGESTIONS = 8

function SearchPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const list = await searchCompanies(q)
        if (!cancelled) setSuggestions(list.slice(0, MAX_SUGGESTIONS))
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    setActiveIndex(-1)
  }, [suggestions])

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const goToCompany = (c) => {
    setShowSuggestions(false)
    navigate(`/company/${c.corpCode}?stockCode=${c.stockCode}&corpName=${encodeURIComponent(c.corpName)}`)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setShowSuggestions(false)
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

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      goToCompany(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>페이지</h1>
        <p className="tagline">기업을 검색해 사업보고서·재무·시세·차트를 한눈에 확인하세요</p>
      </header>

      <div className="search-box" ref={boxRef}>
        <form className="search-form" onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="기업명을 입력하세요 (예: 삼성전자)"
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </button>
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="autocomplete-list">
            {suggestions.map((c, i) => (
              <li key={c.corpCode}>
                <button
                  type="button"
                  className={`autocomplete-item${i === activeIndex ? ' active' : ''}`}
                  onMouseDown={() => goToCompany(c)}
                >
                  <span className="result-name">{c.corpName}</span>
                  <span className="result-code">{c.stockCode}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
              onClick={() => navigate(`/company/${c.corpCode}?stockCode=${c.stockCode}&corpName=${encodeURIComponent(c.corpName)}`)}
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
