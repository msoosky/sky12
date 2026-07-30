import { MOCK_COMPANIES, mockReports, mockFinancials, mockDividends } from './mockData.js'

// Cloudflare Pages Functions에서는 DART(opendart.fss.or.kr)를 직접 호출할 수 없다 —
// DART 서버가 TLS 1.2만 지원하고 ALPN도 협상하지 않는데, Cloudflare Workers의 fetch()가
// 이런 origin과의 연결을 안정적으로 처리하지 못해 매번 "internal error"로 실패한다
// (재시도로도 우회 불가능한, 100% 재현되는 플랫폼 레벨 한계). 그래서 배포 버전은 검색·
// 재무·사업보고서를 샘플 데이터로 보여주고, 실시간 데이터가 꼭 필요하면 로컬(npm run dev,
// Node 서버는 이 제약이 없음)에서 사용하도록 안내한다. 시세·차트는 네이버가 TLS 1.3이라
// 문제없이 실데이터로 동작한다(_lib/naver.js).

export async function searchCompanies(query) {
  const q = query.trim().toLowerCase()
  return MOCK_COMPANIES.filter((c) => c.corpName.toLowerCase().includes(q)).map((c) => ({ ...c, mock: true }))
}

export async function getReports(corpCode, years = 5) {
  const company = MOCK_COMPANIES.find((c) => c.corpCode === corpCode)
  return mockReports(company?.corpName ?? '샘플기업', years)
}

export async function getFinancials(years = 3) {
  return mockFinancials(years)
}

export async function getDividends(years = 5) {
  return mockDividends(years)
}
