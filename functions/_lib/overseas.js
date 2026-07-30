import { cacheGet, cachePut } from './cache.js'

// 네이버 증권 해외 주식 API는 DART와 달리 TLS 1.3이라 Cloudflare Workers에서도 문제없이
// 호출된다(_lib/naver.js의 국내 시세와 동일한 이유). 그래서 해외 종목은 배포 버전에서도
// 실데이터로 보여줄 수 있다.
const HEADERS = { 'User-Agent': 'Mozilla/5.0' }

// 자동완성/검색에 쓰는 소규모 큐레이션 목록. 나스닥은 "AAPL.O"처럼 거래소 접미사가
// 붙고 뉴욕증권거래소는 접미사 없이 "KO"처럼 티커만 쓴다 — 실제로 존재를 확인한 값들이다.
export const OVERSEAS_STOCKS = [
  { symbol: 'AAPL.O', nameKo: '애플', nameEn: 'Apple' },
  { symbol: 'MSFT.O', nameKo: '마이크로소프트', nameEn: 'Microsoft' },
  { symbol: 'GOOGL.O', nameKo: '알파벳(구글)', nameEn: 'Alphabet' },
  { symbol: 'AMZN.O', nameKo: '아마존', nameEn: 'Amazon' },
  { symbol: 'NVDA.O', nameKo: '엔비디아', nameEn: 'NVIDIA' },
  { symbol: 'META.O', nameKo: '메타', nameEn: 'Meta Platforms' },
  { symbol: 'TSLA.O', nameKo: '테슬라', nameEn: 'Tesla' },
  { symbol: 'NFLX.O', nameKo: '넷플릭스', nameEn: 'Netflix' },
  { symbol: 'AMD.O', nameKo: 'AMD', nameEn: 'Advanced Micro Devices' },
  { symbol: 'INTC.O', nameKo: '인텔', nameEn: 'Intel' },
  { symbol: 'COST.O', nameKo: '코스트코', nameEn: 'Costco' },
  { symbol: 'PEP.O', nameKo: '펩시코', nameEn: 'PepsiCo' },
  { symbol: 'ADBE.O', nameKo: '어도비', nameEn: 'Adobe' },
  { symbol: 'KO', nameKo: '코카콜라', nameEn: 'Coca-Cola' },
  { symbol: 'JPM', nameKo: 'JP모건체이스', nameEn: 'JPMorgan Chase' },
  { symbol: 'DIS', nameKo: '월트 디즈니', nameEn: 'Walt Disney' },
  { symbol: 'V', nameKo: '비자', nameEn: 'Visa' },
  { symbol: 'CRM', nameKo: '세일즈포스', nameEn: 'Salesforce' },
  { symbol: 'TSM', nameKo: 'TSMC', nameEn: 'Taiwan Semiconductor' },
]

export async function searchOverseas(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return OVERSEAS_STOCKS.filter(
    (s) => s.nameKo.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q),
  ).map((s) => ({ corpCode: s.symbol, corpName: s.nameKo, stockCode: s.symbol, market: 'overseas' }))
}

export async function getOverseasPrice(symbol) {
  const cacheKey = `overseas-price:${symbol}`
  const cached = await cacheGet(cacheKey)
  if (cached) return cached

  const res = await fetch(`https://api.stock.naver.com/stock/${symbol}/basic`, { headers: HEADERS })
  const data = await res.json()

  const result = {
    name: data.stockName,
    price: Number(data.closePrice),
    change: data.compareToPreviousClosePrice,
    changeRate: data.fluctuationsRatio,
    isRising: data.compareToPreviousPrice?.code === '2',
  }

  await cachePut(cacheKey, result, 30)
  return result
}

function toChartRows(priceInfos) {
  return (priceInfos || [])
    .map((p) => ({
      date: `${p.localDate.slice(0, 4)}-${p.localDate.slice(4, 6)}-${p.localDate.slice(6, 8)}`,
      close: Number(p.closePrice),
    }))
    .filter((r) => !Number.isNaN(r.close))
}

function formatNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`
}

async function fetchCandles(symbol, periodType) {
  const params = new URLSearchParams({
    periodType,
    // 이 엔드포인트는 날짜 범위를 사실상 무시하고 항상 최근 데이터를 최대 개수만큼
    // 돌려주지만, 파라미터 자체는 필수라 넉넉한 범위를 채워서 보낸다.
    startDateTime: '200001010000',
    endDateTime: formatNow(),
  })
  const res = await fetch(`https://api.stock.naver.com/chart/foreign/item/${symbol}?${params}`, { headers: HEADERS })
  const data = await res.json()
  return toChartRows(data.priceInfos)
}

// 해외 종목은 국내 KRX용 siseJson처럼 원하는 기간을 한 번에 다 받을 수 있는 API가 없고,
// day/week/month 캔들 각각 최근 110개로 캡이 걸려 있다(day는 약 5개월치, week는 약 2년치,
// month는 약 9년치). 그래서 세 해상도를 전부 받아두고, 화면에서 선택한 기간에 맞는 걸
// 골라 쓰게 한다.
export async function getOverseasChart(symbol) {
  const cacheKey = `overseas-chart:${symbol}`
  const cached = await cacheGet(cacheKey)
  if (cached) return cached

  const [day, week, month] = await Promise.all([
    fetchCandles(symbol, 'dayCandle'),
    fetchCandles(symbol, 'weekCandle'),
    fetchCandles(symbol, 'monthCandle'),
  ])

  const result = { day, week, month }
  await cachePut(cacheKey, result, 60 * 30)
  return result
}
