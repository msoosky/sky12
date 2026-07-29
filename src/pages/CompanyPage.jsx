import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { fetchCompanyDashboard, getWatchlist, addToWatchlist, removeFromWatchlist } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import StockChart from '../components/StockChart.jsx'
import FinancialTable from '../components/FinancialTable.jsx'
import ReportList from '../components/ReportList.jsx'

function CompanyPage() {
  const { corpCode } = useParams()
  const [searchParams] = useSearchParams()
  const stockCode = searchParams.get('stockCode')
  const corpNameParam = searchParams.get('corpName')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [watchlistId, setWatchlistId] = useState(null)
  const [watchlistBusy, setWatchlistBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCompanyDashboard(corpCode, stockCode)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [corpCode, stockCode])

  useEffect(() => {
    if (!user) {
      setWatchlistId(null)
      return
    }
    let cancelled = false
    getWatchlist()
      .then((list) => {
        if (cancelled) return
        const match = list.find((w) => w.corpCode === corpCode)
        setWatchlistId(match?.id ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user, corpCode])

  const corpName = corpNameParam || data?.price?.name || ''

  const toggleWatchlist = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setWatchlistBusy(true)
    try {
      if (watchlistId) {
        await removeFromWatchlist(watchlistId)
        setWatchlistId(null)
      } else {
        const item = await addToWatchlist({ corpCode, corpName, stockCode })
        setWatchlistId(item.id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setWatchlistBusy(false)
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← 검색으로 돌아가기
      </Link>

      <div className="company-header">
        <h1>{corpName || '기업 상세'}</h1>
        <button
          type="button"
          className={`watch-btn${watchlistId ? ' active' : ''}`}
          onClick={toggleWatchlist}
          disabled={watchlistBusy}
        >
          {watchlistId ? '★ 관심기업' : '☆ 관심기업 추가'}
        </button>
      </div>

      {loading && <p className="status">불러오는 중...</p>}
      {error && <p className="status error">오류: {error}</p>}

      {data && (
        <>
          {(data.reports?.[0]?.mock || data.financials?.[0]?.mock) && (
            <p className="notice">
              DART API 키가 아직 발급되지 않아 사업보고서·재무 항목은 샘플 데이터입니다. (시세·차트는 실데이터입니다)
              키가 발급되면 자동으로 실제 데이터로 전환됩니다.
            </p>
          )}

          <section className="section">
            <h2>현재 시세</h2>
            {data.price ? (
              <div className="price-summary">
                <span className="price">{Number(data.price.price).toLocaleString('ko-KR')}원</span>
                <span className={data.price.isRising ? 'up' : 'down'}>
                  {data.price.change} ({data.price.changeRate}%)
                </span>
              </div>
            ) : (
              <p className="status">시세 정보가 없습니다.</p>
            )}
          </section>

          <section className="section">
            <h2>차트</h2>
            <StockChart data={data.chart} />
          </section>

          <section className="section">
            <h2>재무 (최근 3개년)</h2>
            <FinancialTable data={data.financials} />
          </section>

          <section className="section">
            <h2>사업보고서 (최근 3년)</h2>
            <ReportList reports={data.reports} />
          </section>
        </>
      )}
    </div>
  )
}

export default CompanyPage
