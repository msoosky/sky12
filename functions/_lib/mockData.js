// DART_API_KEY가 설정되지 않았을 때 화면 흐름을 확인할 수 있도록 제공하는 샘플 데이터.
// stockCode는 실제 종목코드라서 시세/차트는 이 목록으로도 실데이터가 표시됨.
export const MOCK_COMPANIES = [
  { corpCode: 'MOCK00001', corpName: '삼성전자', stockCode: '005930' },
  { corpCode: 'MOCK00002', corpName: 'SK하이닉스', stockCode: '000660' },
  { corpCode: 'MOCK00003', corpName: 'NAVER', stockCode: '035420' },
  { corpCode: 'MOCK00004', corpName: '카카오', stockCode: '035720' },
  { corpCode: 'MOCK00005', corpName: 'LG에너지솔루션', stockCode: '373220' },
  { corpCode: 'MOCK00006', corpName: '현대차', stockCode: '005380' },
]

export function mockReports(corpName, years = 5) {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: years }, (_, i) => {
    const year = currentYear - 1 - i
    return {
      reportName: `사업보고서 (${year}년, 샘플 데이터)`,
      receiptNo: `MOCK-${year}-${i}`,
      date: `${year}0331`,
      filerName: corpName,
      url: 'https://dart.fss.or.kr',
      mock: true,
    }
  })
}

export function mockFinancials(years = 3) {
  const currentYear = new Date().getFullYear()
  const base = { revenue: 100000000, operatingProfit: 12000000, netIncome: 9000000 }

  return Array.from({ length: years }, (_, i) => {
    const year = currentYear - 1 - i
    const factor = 1 - i * 0.08
    return {
      year,
      available: true,
      revenue: Math.round(base.revenue * factor),
      operatingProfit: Math.round(base.operatingProfit * factor),
      netIncome: Math.round(base.netIncome * factor),
      mock: true,
    }
  })
}
