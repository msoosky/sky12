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

export const EARLIEST_CHART_YEAR = 2020

// 네이버 금융의 대량 시세 조회 엔드포인트. 모바일 API처럼 페이지당 60건씩 나눠받을
// 필요 없이 원하는 기간(연 단위 다년치도 가능) 전체를 한 번의 요청으로 받아온다.
// 응답이 엄밀한 JSON이 아니라 헤더 행은 작은따옴표, 데이터 행은 큰따옴표를 섞어 쓰는
// JS 배열 리터럴 텍스트라서 JSON.parse 대신 데이터 행만 정규식으로 뽑아낸다.
const ROW_REGEX = /\["(\d{8})",\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/g

export async function getChartRange(stockCode, startYear = EARLIEST_CHART_YEAR, endYear = new Date().getFullYear()) {
  const cacheKey = `chartrange:${stockCode}:${startYear}:${endYear}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const { data } = await client.get('https://api.finance.naver.com/siseJson.naver', {
    params: {
      symbol: stockCode,
      requestType: 1,
      startTime: `${startYear}0101`,
      endTime: `${endYear}1231`,
      timeframe: 'day',
    },
    responseType: 'text',
  })

  const rows = []
  let match
  ROW_REGEX.lastIndex = 0
  while ((match = ROW_REGEX.exec(data)) !== null) {
    const [, ymd, open, high, low, close] = match
    rows.push({
      date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
    })
  }

  cache.set(cacheKey, rows, 60 * 60) // 과거 시세는 거의 안 바뀌므로 1시간 캐싱
  return rows
}
