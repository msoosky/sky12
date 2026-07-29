import axios from 'axios'
import cache from './cache.js'

// 네이버 증권 모바일 API (비공식 엔드포인트). 네이버 측 응답 스키마가 변경되면
// 필드 매핑을 다시 확인해야 할 수 있음.
const client = axios.create({
  headers: { 'User-Agent': 'Mozilla/5.0' },
  timeout: 5000,
})

const num = (v) => (typeof v === 'string' ? Number(v.replace(/,/g, '')) : v)

export async function getPrice(stockCode) {
  const cacheKey = `price:${stockCode}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const { data } = await client.get(`https://m.stock.naver.com/api/stock/${stockCode}/basic`)

  const result = {
    name: data.stockName,
    price: num(data.closePrice),
    change: data.compareToPreviousClosePrice,
    changeRate: data.fluctuationsRatio,
    isRising: data.compareToPreviousPrice?.code === '2',
  }

  cache.set(cacheKey, result, 30) // 시세는 짧게 캐싱
  return result
}

const MAX_PAGE_SIZE = 60 // 네이버 API가 페이지당 허용하는 최대 개수

export async function getChart(stockCode, days = 260) {
  const cacheKey = `chart:${stockCode}:${days}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const pages = Math.ceil(days / MAX_PAGE_SIZE)

  const responses = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      client.get(`https://m.stock.naver.com/api/stock/${stockCode}/price`, {
        params: { pageSize: MAX_PAGE_SIZE, page: i + 1 },
      })
    )
  )

  const combined = responses
    .flatMap((r) => (Array.isArray(r.data) ? r.data : []))
    .map((d) => ({
      date: d.localDate || d.localTradedAt,
      open: num(d.openPrice),
      high: num(d.highPrice),
      low: num(d.lowPrice),
      close: num(d.closePrice),
    }))
    .filter((d) => d.date && !Number.isNaN(d.close))

  const result = combined.slice(0, days).reverse()

  cache.set(cacheKey, result, 60 * 5)
  return result
}
