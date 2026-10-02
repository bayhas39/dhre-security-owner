import React from 'react'

function Bar({ label, value, max, color }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0">
      <div className="w-full rounded-t" style={{ height: `${Math.max(value > 0 ? 4 : 0, (value / max) * 100)}%`, background: color, transition: 'height .25s' }} title={`${label}: ${value}`} />
      <div className="text-[9px] text-slate-500 truncate w-full text-center">{label}</div>
    </div>
  )
}

export function ProblemsChart({ data }) {
  const max = Math.max(1, ...data.map(d => d.v))
  return (
    <div className="h-full flex items-stretch gap-3 px-2 pt-2 pb-1">
      {data.map(d => <Bar key={d.n} label={d.n} value={d.v} max={max} color="#ef4444" />)}
    </div>
  )
}

function Grouped({ data, series, xKey }) {
  const max = Math.max(1, ...data.flatMap(d => series.map(s => d[s.key] || 0)))
  return (
    <div className="h-full flex items-stretch gap-1.5 px-1 pt-2 pb-1">
      {data.map(d => (
        <div key={d[xKey]} className="flex-1 flex items-end gap-[2px] h-full min-w-0">
          {series.map(s => (
            <div key={s.key} className="flex-1 rounded-t" style={{ height: `${(d[s.key] || 0) > 0 ? Math.max(4, ((d[s.key] || 0) / max) * 100) : 0}%`, background: s.color }} title={`${d[xKey]} — ${s.name}: ${d[s.key] || 0}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DailyChart({ data }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0"><Grouped data={data} xKey="label" series={[{ key: 'sites', name: 'Sites', color: '#8b5cf6' }, { key: 'incidents', name: 'Incidents', color: '#f59e0b' }]} /></div>
      <div className="flex justify-center gap-3 text-[10px] text-slate-500 pb-1"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#8b5cf6]" />Sites</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f59e0b]" />Incidents</span></div>
    </div>
  )
}

export function MonthlyChart({ data }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0"><Grouped data={data} xKey="label" series={[{ key: 'sites', name: 'Sites', color: '#0ea5e9' }, { key: 'accidents', name: 'Accidents', color: '#ef4444' }]} /></div>
      <div className="flex justify-center gap-3 text-[10px] text-slate-500 pb-1"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#0ea5e9]" />Sites</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ef4444]" />Accidents</span></div>
    </div>
  )
}
