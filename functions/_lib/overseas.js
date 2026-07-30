import { cacheGet, cachePut } from './cache.js'

// 네이버 증권 해외 주식 API는 DART와 달리 TLS 1.3이라 Cloudflare Workers에서도 문제없이
// 호출된다(_lib/naver.js의 국내 시세와 동일한 이유). 그래서 해외 종목은 배포 버전에서도
// 실데이터로 보여줄 수 있다.
const HEADERS = { 'User-Agent': 'Mozilla/5.0' }

// 자동완성/검색에 쓰는 큐레이션 목록. 나스닥은 "AAPL.O"처럼 거래소 접미사가 붙고
// 뉴욕증권거래소는 접미사 없이 "KO"처럼 티커만 쓴다 — 실제로 api.stock.naver.com에서
// 존재를 하나씩 확인한 종목들로만 구성했다(84개).
export const OVERSEAS_STOCKS = [
  // 빅테크·반도체
  { symbol: 'AAPL.O', nameKo: '애플', nameEn: 'Apple' },
  { symbol: 'MSFT.O', nameKo: '마이크로소프트', nameEn: 'Microsoft' },
  { symbol: 'GOOGL.O', nameKo: '알파벳(구글) Class A', nameEn: 'Alphabet' },
  { symbol: 'GOOG.O', nameKo: '알파벳(구글) Class C', nameEn: 'Alphabet' },
  { symbol: 'AMZN.O', nameKo: '아마존', nameEn: 'Amazon' },
  { symbol: 'NVDA.O', nameKo: '엔비디아', nameEn: 'NVIDIA' },
  { symbol: 'META.O', nameKo: '메타', nameEn: 'Meta Platforms' },
  { symbol: 'TSLA.O', nameKo: '테슬라', nameEn: 'Tesla' },
  { symbol: 'NFLX.O', nameKo: '넷플릭스', nameEn: 'Netflix' },
  { symbol: 'AMD.O', nameKo: 'AMD', nameEn: 'Advanced Micro Devices' },
  { symbol: 'INTC.O', nameKo: '인텔', nameEn: 'Intel' },
  { symbol: 'AVGO.O', nameKo: '브로드컴', nameEn: 'Broadcom' },
  { symbol: 'QCOM.O', nameKo: '퀄컴', nameEn: 'Qualcomm' },
  { symbol: 'TXN.O', nameKo: '텍사스 인스트루먼트', nameEn: 'Texas Instruments' },
  { symbol: 'CSCO.O', nameKo: '시스코 시스템즈', nameEn: 'Cisco' },
  { symbol: 'IBM', nameKo: 'IBM', nameEn: 'IBM' },
  { symbol: 'ORCL', nameKo: '오라클', nameEn: 'Oracle' },
  { symbol: 'ADBE.O', nameKo: '어도비', nameEn: 'Adobe' },
  { symbol: 'CRM', nameKo: '세일즈포스', nameEn: 'Salesforce' },
  { symbol: 'ASML.O', nameKo: 'ASML 홀딩 ADR', nameEn: 'ASML' },
  { symbol: 'TSM', nameKo: 'TSMC', nameEn: 'Taiwan Semiconductor' },
  { symbol: 'SAP', nameKo: 'SAP ADR', nameEn: 'SAP' },

  // 소비재·유통·외식
  { symbol: 'COST.O', nameKo: '코스트코', nameEn: 'Costco' },
  { symbol: 'PEP.O', nameKo: '펩시코', nameEn: 'PepsiCo' },
  { symbol: 'KO', nameKo: '코카콜라', nameEn: 'Coca-Cola' },
  { symbol: 'PG', nameKo: 'P&G(프록터 & 갬블)', nameEn: 'Procter & Gamble' },
  { symbol: 'NKE', nameKo: '나이키', nameEn: 'Nike' },
  { symbol: 'MCD', nameKo: '맥도날드', nameEn: "McDonald's" },
  { symbol: 'SBUX.O', nameKo: '스타벅스', nameEn: 'Starbucks' },
  { symbol: 'HD', nameKo: '홈디포', nameEn: 'Home Depot' },
  { symbol: 'LOW', nameKo: '로우스 컴퍼니', nameEn: "Lowe's" },
  { symbol: 'TGT', nameKo: '타겟', nameEn: 'Target' },

  // 금융
  { symbol: 'JPM', nameKo: 'JP모건체이스', nameEn: 'JPMorgan Chase' },
  { symbol: 'V', nameKo: '비자', nameEn: 'Visa' },
  { symbol: 'MA', nameKo: '마스터카드', nameEn: 'Mastercard' },
  { symbol: 'WFC', nameKo: '웰스파고', nameEn: 'Wells Fargo' },
  { symbol: 'BAC', nameKo: '뱅크오브아메리카', nameEn: 'Bank of America' },
  { symbol: 'C', nameKo: '씨티그룹', nameEn: 'Citigroup' },
  { symbol: 'GS', nameKo: '골드만삭스', nameEn: 'Goldman Sachs' },
  { symbol: 'MS', nameKo: '모간스탠리', nameEn: 'Morgan Stanley' },
  { symbol: 'BLK', nameKo: '블랙록', nameEn: 'BlackRock' },
  { symbol: 'AXP', nameKo: '아메리칸 익스프레스', nameEn: 'American Express' },
  { symbol: 'PYPL.O', nameKo: '페이팔 홀딩스', nameEn: 'PayPal' },
  { symbol: 'XYZ', nameKo: '블록(옛 스퀘어)', nameEn: 'Block' },
  { symbol: 'RY', nameKo: '로열 뱅크 오브 캐나다', nameEn: 'Royal Bank of Canada' },
  { symbol: 'TD', nameKo: '토론토 도미니언 은행', nameEn: 'Toronto-Dominion Bank' },

  // 헬스케어
  { symbol: 'UNH', nameKo: '유나이티드헬스 그룹', nameEn: 'UnitedHealth' },
  { symbol: 'LLY', nameKo: '일라이 릴리', nameEn: 'Eli Lilly' },
  { symbol: 'PFE', nameKo: '화이자', nameEn: 'Pfizer' },
  { symbol: 'JNJ', nameKo: '존슨앤드존슨', nameEn: 'Johnson & Johnson' },
  { symbol: 'MRK', nameKo: '머크 앤 코', nameEn: 'Merck' },
  { symbol: 'NVO', nameKo: '노보 노디스크 ADR', nameEn: 'Novo Nordisk' },

  // 에너지·산업재·항공우주
  { symbol: 'XOM', nameKo: '엑슨모빌', nameEn: 'ExxonMobil' },
  { symbol: 'CVX', nameKo: '셰브론', nameEn: 'Chevron' },
  { symbol: 'BA', nameKo: '보잉', nameEn: 'Boeing' },
  { symbol: 'GE', nameKo: 'GE 에어로스페이스', nameEn: 'GE Aerospace' },
  { symbol: 'CAT', nameKo: '캐터필러', nameEn: 'Caterpillar' },
  { symbol: 'MMM', nameKo: '쓰리엠(3M)', nameEn: '3M' },
  { symbol: 'HON.O', nameKo: '허니웰 인터내셔널', nameEn: 'Honeywell' },
  { symbol: 'UNP', nameKo: '유니온 퍼시픽', nameEn: 'Union Pacific' },
  { symbol: 'LMT', nameKo: '록히드 마틴', nameEn: 'Lockheed Martin' },
  { symbol: 'RTX', nameKo: 'RTX', nameEn: 'RTX' },
  { symbol: 'DE', nameKo: '디어', nameEn: 'Deere' },

  // 통신·미디어
  { symbol: 'T', nameKo: 'AT&T', nameEn: 'AT&T' },
  { symbol: 'VZ', nameKo: '버라이존', nameEn: 'Verizon' },
  { symbol: 'CMCSA.O', nameKo: '컴캐스트', nameEn: 'Comcast' },
  { symbol: 'DIS', nameKo: '월트 디즈니', nameEn: 'Walt Disney' },

  // 자동차
  { symbol: 'F', nameKo: '포드 모터', nameEn: 'Ford' },
  { symbol: 'GM', nameKo: '제너럴 모터스', nameEn: 'General Motors' },
  { symbol: 'RIVN.O', nameKo: '리비안', nameEn: 'Rivian' },
  { symbol: 'LCID.O', nameKo: '루시드 그룹', nameEn: 'Lucid' },
  { symbol: 'NIO', nameKo: '니오 ADR', nameEn: 'NIO' },
  { symbol: 'TM', nameKo: '토요타자동차 ADR', nameEn: 'Toyota' },

  // 인터넷·소프트웨어 신생주
  { symbol: 'ABNB.O', nameKo: '에어비앤비', nameEn: 'Airbnb' },
  { symbol: 'SHOP.O', nameKo: '쇼피파이', nameEn: 'Shopify' },
  { symbol: 'ROKU.O', nameKo: '로쿠', nameEn: 'Roku' },
  { symbol: 'ZM.O', nameKo: '줌 커뮤니케이션스', nameEn: 'Zoom' },
  { symbol: 'DOCU.O', nameKo: '도큐사인', nameEn: 'DocuSign' },
  { symbol: 'JD.O', nameKo: '제이디닷컴 ADR', nameEn: 'JD.com' },
  { symbol: 'PDD.O', nameKo: '핀둬둬 ADR', nameEn: 'PDD Holdings' },

  // 대표 지수 ETF
  { symbol: 'SPY', nameKo: 'SPDR S&P500 ETF', nameEn: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ.O', nameKo: 'Invesco QQQ Trust', nameEn: 'Invesco QQQ' },
  { symbol: 'VOO', nameKo: 'Vanguard S&P500 ETF', nameEn: 'Vanguard 500 Index Fund' },
  { symbol: 'DIA', nameKo: 'SPDR 다우존스 ETF', nameEn: 'SPDR Dow Jones Industrial Average ETF' },
  { symbol: 'IWM', nameKo: 'iShares 러셀2000 ETF', nameEn: 'iShares Russell 2000 ETF' },
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
