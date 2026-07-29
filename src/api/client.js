const BASE = '/api'
const TTL = 60 * 1000
const cache = new Map()

async function cachedFetch(url) {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.time < TTL) return hit.data

  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `요청 실패: ${url}`)
  }
  const data = await res.json()
  cache.set(url, { data, time: Date.now() })
  return data
}

export const searchCompanies = (q) => cachedFetch(`${BASE}/search?q=${encodeURIComponent(q)}`)
export const getReports = (corpCode) => cachedFetch(`${BASE}/company/${corpCode}/reports`)
export const getFinancials = (corpCode) => cachedFetch(`${BASE}/company/${corpCode}/financials`)
export const getPrice = (stockCode) => cachedFetch(`${BASE}/stock/${stockCode}/price`)
export const getChart = (stockCode) => cachedFetch(`${BASE}/stock/${stockCode}/chart`)

// 보고서/재무/시세/차트를 병렬로 조회해 응답 속도를 최적화
export async function fetchCompanyDashboard(corpCode, stockCode) {
  const [reports, financials, price, chart] = await Promise.all([
    getReports(corpCode),
    getFinancials(corpCode),
    getPrice(stockCode),
    getChart(stockCode),
  ])
  return { reports, financials, price, chart }
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || '요청 실패')
  return body
}

export const register = (email, password) =>
  jsonFetch(`${BASE}/auth/register`, { method: 'POST', body: JSON.stringify({ email, password }) })
export const login = (email, password) =>
  jsonFetch(`${BASE}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) })
export const logout = () => jsonFetch(`${BASE}/auth/logout`, { method: 'POST' })
export const fetchMe = () => jsonFetch(`${BASE}/auth/me`)

export const getWatchlist = () => jsonFetch(`${BASE}/watchlist`)
export const addToWatchlist = (company) =>
  jsonFetch(`${BASE}/watchlist`, { method: 'POST', body: JSON.stringify(company) })
export const removeFromWatchlist = (id) => jsonFetch(`${BASE}/watchlist/${id}`, { method: 'DELETE' })
