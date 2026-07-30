import axios from 'axios'
import cache from './cache.js'

// 네이버 증권의 해외 주식 API. 국내(KRX) 쪽과 호스트가 다르고(api.stock.naver.com),
// 종목 표기도 달라서 나스닥은 "AAPL.O"처럼 거래소 접미사가 붙고 뉴욕증권거래소는
// 접미사 없이 "KO"처럼 그냥 티커만 쓴다. 직접 하나씩 호출해 보며 확인한 값들이다.
const client = axios.create({
  headers: { 'User-Agent': 'Mozilla/5.0' },
  timeout: 5000,
})

// 자동완성/검색에 쓰는 소규모 큐레이션 목록. DART 같은 전체 등록 목록이 없어
// 실제로 존재를 확인한 유명 종목들로만 구성했다.
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
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const { data } = await client.get(`https://api.stock.naver.com/stock/${symbol}/basic`)

  const result = {
    name: data.stockName,
    price: Number(data.closePrice),
    change: data.compareToPreviousClosePrice,
    changeRate: data.fluctuationsRatio,
    isRising: data.compareToPreviousPrice?.code === '2',
  }

  cache.set(cacheKey, result, 30)
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

async function fetchCandles(symbol, periodType) {
  const { data } = await client.get(`https://api.stock.naver.com/chart/foreign/item/${symbol}`, {
    params: {
      periodType,
      // 이 엔드포인트는 날짜 범위를 사실상 무시하고 항상 최근 데이터를 최대 개수만큼
      // 돌려주지만, 파라미터 자체는 필수라 넉넉한 범위를 채워서 보낸다.
      startDateTime: '200001010000',
      endDateTime: formatNow(),
    },
  })
  return toChartRows(data.priceInfos)
}

function formatNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`
}

// 해외 종목은 국내 KRX용 siseJson처럼 원하는 기간을 한 번에 다 받을 수 있는 API가 없고,
// day/week/month 캔들 각각 최근 110개로 캡이 걸려 있다(day는 약 5개월치, week는 약 2년치,
// month는 약 9년치). 그래서 세 해상도를 전부 받아두고, 화면에서 선택한 기간에 맞는 걸
// 골라 쓰게 한다.
export async function getOverseasChart(symbol) {
  const cacheKey = `overseas-chart:${symbol}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const [day, week, month] = await Promise.all([
    fetchCandles(symbol, 'dayCandle'),
    fetchCandles(symbol, 'weekCandle'),
    fetchCandles(symbol, 'monthCandle'),
  ])

  const result = { day, week, month }
  cache.set(cacheKey, result, 60 * 30)
  return result
}
