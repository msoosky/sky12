function ReportList({ reports }) {
  if (!reports || reports.length === 0) return <p className="status">사업보고서가 없습니다.</p>

  return (
    <ul className="report-list">
      {reports.map((r) => (
        <li key={r.receiptNo}>
          <a href={r.url} target="_blank" rel="noreferrer">
            {r.reportName}
          </a>
          <span className="report-meta">
            {r.filerName} · {r.date}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default ReportList
