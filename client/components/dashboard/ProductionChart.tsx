import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const productionData = [
  { time: '00:00', planned: 50, actual: 48 },
  { time: '02:00', planned: 100, actual: 95 },
  { time: '04:00', planned: 150, actual: 142 },
  { time: '06:00', planned: 200, actual: 198 },
  { time: '08:00', planned: 250, actual: 245 },
  { time: '10:00', planned: 300, actual: 295 },
  { time: '12:00', planned: 350, actual: 340 },
  { time: '14:00', planned: 400, actual: 385 },
  { time: '16:00', planned: 450, actual: 435 },
  { time: '18:00', planned: 500, actual: 490 },
];

const qualityData = [
  { day: 'Seg', conformes: 95, naoConformes: 5 },
  { day: 'Ter', conformes: 92, naoConformes: 8 },
  { day: 'Qua', conformes: 97, naoConformes: 3 },
  { day: 'Qui', conformes: 94, naoConformes: 6 },
  { day: 'Sex', conformes: 96, naoConformes: 4 },
  { day: 'Sab', conformes: 89, naoConformes: 11 },
];

export function ProductionChart() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Production Trend */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Produção vs Planejado</h3>
          <p className="text-sm text-muted-foreground">Últimas 24 horas</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="planned" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Planejado"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                name="Real"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality Chart */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Índice de Qualidade</h3>
          <p className="text-sm text-muted-foreground">Última semana</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={qualityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Bar 
                dataKey="conformes" 
                stackId="a"
                fill="hsl(var(--success))" 
                name="Conformes (%)"
                radius={[0, 0, 4, 4]}
              />
              <Bar 
                dataKey="naoConformes" 
                stackId="a"
                fill="hsl(var(--destructive))" 
                name="Não Conformes (%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
