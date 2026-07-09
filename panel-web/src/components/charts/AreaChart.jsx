import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function AreaChart({ datos, dataKeyX = 'mes', dataKeyY = 'total' }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ReAreaChart data={datos} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4A853" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#D4A853" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DF" />
        <XAxis dataKey={dataKeyX} tick={{ fontSize: 12, fill: '#8A8580' }} />
        <YAxis tick={{ fontSize: 12, fill: '#8A8580' }} allowDecimals={false} />
        <Tooltip />
        <Area type="monotone" dataKey={dataKeyY} stroke="#1B2A4A" fill="url(#colorArea)" strokeWidth={2} />
      </ReAreaChart>
    </ResponsiveContainer>
  )
}

export default AreaChart
