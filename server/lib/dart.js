import axios from 'axios'
import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import cache from './cache.js'
import { MOCK_COMPANIES, mockReports, mockFinancials } from './mockData.js'

const BASE = 'https://opendart.fss.or.kr/api'

function hasApiKey() {
  return Boolean(process.env.DART_API_KEY)
}

function apiKey() {
  const key = process.env.DART_API_KEY
  if (!key) throw new Error('DART_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.')
  return key
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

async function loadCorpCodes(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = cache.get('corpCodes')
    if (cached) return cached
  }

  const res = await axios.get(`${BASE}/corpCode.xml`, {
    params: { crtfc_key: apiKey() },
    responseType: 'arraybuffer',
  })

  const zip = new AdmZip(res.data)
  const xml = zip.readAsText('CORPCODE.xml')
  // parseTagValue 기본값(true)은 "00126380"·"005930" 같은 코드의 앞자리 0을 숫자로
  // 변환하며 날려버린다. 기업/종목 코드는 반드시 원문 문자열 그대로 유지해야 한다.
  const parser = new XMLParser({ parseTagValue: false })
  const parsed = parser.parse(xml)
  const rawList = Array.isArray(parsed.result.list) ? parsed.result.list : [parsed.result.list]

  const list = rawList
    .map((c) => ({
      corpCode: String(c.corp_code).trim(),
      corpName: String(c.corp_name).trim(),
      stockCode: c.stock_code ? String(c.stock_code).trim() : '',
    }))
    .filter((c) => c.stockCode) // 상장 기업만 대상으로 함

  cache.set('corpCodes', list, 60 * 60 * 24)
  return list
}

// 서버 기동 시 목록을 미리 데워두고, 이후 매일 강제로 다시 받아와 최신 상태를 유지한다.
export const refreshCorpCodes = () => loadCorpCodes(true)

// 50개로 캡을 걸었더니 "테크"(실제 99개), "바이오"(115개), "홀딩스"(90개) 같은 흔한
// 검색어에서 절반 넘게 조용히 잘려나갔다. 200 정도면 실제 상장기업 검색어들을 넉넉히
// 다 담으면서도, 한 글자짜리 극단적인 검색어가 수천 건을 렌더링하는 것은 막아준다.
const SEARCH_RESULT_LIMIT = 200

export async function searchCompanies(query) {
  const q = query.trim().toLowerCase()

  if (!hasApiKey()) {
    return MOCK_COMPANIES.filter((c) => c.corpName.toLowerCase().includes(q)).map((c) => ({
      ...c,
      mock: true,
    }))
  }

  const list = await loadCorpCodes()
  const matches = list.filter((c) => c.corpName.toLowerCase().includes(q))

  // 검색어와 정확히 일치하거나 그 검색어로 시작하는 회사명을 위로 올려, 결과가 많을 때도
  // 가장 관련 있는 회사부터 보이게 한다.
  const rank = (name) => (name === q ? 0 : name.startsWith(q) ? 1 : 2)
  matches.sort((a, b) => {
    const an = a.corpName.toLowerCase()
    const bn = b.corpName.toLowerCase()
    const diff = rank(an) - rank(bn)
    return diff !== 0 ? diff : an.localeCompare(bn, 'ko')
  })

  return matches.slice(0, SEARCH_RESULT_LIMIT)
}

export async function getReports(corpCode, years = 5) {
  if (!hasApiKey()) {
    const company = MOCK_COMPANIES.find((c) => c.corpCode === corpCode)
    return mockReports(company?.corpName ?? '샘플기업', years)
  }

  const cacheKey = `reports:${corpCode}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const end = new Date()
  const begin = new Date()
  begin.setFullYear(end.getFullYear() - years)

  const { data } = await axios.get(`${BASE}/list.json`, {
    params: {
      crtfc_key: apiKey(),
      corp_code: corpCode,
      bgn_de: formatDate(begin),
      end_de: formatDate(end),
      pblntf_detail_ty: 'A001', // 사업보고서
      page_count: 100,
      sort: 'date',
      sort_mth: 'desc',
    },
  })

  const list = (data.list || []).map((r) => ({
    reportName: r.report_nm,
    receiptNo: r.rcept_no,
    date: r.rcept_dt,
    filerName: r.flr_nm,
    url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`,
  }))

  cache.set(cacheKey, list, 60 * 60 * 6)
  return list
}

// 회사/연도/보고서 개정에 따라 같은 항목이 다른 계정명으로 잡히는 경우가 많고
// (예: 매출액 vs 영업수익, 당기순이익 vs 당기순이익(손실)), 손익계산서를 별도(IS)로
// 내는 회사도 있고 포괄손익계산서(CIS) 하나로 합쳐서 내는 회사도 있어 둘 다 확인한다.
function pickAny(list, names) {
  for (const name of names) {
    const found = list.find((i) => (i.sj_div === 'IS' || i.sj_div === 'CIS') && i.account_nm === name)?.thstrm_amount
    if (found !== undefined) return found
  }
  return undefined
}

async function fetchFinancialStatement(corpCode, year, fsDiv) {
  const { data } = await axios.get(`${BASE}/fnlttSinglAcntAll.json`, {
    params: {
      crtfc_key: apiKey(),
      corp_code: corpCode,
      bsns_year: year,
      reprt_code: '11011', // 사업보고서(연간)
      fs_div: fsDiv,
    },
  })
  if (data.status !== '000' || !Array.isArray(data.list)) return null
  return data.list
}

async function fetchFinancialForYear(corpCode, year) {
  const cacheKey = `financial:${corpCode}:${year}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    // 연결재무제표(CFS)를 우선 시도하고, 자회사가 없어 연결 재무제표가 없는 회사는
    // 개별재무제표(OFS)로 대체 조회한다.
    const list = (await fetchFinancialStatement(corpCode, year, 'CFS')) ?? (await fetchFinancialStatement(corpCode, year, 'OFS'))

    if (!list) {
      const result = { year, available: false }
      cache.set(cacheKey, result, 60 * 60 * 24)
      return result
    }

    const result = {
      year,
      available: true,
      revenue: pickAny(list, ['매출액', '수익(매출액)', '영업수익']),
      operatingProfit: pickAny(list, ['영업이익', '영업이익(손실)']),
      netIncome: pickAny(list, ['당기순이익', '당기순이익(손실)', '분기순이익', '분기순이익(손실)', '반기순이익(손실)']),
    }
    cache.set(cacheKey, result, 60 * 60 * 24)
    return result
  } catch {
    return { year, available: false }
  }
}

export async function getFinancials(corpCode, years = 3) {
  if (!hasApiKey()) {
    return mockFinancials(years)
  }

  const currentYear = new Date().getFullYear()
  // 사업보고서는 전년도 실적을 담고 있으므로 currentYear-1부터 조회
  const targetYears = Array.from({ length: years }, (_, i) => currentYear - 1 - i)

  const results = await Promise.all(targetYears.map((year) => fetchFinancialForYear(corpCode, year)))
  return results.sort((a, b) => b.year - a.year)
}
