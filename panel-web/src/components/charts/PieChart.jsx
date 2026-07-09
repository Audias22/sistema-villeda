import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORES_AREA = {
  notarial: '#3B6D11',
  civil: '#185FA5',
  laboral: '#854F0B',
  penal: '#A32D2D',
}

function colorPara(nombre, index) {
  const clave = (nombre || '').toLowerCase()
  return COLORES_AREA[clave] || ['#D4A853', '#2A3F6E', '#5A6578', '#8A8580'][index % 4]
}

function PieChart({ datos, dataKeyValor = 'total', dataKeyNombre = 'area' }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RePieChart>
        <Pie
          data={datos}
          dataKey={dataKeyValor}
          nameKey={dataKeyNombre}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {datos.map((entrada, index) => (
            <Cell key={entrada[dataKeyNombre]} fill={colorPara(entrada[dataKeyNombre], index)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </RePieChart>
    </ResponsiveContainer>
  )
}

export default PieChart
