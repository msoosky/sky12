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

async function loadCorpCodes() {
  const cached = cache.get('corpCodes')
  if (cached) return cached

  const res = await axios.get(`${BASE}/corpCode.xml`, {
    params: { crtfc_key: apiKey() },
    responseType: 'arraybuffer',
  })

  const zip = new AdmZip(res.data)
  const xml = zip.readAsText('CORPCODE.xml')
  const parser = new XMLParser()
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

export async function searchCompanies(query) {
  const q = query.trim().toLowerCase()

  if (!hasApiKey()) {
    return MOCK_COMPANIES.filter((c) => c.corpName.toLowerCase().includes(q)).map((c) => ({
      ...c,
      mock: true,
    }))
  }

  const list = await loadCorpCodes()
  return list.filter((c) => c.corpName.toLowerCase().includes(q)).slice(0, 20)
}

export async function getReports(corpCode, years = 3) {
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

async function fetchFinancialForYear(corpCode, year) {
  const cacheKey = `financial:${corpCode}:${year}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const { data } = await axios.get(`${BASE}/fnlttSinglAcntAll.json`, {
      params: {
        crtfc_key: apiKey(),
        corp_code: corpCode,
        bsns_year: year,
        reprt_code: '11011', // 사업보고서(연간)
        fs_div: 'CFS', // 연결재무제표
      },
    })

    if (data.status !== '000' || !Array.isArray(data.list)) {
      const result = { year, available: false }
      cache.set(cacheKey, result, 60 * 60 * 24)
      return result
    }

    const pick = (name) =>
      data.list.find((i) => i.sj_div === 'IS' && i.account_nm === name)?.thstrm_amount

    const result = {
      year,
      available: true,
      revenue: pick('매출액') ?? pick('수익(매출액)'),
      operatingProfit: pick('영업이익'),
      netIncome: pick('당기순이익') ?? pick('분기순이익'),
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
