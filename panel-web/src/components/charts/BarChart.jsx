import {
  BarChart as ReBarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function BarChart({ datos, dataKeyValor = 'cantidad', dataKeyNombre = 'nombre', altura = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ReBarChart data={datos} layout="vertical" margin={{ top: 8, right: 40, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DF" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#8A8580' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey={dataKeyNombre}
          tick={{ fontSize: 12, fill: '#1B2A4A' }}
          width={130}
        />
        <Tooltip cursor={{ fill: 'rgba(212, 168, 83, 0.15)' }} />
        <Bar
          dataKey={dataKeyValor}
          fill="#D4A853"
          radius={[0, 4, 4, 0]}
          barSize={22}
          minPointSize={1}
        >
          <LabelList
            dataKey={dataKeyValor}
            position="right"
            fill="#1B2A4A"
            fontSize={12}
            fontWeight={600}
          />
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  )
}

export default BarChart
