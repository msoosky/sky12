function formatNumber(value) {
  if (value === undefined || value === null) return '-'
  return Number(value).toLocaleString('ko-KR')
}

function FinancialTable({ data }) {
  if (!data || data.length === 0) return <p className="status">재무 데이터가 없습니다.</p>

  return (
    <table className="financial-table">
      <thead>
        <tr>
          <th>연도</th>
          <th>매출액</th>
          <th>영업이익</th>
          <th>당기순이익</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.year}>
            <td>{row.year}</td>
            {row.available ? (
              <>
                <td>{formatNumber(row.revenue)}</td>
                <td>{formatNumber(row.operatingProfit)}</td>
                <td>{formatNumber(row.netIncome)}</td>
              </>
            ) : (
              <td colSpan={3}>데이터 없음</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default FinancialTable
