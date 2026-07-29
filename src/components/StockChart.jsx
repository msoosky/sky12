import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function StockChart({ data }) {
  if (!data || data.length === 0) return <p className="status">차트 데이터가 없습니다.</p>

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="close" stroke="#1d4ed8" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default StockChart
